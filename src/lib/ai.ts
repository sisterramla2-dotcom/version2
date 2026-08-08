export interface FoodAnalysis {
  food_name: string
  estimated_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence?: number
  is_drink?: boolean
  serving_unit?: "serving" | "100ml"
  calories_per_100ml?: number
}

function getORKey(): string | undefined {
  const env = (import.meta as any).env
  return env?.VITE_OPENROUTER_API_KEY || env?.VITE_OPENROUTER_KEY || undefined
}

function getGeminiKey() {
  const env = (import.meta as any).env
  return env?.VITE_GEMINI_API_KEY || env?.VITE_GOOGLE_API_KEY || ""
}

function getReferer() {
  try {
    const origin = window.location.origin
    if (origin && origin !== 'null' && !origin.startsWith('file:') && !origin.startsWith('capacitor:')) {
      return origin
    }
  } catch {}
  return "https://platepal.app"
}

async function imageToCompressedDataUrl(file: File, maxSize = 768, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
          const canvas = document.createElement("canvas")
          canvas.width = Math.max(1, Math.round(img.width * scale))
          canvas.height = Math.max(1, Math.round(img.height * scale))
          const ctx = canvas.getContext("2d")
          if (!ctx) { resolve(dataUrl); return }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL("image/jpeg", quality))
        } catch {
          resolve(dataUrl)
        }
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    }
    reader.onerror = () => resolve("data:image/jpeg;base64,")
    reader.readAsDataURL(file)
  })
}

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => window.clearTimeout(id) }
}

export async function analyzeFoodImage(file: File): Promise<FoodAnalysis> {
  const base64 = await imageToCompressedDataUrl(file)
  const key = getORKey()
  if (!key) {
    throw new Error("PlatePal isn't configured with an OpenRouter API key. Set VITE_OPENROUTER_API_KEY in your .env file and rebuild the app.")
  }

  const systemPrompt = `You are PlatePal's expert nutrition vision analyst. Identify the actual visible food or drink in the image and estimate nutrition accurately.

Rules:
- Look at the image carefully. Do not return "Oatmeal Bowl" unless oats/oatmeal is clearly visible.
- Use a specific dish name, not a generic placeholder.
- Include oils, sauces, rice/bread, cheese, dressing, fried coating, gravies, toppings, and sides if visible.
- estimated_calories is total calories for the pictured serving, not per 100g.
- DRINK RULE: If the image is a beverage/drink, set is_drink=true, serving_unit="100ml", estimated_calories must be calories per 100ml, and macros are per 100ml. For normal sugary Pepsi/cola use about 42 kcal/100ml and 11g carbs/100ml unless the label clearly says Diet, Zero, Max, No Sugar, or Sugar Free. Only zero-calorie drinks should be 0 kcal.
- PACKAGED DRINK RULE: If the image shows a branded bottle/can/carton, infer whether it is regular or zero/diet from visible words and packaging. Do not mark regular Pepsi/Coca-Cola/juice/energy drinks as 0.
- If the image is not food or drink, return food_name "Not food" and numeric values 0.
- Return ONLY valid JSON, no markdown.

JSON schema:
{"food_name":"specific dish/drink name","estimated_calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":number,"is_drink":boolean,"serving_unit":"serving or 100ml","calories_per_100ml":number}`

  const userPrompt = `Analyze this exact photo for calorie tracking. Identify the real visible food or drink. If drink, return calories/macros per 100ml. If solid food, return total calories/macros for the visible serving. JSON only.`

  const parseFood = (content: string): FoodAnalysis => {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON in response")
    const parsed = JSON.parse(jsonMatch[0])
    const foodName = String(parsed.food_name || "").trim()
    const calories = Number(parsed.estimated_calories)
    if (!foodName || !Number.isFinite(calories)) throw new Error("Invalid food result")
    const isDrink = Boolean(parsed.is_drink) || /pepsi|coke|cola|soda|juice|milkshake|smoothie|coffee|tea|drink|beverage|water|sprite|fanta|energy/i.test(foodName)
    let finalCalories = Math.max(0, Math.round(calories))
    const lower = foodName.toLowerCase()
    const isZeroDrink = /zero|diet|max|sugar free|no sugar|light|water/.test(lower)
    if (isDrink && /pepsi|coke|cola|soda/.test(lower) && !isZeroDrink && finalCalories === 0) finalCalories = 42
    return {
      food_name: foodName,
      estimated_calories: finalCalories,
      protein_g: Math.max(0, Math.round(Number(parsed.protein_g) || 0)),
      carbs_g: isDrink && /pepsi|coke|cola|soda/.test(lower) && !isZeroDrink && Math.round(Number(parsed.carbs_g) || 0) === 0 ? 11 : Math.max(0, Math.round(Number(parsed.carbs_g) || 0)),
      fat_g: Math.max(0, Math.round(Number(parsed.fat_g) || 0)),
      confidence: (() => {
        const raw = Number(parsed.confidence)
        if (!Number.isFinite(raw) || raw <= 0) return 92
        // Some models return confidence as a 0-1 fraction (e.g. 0.87) instead
        // of a 0-100 percentage. Detect that case and rescale so it doesn't
        // round down to 1% every time.
        const pct = raw <= 1 ? raw * 100 : raw
        return Math.max(1, Math.min(99, Math.round(pct)))
      })(),
      is_drink: isDrink,
      serving_unit: isDrink ? "100ml" : "serving",
      calories_per_100ml: isDrink ? finalCalories : undefined
    }
  }

  const models = [
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash-lite"
  ]
  let lastError: unknown = null

  for (const model of models) {
    try {
    const requestTimeout = timeoutSignal(11000)
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: requestTimeout.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": getReferer(),
        "X-Title": "PlatePal"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: base64 } }
            ]
          }
        ],
        max_tokens: 220,
        temperature: 0.05
      })
    })
    requestTimeout.clear()

    if (!resp.ok) {
      const err = await resp.text()
      console.warn("OpenRouter error", err)
      throw new Error(err)
    }

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content || ""
    return parseFood(content)
    } catch (e) {
      lastError = e
      console.warn(`Vision model failed: ${model}`, e)
    }
  }

  throw new Error(`Food recognition failed. Please retake the photo in good light. ${String(lastError || '')}`)
}

export async function generateNutritionTip(consumed: number, goal: number, remaining: number, recent: string[] = []): Promise<string> {
  const prompt = `The user has consumed ${consumed} calories out of ${goal} calories. They have ${remaining} calories left. Recent foods: ${recent.join(", ") || "none"}. Generate a short, encouraging tip (max 18 words) for their next meal. Be friendly, suggest specific food. No markdown, no emojis beyond 1.`

  const geminiKey = getGeminiKey()
  const orKey = getORKey()

  // Try Gemini direct
  if (geminiKey) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.8 }
        })
      })
      if (resp.ok) {
        const data = await resp.json()
        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (txt) return txt.trim()
      }
    } catch { /* ignore */ }
  }

  // Try via OpenRouter
  if (orKey) {
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${orKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 120,
        temperature: 0.85
      })
    })
    if (resp.ok) {
      const data = await resp.json()
      const txt = data?.choices?.[0]?.message?.content
      if (txt) return txt.trim()
    }
  } catch { /* ignore */ }
  }

  await new Promise(r => setTimeout(r, 400))
  if (remaining > 1000) return `You have ${remaining} calories left! A light salad with grilled chicken is perfect for dinner.`
  if (remaining > 600) return `Nice pacing! ${remaining} cal left — try a salmon bowl with veggies.`
  if (remaining > 200) return `Almost done — ${remaining} cal left, Greek yogurt with berries will fit great.`
  if (remaining > 0) return `Just ${remaining} cal left, finish with herbal tea and almonds!`
  return `Goal reached! Amazing work today, stay hydrated and rest well.`
}

export async function generateCoachReply(message: string, context: {consumed:number; goal:number; remaining:number; water:number; recent:string[]}): Promise<string> {
  const prompt = `You are PlatePal Coach, a friendly nutrition assistant. User asks: "${message}". Context: consumed ${context.consumed}/${context.goal} kcal, remaining ${context.remaining}, water ${context.water}/8 glasses, recent foods: ${context.recent.join(', ') || 'none'}.
Return a clean, ordered response in this exact style, no markdown tables:
Today Plan:
Breakfast: ...
Lunch: ...
Dinner: ...
Snack: ...
Tip: ...
Keep it concise, personalized, practical, safe, and include approximate calories/macros when useful.`
  const orKey = getORKey()
  if (orKey) {
  try {
    const t = timeoutSignal(14000)
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: t.signal,
      headers: {"Content-Type":"application/json", "Authorization":`Bearer ${orKey}`, "HTTP-Referer": getReferer(), "X-Title":"PlatePal"},
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{role:"user", content: prompt}], max_tokens: 220, temperature: 0.75 })
    })
    t.clear()
    if(resp.ok){
      const data = await resp.json()
      const txt = data?.choices?.[0]?.message?.content
      if(txt) return formatCoachReply(txt)
    }
  } catch {}
  }
  return formatCoachReply("Today Plan:\nBreakfast: Greek yogurt with berries, around 300 kcal.\nLunch: Grilled chicken salad with rice, around 450 kcal.\nDinner: Lean protein with vegetables, around 500 kcal.\nSnack: Fruit or eggs based on remaining calories.\nTip: Keep protein high and hydrate steadily.")
}

function formatCoachReply(raw: string): string {
  let text = raw
    .replace(/\*\*/g, "")
    .replace(/^[\s•\-*]+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  const required = ["Today Plan:", "Breakfast:", "Lunch:", "Dinner:", "Snack:", "Tip:"]
  const hasStructure = required.slice(1).every(h => text.toLowerCase().includes(h.toLowerCase()))
  if (!hasStructure) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
    return [
      "Today Plan:",
      `Breakfast: ${sentences[0] || "Choose a protein-rich option like eggs or Greek yogurt."}`,
      `Lunch: ${sentences[1] || "Build a balanced plate with lean protein, vegetables, and slow carbs."}`,
      `Dinner: ${sentences[2] || "Keep it satisfying with protein and vegetables within your calories."}`,
      "Snack: Pick fruit, yogurt, or boiled eggs depending on remaining calories.",
      "Tip: Keep portions steady and drink water through the day."
    ].join("\n")
  }
  return text
}