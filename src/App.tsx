import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Flame, Camera, Search, Apple, BarChart3, User, Plus, 
  ChevronLeft, ChevronRight, Activity, Crown, Droplets, 
  Footprints, Utensils, Heart, X, Zap, Target, Scale, Ruler, Sparkles, Check,
  Minus, ImageIcon, Trash2, ScanLine, Beef, Timer,
  Lightbulb, Bell, Shield, HelpCircle, Info, Settings2,
  BookOpen, GlassWater, FileQuestion, Wheat, Leaf, Clock3, Soup, Dumbbell, Send
} from 'lucide-react'
import { motion, useMotionValue, useMotionValueEvent, animate } from 'framer-motion'
import { analyzeFoodImage, generateNutritionTip, generateCoachReply, type FoodAnalysis } from './lib/ai'
import platePalLogo from './assets/platepal_logo.png'
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

// Types
type Gender = 'Female' | 'Male' | null
type Goal = 'Lose Weight' | 'Maintain Weight' | 'Gain Weight'
type ActivityLevel = 'Sedentary' | 'Lightly active' | 'Moderately active' | 'Very active'
type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner'

interface Profile {
  gender: Gender
  age: number
  height: number
  weight: number
  targetWeight: number
  goal: Goal
  activity: ActivityLevel
  dailyCalories: number
}
interface DiaryEntry {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  meal: MealType
  time: string
  date?: string
  image?: string
}
interface FoodItem {
  name: string
  calories: number
  serving: string
  protein: number
  carbs: number
  fat: number
  icon: string
  category: 'All'|'My Foods'|'Meals'|'Brands'
  brand?: string
  ingredients?: string
}

type AchievementId = 'first_scan' | 'first_log' | 'water_complete' | 'seven_day' | 'three_meals' | 'five_logs' | 'ten_logs' | 'protein_hit' | 'calorie_goal' | 'early_breakfast' | 'night_logger' | 'recipe_added' | 'portion_master' | 'ai_chat' | 'profile_complete' | 'weight_goal_set' | 'scan_gallery' | 'balanced_day' | 'progress_check' | 'food_search' | 'water_opened' | 'exercise_logged' | 'recipe_saved' | 'target_date_viewed' | 'home_tip_seen'
interface AchievementDef { id: AchievementId; title: string; description: string; icon: string; color: string }
interface ExerciseEntry {
  id: string
  name: string
  minutes: number
  calories: number
  time: string
  date?: string
  icon: string
}
interface ChatMsg { id:string; role:'user'|'coach'; text:string; time:string; date:string }

type ScreenId =
 | 'onboarding'
 | 'paywall'
 | 'setup'
 | 'home'
 | 'foodScanner'
 | 'scanResult'
 | 'portion'
 | 'dailyDiary'
 | 'foodSearch'
 | 'barcodeScanner'
 | 'foodDetails'
 | 'progressWeight'
 | 'progressNutrition'
 | 'recipes'
 | 'recipeDetail'
 | 'waterTracker'
 | 'aiCoach'
 | 'achievements'
 | 'profile'
 | 'settings'
 | 'exerciseList'
 | 'exerciseTimer'
 | 'emptyState'
 | 'errorState'

const FOOD_LIBRARY: FoodItem[] = [
  {name:'Banana', calories:105, serving:'medium', protein:1, carbs:27, fat:0, icon:'🍌', category:'All', ingredients:'Banana'},
  {name:'Egg', calories:70, serving:'large', protein:6, carbs:1, fat:5, icon:'🥚', category:'All', ingredients:'Egg'},
  {name:'Chicken Breast', calories:185, serving:'100g', protein:31, carbs:0, fat:4, icon:'🍗', category:'All', ingredients:'Chicken breast'},
  {name:'Brown Rice', calories:111, serving:'100g', protein:3, carbs:23, fat:1, icon:'🍚', category:'All', ingredients:'Brown rice'},
  {name:'Oats', calories:389, serving:'100g', protein:17, carbs:66, fat:7, icon:'🥣', category:'All', ingredients:'Rolled oats'},
  {name:'Almonds', calories:579, serving:'100g', protein:21, carbs:22, fat:50, icon:'🥜', category:'All', ingredients:'Almonds'},
  {name:'Apple', calories:95, serving:'medium', protein:0, carbs:25, fat:0, icon:'🍎', category:'All', ingredients:'Apple'},
  {name:'Greek Yogurt', calories:120, serving:'170g', protein:17, carbs:6, fat:3, icon:'🥛', category:'My Foods', ingredients:'Milk cultures'},
  {name:'Avocado Toast', calories:310, serving:'1 toast', protein:8, carbs:32, fat:18, icon:'🥑', category:'Meals', ingredients:'Bread, avocado, egg optional'},
  {name:'Grilled Chicken Salad', calories:320, serving:'1 bowl', protein:28, carbs:12, fat:18, icon:'🥗', category:'Meals', ingredients:'Chicken, lettuce, cucumber, tomato, dressing'},
  {name:'Chicken Biryani', calories:560, serving:'1 plate', protein:26, carbs:68, fat:18, icon:'🍛', category:'Meals', ingredients:'Rice, chicken, spices, oil'},
  {name:'Protein Shake', calories:220, serving:'1 bottle', protein:25, carbs:12, fat:6, icon:'🥤', category:'Brands', brand:'FitFuel', ingredients:'Whey protein, milk'},
  {name:'Nestle Yogurt', calories:120, serving:'100g', protein:8, carbs:12, fat:4, icon:'🥛', category:'Brands', brand:'Nestle', ingredients:'Milk, Sugar, Milk Solids, Cultures'},
  {name:'Peanut Butter Sandwich', calories:360, serving:'1 sandwich', protein:14, carbs:38, fat:18, icon:'🥪', category:'Meals', ingredients:'Bread, peanut butter'},
  {name:'Tuna Sandwich', calories:290, serving:'1 sandwich', protein:24, carbs:30, fat:8, icon:'🥪', category:'Meals', ingredients:'Tuna, bread, lettuce'},
  {name:'Orange Juice', calories:110, serving:'250ml', protein:2, carbs:26, fat:0, icon:'🧃', category:'Brands', brand:'Fresh'},
  {name:'Paneer Curry', calories:430, serving:'1 bowl', protein:20, carbs:18, fat:31, icon:'🍲', category:'Meals', ingredients:'Paneer, tomato gravy, spices'},
  {name:'Chapati', calories:120, serving:'1 piece', protein:4, carbs:22, fat:3, icon:'🫓', category:'All', ingredients:'Whole wheat flour'},
]

function cmToFt(cm:number){
  const totalInch = cm / 2.54
  const ft = Math.floor(totalInch / 12)
  const inch = Math.round(totalInch % 12)
  return `${ft}'${inch}"`
}
function dateKey(d = new Date()) { return d.toISOString().slice(0,10) }
function calcBMI(w:number,h:number){ return +(w / ((h/100)*(h/100))).toFixed(1) }
function bmiStatus(bmi:number){
  if (bmi < 18.5) return {label:'Underweight', note:'A BMI below 18.5 can indicate you may need more energy and nutrients.'}
  if (bmi < 25) return {label:'Normal', note:'A BMI between 18.5 and 24.9 is generally considered a healthy range.'}
  if (bmi < 30) return {label:'Overweight', note:'A BMI between 25 and 29.9 may increase health risks for some people.'}
  return {label:'Obese', note:'A BMI of 30+ may increase health risks. Consider professional advice.'}
}
function calcBMR(p: Partial<Profile>): number {
  if (!p.weight || !p.height || !p.age) return 0
  const w = p.weight, h = p.height, a = p.age || 17
  return Math.round(p.gender === 'Male' ? 10*w + 6.25*h -5*a+5 : 10*w + 6.25*h -5*a -161)
}
function calcTDEE(p: Partial<Profile>): number {
  const bmr = calcBMR(p)
  const factors: Record<string,number> = { 'Sedentary':1.2, 'Lightly active':1.375, 'Moderately active':1.55, 'Very active':1.725 }
  return Math.round(bmr * (factors[p.activity||'Lightly active']||1.375))
}
function calcDailyCalories(p: Partial<Profile>): number {
  let tdee = calcTDEE(p)
  if(!tdee) return 1650
  if(p.targetWeight && p.weight && p.targetWeight < p.weight) tdee-=500
  else if(p.targetWeight && p.weight && p.targetWeight > p.weight) tdee+=300
  else if(p.goal==='Lose Weight') tdee-=500
  else if(p.goal==='Gain Weight') tdee+=300
  return Math.round(Math.max(1200,tdee)/10)*10
}
function targetCaloriesForGoal(p: Partial<Profile>){ return calcDailyCalories(p) }
function weightTimeline(p: Profile){
  const maintenance = calcTDEE(p)
  const current = Number(p.weight)
  const target = Number(p.targetWeight)
  const diff = +(current - target).toFixed(1)
  const today = new Date()
  if(Math.abs(diff) < 0.1){
    return {
      mode:'maintain',
      kg:0,
      weeklyRate:0,
      weeks:0,
      days:0,
      date: today,
      dateText:'You are already at your target',
      targetCalories: maintenance,
      dailyGap:0,
      message:'Keep eating around your maintenance calories to hold this weight.'
    }
  }
  if(diff > 0){
    const kg = diff
    const weeklyRate = 0.5
    const days = Math.max(1, Math.ceil((kg / weeklyRate) * 7))
    const weeks = +(days / 7).toFixed(1)
    const date = new Date(today)
    date.setDate(today.getDate() + days)
    return {
      mode:'loss', kg, weeklyRate, weeks, days, date,
      dateText: date.toLocaleDateString(undefined,{month:'long', day:'numeric', year:'numeric'}),
      targetCalories: Math.max(1200, Math.round((maintenance - 500)/10)*10),
      dailyGap:500,
      message:`A 500 kcal daily deficit targets about 0.5 kg weight loss per week.`
    }
  }
  const kg = Math.abs(diff)
  const weeklyRate = 0.25
  const days = Math.max(1, Math.ceil((kg / weeklyRate) * 7))
  const weeks = +(days / 7).toFixed(1)
  const date = new Date(today)
  date.setDate(today.getDate() + days)
  return {
    mode:'gain', kg, weeklyRate, weeks, days, date,
    dateText: date.toLocaleDateString(undefined,{month:'long', day:'numeric', year:'numeric'}),
    targetCalories: Math.round((maintenance + 300)/10)*10,
    dailyGap:300,
    message:`A modest surplus supports gradual weight gain of about 0.25 kg per week.`
  }
}

const HOME_TIPS = [
  'Pair every meal with a protein source to stay full longer.', 'Drink one glass of water before your next meal.', 'Add vegetables first, then build the rest of your plate.', 'A 10-minute walk after lunch can support digestion.', 'Choose grilled, baked, or steamed foods when possible.', 'Keep snacks visible only if they match your goal.', 'Fruit plus yogurt makes a filling sweet snack.', 'Slow eating helps your fullness signals catch up.', 'Try to include fiber in your next meal.', 'If you are craving sweets, add protein first.',
  'Plan dinner early so calories feel easier to manage.', 'Keep your next meal colorful with two vegetables.', 'A balanced plate is protein, carbs, fats, and fiber.', 'Choose water or unsweetened drinks to save calories.', 'Use smaller plates when portions feel hard to judge.', 'Protein at breakfast can reduce evening cravings.', 'A handful of nuts is dense, so portion it first.', 'Soup or salad before dinner can help fullness.', 'Do not skip meals if it leads to overeating later.', 'Add lemon, herbs, or spices instead of heavy sauces.',
  'If calories are low, choose lean protein and veggies.', 'If calories are high, keep the next snack light.', 'Sleep helps hunger hormones stay balanced.', 'Keep a backup healthy snack ready.', 'Pick whole grains when you want longer energy.', 'Your consistency matters more than perfection.', 'One high-calorie meal does not ruin your progress.', 'Hydration can reduce false hunger signals.', 'Log meals soon after eating for better accuracy.', 'Check portions of oils, nuts, and sauces carefully.',
  'Aim for protein in every main meal.', 'Vegetables add volume with fewer calories.', 'Greek yogurt can be a high-protein dessert.', 'Eggs are an easy protein option.', 'Beans add fiber and plant protein.', 'Chicken, fish, tofu, or paneer can anchor dinner.', 'Try fruit when you want something sweet.', 'Keep dinner lighter if lunch was heavy.', 'Choose roasted potatoes over fries when possible.', 'Use calorie-dense toppings intentionally.',
  'Walking is a simple way to increase your calorie budget.', 'Meal prep one protein for tomorrow.', 'Keep your goal visible before snacking.', 'Eat without scrolling to notice fullness.', 'Choose crunchy vegetables for volume.', 'Sparkling water can help replace soda.', 'Add cinnamon or fruit instead of extra sugar.', 'Your next choice can always move you forward.', 'Try half portions of calorie-dense foods.', 'Eat slowly for the first five minutes.',
  'Prioritize water after salty meals.', 'A high-protein snack can prevent late hunger.', 'Keep sauces on the side for easier tracking.', 'Add salad to pizza or pasta meals.', 'Measure rice or pasta once to learn portions.', 'Use your remaining calories as a guide, not pressure.', 'Choose simple meals when tracking feels tiring.', 'Protein smoothies can help if appetite is low.', 'Vegetable omelets are filling and quick.', 'Try grilled chicken salad if calories are high.',
  'Have a planned snack instead of grazing.', 'Keep your water bottle nearby.', 'Fiber and protein together are powerful for fullness.', 'Choose lean meat if fat calories are nearly used.', 'Choose fruit if carbs are low and energy feels low.', 'Choose eggs or yogurt if protein is low.', 'A short walk can reset cravings.', 'Start tomorrow with a high-protein breakfast.', 'Eat mindfully and stop at comfortable fullness.', 'Progress is built one logged meal at a time.',
  'Try cucumber, carrots, or apple for crunch.', 'If hungry late, choose protein and fluids.', 'Use spices to make healthy meals exciting.', 'Frozen vegetables are quick and nutritious.', 'Batch cook rice or protein to reduce decisions.', 'Do not drink your calories unless planned.', 'Choose unsweetened tea or coffee today.', 'Add healthy fats, but measure them.', 'Balance social meals with lighter meals around them.', 'Keep a consistent meal rhythm.',
  'Eat the protein part of your meal first.', 'A good meal should satisfy, not punish.', 'Review your diary before dinner.', 'Pick one improvement for the next meal.', 'Hydrate after waking and before bed.', 'Aim for 80% consistency this week.', 'Choose homemade when you want control.', 'Restaurant portions can often be split.', 'Use leftovers as planned meals.', 'Celebrate accurate logging, not only low calories.',
  'Choose a colorful plate today.', 'Keep one nutritious snack in your bag.', 'Add lentils or beans for fiber.', 'Try fish for protein and healthy fats.', 'If energy is low, check carbs and hydration.', 'Do not fear carbs; portion them smartly.', 'Stay kind to yourself while tracking.', 'Keep meals simple when busy.', 'Make the next meal your best choice.', 'You are building awareness, and awareness creates results.'
]

const ACHIEVEMENTS: AchievementDef[] = [
  { id:'first_scan', title:'First Food Scanned', description:'You scanned your first meal with PlatePal AI.', icon:'📸', color:'#C6ED6A' },
  { id:'first_log', title:'First Meal Logged', description:'Your first food entry is in the diary.', icon:'🍽️', color:'#FFDE7A' },
  { id:'water_complete', title:'Hydration Hero', description:'You completed your daily water intake goal.', icon:'💧', color:'#7CC4FF' },
  { id:'seven_day', title:'7-Day Consistency', description:'You logged meals for 7 days in a row.', icon:'🔥', color:'#FF9A3D' },
  { id:'three_meals', title:'Three Meal Day', description:'You logged breakfast, lunch and dinner today.', icon:'🍱', color:'#EAF6C9' },
  { id:'five_logs', title:'Food Explorer', description:'You logged 5 meals in PlatePal.', icon:'🧭', color:'#FFE6C8' },
  { id:'ten_logs', title:'Nutrition Tracker', description:'You logged 10 foods and built momentum.', icon:'📈', color:'#DCEBFF' },
  { id:'protein_hit', title:'Protein Pro', description:'You reached your daily protein target.', icon:'💪', color:'#FFD7E8' },
  { id:'calorie_goal', title:'Goal Zone', description:'You stayed within your target calorie range.', icon:'🎯', color:'#C6ED6A' },
  { id:'early_breakfast', title:'Early Bird', description:'You logged breakfast before 10 AM.', icon:'🌅', color:'#FFE7A8' },
  { id:'night_logger', title:'Night Owl Logger', description:'You logged a meal after 8 PM.', icon:'🌙', color:'#D8D3FF' },
  { id:'recipe_added', title:'Recipe Tryout', description:'You added a healthy recipe to your diary.', icon:'📖', color:'#B8F3D0' },
  { id:'portion_master', title:'Portion Master', description:'You adjusted a scanned meal portion.', icon:'⚖️', color:'#FCE7C8' },
  { id:'ai_chat', title:'Coach Chatter', description:'You asked PlatePal Coach for advice.', icon:'💬', color:'#EFE3FF' },
  { id:'profile_complete', title:'Profile Ready', description:'You completed your calorie profile.', icon:'✅', color:'#DDF8C0' },
  { id:'weight_goal_set', title:'Target Setter', description:'You set a weight goal and timeline.', icon:'🏁', color:'#FFD2B8' },
  { id:'scan_gallery', title:'Gallery Scanner', description:'You uploaded a meal photo from your gallery.', icon:'🖼️', color:'#E6F1FF' },
  { id:'balanced_day', title:'Balanced Plate', description:'You logged protein, carbs and fat today.', icon:'🥗', color:'#D7F7D7' },
  { id:'food_search', title:'Food Finder', description:'You added a food from search.', icon:'🔎', color:'#E6F1FF' },
  { id:'exercise_logged', title:'Move Logged', description:'You recorded an exercise session.', icon:'👟', color:'#FFE7A8' },
  { id:'recipe_saved', title:'Recipe Saved', description:'You saved or used a healthy recipe.', icon:'🧑‍🍳', color:'#B8F3D0' },
]
function todayKey(d = new Date()){
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
function hasSevenDayStreak(dates:string[]){
  const set = new Set(dates)
  const d = new Date()
  for(let i=0;i<7;i++){
    const key = d.toISOString().slice(0,10)
    if(!set.has(key)) return false
    d.setDate(d.getDate()-1)
  }
  return true
}
function showAchievementToast(def: AchievementDef){
  notify(`${def.icon} ${def.title} unlocked`, 'success')
}
function shortDate(d: Date){ return d.toLocaleDateString(undefined,{month:'short', day:'numeric'}) }
function addDays(d: Date, days: number){ const x = new Date(d); x.setDate(x.getDate()+days); return x }

type Recipe = {name:string; category:'High-Protein'|'Low Calorie'|'Quick'|'Veg'|'Balanced'; kcal:number; min:number; protein:number; carbs:number; fat:number; image:string; ingredients:string[]; steps:string[]}
const RECIPE_DATA: Recipe[] = [
  ['Chicken Quinoa Bowl','High-Protein',520,25,42,48,16,'chicken quinoa bowl'],['Turkey Lettuce Wraps','High-Protein',340,15,33,18,14,'turkey lettuce wraps'],['Tuna Rice Bowl','High-Protein',430,12,35,45,9,'tuna rice bowl'],['Egg White Omelette','High-Protein',260,10,28,8,9,'egg omelette'],['Greek Yogurt Parfait','High-Protein',310,5,24,38,7,'greek yogurt parfait'],['Salmon Power Plate','High-Protein',560,22,40,30,28,'salmon plate'],['Paneer Tikka Bowl','High-Protein',480,28,31,24,26,'paneer tikka'],['Chicken Lentil Soup','High-Protein',390,30,36,32,9,'chicken lentil soup'],
  ['Cucumber Chickpea Salad','Low Calorie',220,10,9,30,7,'cucumber chickpea salad'],['Zucchini Noodles','Low Calorie',180,15,7,18,8,'zucchini noodles'],['Tomato Basil Soup','Low Calorie',160,20,5,24,4,'tomato basil soup'],['Cauliflower Fried Rice','Low Calorie',240,18,12,22,10,'cauliflower fried rice'],['Shrimp Lettuce Cups','Low Calorie',210,12,25,8,6,'shrimp lettuce cups'],['Berry Cottage Bowl','Low Calorie',190,4,18,20,3,'cottage cheese berries'],['Miso Veggie Soup','Low Calorie',150,15,8,16,4,'miso vegetable soup'],['Grilled Fish Salad','Low Calorie',280,20,30,10,11,'grilled fish salad'],
  ['Avocado Egg Toast','Quick',360,8,16,32,20,'avocado egg toast'],['Banana Oat Smoothie','Quick',330,5,14,55,8,'banana oat smoothie'],['Peanut Butter Apple','Quick',240,3,7,28,12,'peanut butter apple'],['Hummus Veggie Pita','Quick',390,10,14,52,14,'hummus veggie pita'],['Chicken Caesar Wrap','Quick',450,12,32,38,18,'chicken caesar wrap'],['Tuna Cucumber Boats','Quick',250,8,27,8,10,'tuna cucumber'],['Egg Rice Bowl','Quick',410,12,18,52,14,'egg rice bowl'],['Protein Overnight Oats','Quick',380,5,25,46,9,'overnight oats'],
  ['Tofu Buddha Bowl','Veg',470,25,22,58,16,'tofu buddha bowl'],['Chickpea Curry','Veg',430,30,18,60,11,'chickpea curry'],['Veggie Stir Fry','Veg',310,18,12,42,8,'vegetable stir fry'],['Lentil Salad','Veg',350,20,19,48,8,'lentil salad'],['Spinach Paneer Wrap','Veg',420,18,22,38,18,'spinach paneer wrap'],['Mushroom Barley Bowl','Veg',360,30,14,56,6,'mushroom barley bowl'],['Black Bean Tacos','Veg',390,20,17,54,10,'black bean tacos'],['Caprese Grain Bowl','Veg',410,15,18,44,18,'caprese grain bowl'],
  ['Grilled Chicken Salad','Balanced',320,20,28,12,18,'grilled chicken salad'],['Oats Pancakes','Balanced',280,15,12,42,8,'oats pancakes'],['Salmon Poke Bowl','Balanced',540,25,34,55,20,'salmon poke bowl'],['Mediterranean Plate','Balanced',460,18,20,48,20,'mediterranean plate'],['Beef Veggie Bowl','Balanced',510,25,36,40,22,'beef veggie bowl'],['Soba Noodle Salad','Balanced',430,18,18,58,12,'soba noodle salad'],['Chicken Burrito Bowl','Balanced',580,20,38,62,18,'chicken burrito bowl'],['Eggplant Rice Plate','Balanced',400,25,12,52,14,'eggplant rice plate']
].map(([name,category,kcal,min,protein,carbs,fat,query], idx)=>({
  name:name as string,
  category:category as Recipe['category'],
  kcal:kcal as number,
  min:min as number,
  protein:protein as number,
  carbs:carbs as number,
  fat:fat as number,
  // Local bundled images so recipe photos always load (no flaky hotlinked sources).
  image: (category === 'Quick' || category === 'Veg' || idx % 2 === 1) ? '/recipe-pancakes.jpg' : '/recipe-salad.jpg',
  ingredients: recipeIngredients(name as string),
  steps: recipeSteps(name as string)
}))
function recipeIngredients(name:string){
  const n=name.toLowerCase()
  if(n.includes('chicken quinoa')) return ['Chicken breast','Cooked quinoa','Cucumber','Cherry tomatoes','Greek yogurt dressing']
  if(n.includes('turkey')) return ['Lean turkey mince','Lettuce leaves','Bell pepper','Avocado','Lime salsa']
  if(n.includes('tuna')) return ['Tuna','Cooked rice','Cucumber','Corn','Light mayo or yogurt']
  if(n.includes('egg white')) return ['Egg whites','Spinach','Mushrooms','Onion','Black pepper']
  if(n.includes('yogurt')) return ['Greek yogurt','Berries','Granola','Honey','Chia seeds']
  if(n.includes('salmon')) return ['Salmon fillet','Rice or greens','Edamame','Cucumber','Soy-lime sauce']
  if(n.includes('paneer')) return ['Paneer cubes','Yogurt marinade','Bell peppers','Onion','Tikka spices']
  if(n.includes('lentil')) return ['Lentils','Chicken or vegetables','Carrot','Celery','Stock and spices']
  if(n.includes('chickpea')) return ['Chickpeas','Tomato sauce','Onion','Garlic','Curry spices']
  if(n.includes('tofu')) return ['Tofu','Brown rice','Broccoli','Carrot','Sesame sauce']
  if(n.includes('avocado')) return ['Whole grain toast','Avocado','Egg','Lemon','Chili flakes']
  if(n.includes('banana')) return ['Banana','Oats','Milk','Protein powder','Cinnamon']
  if(n.includes('pancake')) return ['Oats','Egg','Banana','Milk','Berries']
  if(n.includes('salad')) return ['Leafy greens','Main protein','Cucumber','Tomatoes','Light dressing']
  if(n.includes('soup')) return ['Vegetables','Stock','Protein or beans','Herbs','Olive oil']
  if(n.includes('wrap')||n.includes('pita')) return ['Whole wheat wrap','Main filling','Lettuce','Tomato','Yogurt sauce']
  if(n.includes('taco')) return ['Corn tortillas','Black beans','Lettuce','Salsa','Avocado']
  if(n.includes('rice')||n.includes('bowl')) return ['Cooked rice or grain','Main protein','Vegetables','Sauce','Herbs']
  return ['Main protein','Fresh vegetables','Whole grain or base','Healthy sauce','Herbs and spices']
}
function recipeSteps(name:string){
  const n=name.toLowerCase()
  const ing = recipeIngredients(name)
  if(n.includes('smoothie')) return ['Add all ingredients to a blender.','Blend until smooth and creamy.','Pour into a glass and serve chilled.']
  if(n.includes('soup')) return ['Sauté aromatics in a pot for 2 minutes.','Add vegetables, protein and stock, then simmer until tender.','Season, garnish and serve warm.']
  if(n.includes('salad')) return ['Cook or grill the protein if needed.','Chop vegetables and add to a bowl.','Toss with dressing, place protein on top and serve.']
  if(n.includes('wrap')||n.includes('pita')||n.includes('taco')) return ['Warm the wrap or tortillas briefly.','Add filling, vegetables and sauce.','Fold or roll tightly and serve fresh.']
  if(n.includes('pancake')) return ['Blend oats, egg, banana and milk into a batter.','Cook small pancakes on a nonstick pan.','Top with berries and serve.']
  if(n.includes('toast')) return ['Toast the bread until crisp.','Mash avocado with lemon and seasoning.','Top with egg or protein and serve.']
  if(n.includes('curry')) return ['Sauté onion, garlic and spices.','Add protein or legumes with sauce and simmer.','Serve with rice, salad or flatbread.']
  return [`Prep ${ing.slice(0,3).join(', ')} for ${name}.`,`Cook or warm the main ingredients until done and season to taste.`,`Assemble ${name} with the remaining ingredients and serve fresh.`]
}
function recipeIcon(name:string){
  const n = name.toLowerCase()
  if(n.includes('chicken') || n.includes('turkey')) return '🍗'
  if(n.includes('egg') || n.includes('omelette')) return '🥚'
  if(n.includes('salmon') || n.includes('tuna') || n.includes('fish') || n.includes('shrimp')) return '🐟'
  if(n.includes('oat') || n.includes('pancake')) return '🥣'
  if(n.includes('banana') || n.includes('berry') || n.includes('apple')) return '🍌'
  if(n.includes('tofu') || n.includes('paneer')) return '🧀'
  if(n.includes('chickpea') || n.includes('lentil') || n.includes('bean')) return '🫘'
  if(n.includes('soup')) return '🍲'
  if(n.includes('salad') || n.includes('lettuce') || n.includes('cucumber')) return '🥗'
  if(n.includes('wrap') || n.includes('taco') || n.includes('pita')) return '🌯'
  if(n.includes('rice') || n.includes('bowl')) return '🍚'
  if(n.includes('avocado')) return '🥑'
  return '🍽️'
}

const EXERCISES = [
  {name:'Walking', met:3.5, icon:'🚶'}, {name:'Running', met:9.8, icon:'🏃'}, {name:'Cycling', met:7.5, icon:'🚴'}, {name:'Swimming', met:8, icon:'🏊'},
  {name:'Jump Rope', met:12.3, icon:'🪢'}, {name:'Yoga', met:3, icon:'🧘'}, {name:'Strength Training', met:6, icon:'🏋️'}, {name:'HIIT', met:9, icon:'⚡'},
  {name:'Dancing', met:5.5, icon:'💃'}, {name:'Football', met:7, icon:'⚽'}, {name:'Basketball', met:6.5, icon:'🏀'}, {name:'Tennis', met:7.3, icon:'🎾'},
  {name:'Badminton', met:5.5, icon:'🏸'}, {name:'Hiking', met:6, icon:'🥾'}, {name:'Rowing', met:7, icon:'🚣'}, {name:'Stairs', met:8.8, icon:'🪜'},
  {name:'Pilates', met:3.8, icon:'🤸'}, {name:'Boxing', met:9, icon:'🥊'}, {name:'Elliptical', met:5, icon:'⭕'}, {name:'House Cleaning', met:3.3, icon:'🧹'},
]
function exerciseCalories(met:number, weight:number, minutes:number){ return Math.round((met * 3.5 * weight / 200) * minutes) }

function currentWeekDays(){
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay())
  return Array.from({length:7},(_,i)=>{
    const d = new Date(start)
    d.setDate(start.getDate()+i)
    return {label:i===today.getDay()?'Today':d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,1), n:d.getDate(), active:i===today.getDay()}
  })
}

// ---------- SMOOTH RULERS WITH FRAMER MOTION ----------
function HeightRuler({value, onChange}:{value:number,onChange:(v:number)=>void}){
  const min=120, max=220, pxPer=14
  const y = useMotionValue(-(value - min) * pxPer)
  const displayRef = useRef<any>(null)
  const ftRef = useRef<any>(null)
  const didInit = useRef(false)

  useEffect(()=>{ if(!didInit.current){ y.set(-(value-min)*pxPer); didInit.current=true } else { animate(y, -(value-min)*pxPer, {duration:0.18}) } },[value])

  useMotionValueEvent(y, "change", (latest)=>{
    let v = Math.round(min + (-latest)/pxPer)
    v = Math.max(min, Math.min(max, v))
    if(displayRef.current) displayRef.current.textContent = `${v}`
    if(ftRef.current) ftRef.current.textContent = cmToFt(v).replace('"','"')
    // subtle haptic feel could be added
  })

  const snap = (curr:number)=>{
    let v = Math.round(min + (-curr)/pxPer)
    v = Math.max(min, Math.min(max, v))
    animate(y, -(v-min)*pxPer, {type:"spring", stiffness:400, damping:40})
    onChange(v)
  }

  const ticks = useMemo(()=> Array.from({length: max-min+1},(_,i)=> min+i),[])
  return (
    <div className="relative w-full h-[560px] overflow-hidden bg-[#EFE6D6]/70 rounded-[24px] mt-4 select-none touch-none">
      {/* faint vertical line */}
      <div className="absolute left-[52px] top-0 bottom-0 w-px bg-black/10 z-0" />
      {/* scrollable */}
      <motion.div
        drag="y"
        dragConstraints={{top: - (max-min)*pxPer, bottom: 0}}
        dragElastic={0.12}
        dragMomentum={true}
        style={{y}}
        onDragEnd={(_,info)=>{
          // snap
          const curr = y.get()
          snap(curr)
        }}
        className="absolute left-0 top-0 w-[70px] will-change-transform"
      >
        <div className="pt-[280px] pb-[280px]">
          {ticks.map(cm=>{
            const is10 = cm%10===0
            const is5 = cm%5===0
            return (
              <div key={cm} className="relative h-[14px] flex items-center" style={{height:pxPer}}>
                <div className="absolute left-0 flex items-center">
                  <div className={`bg-black ${is10 ? 'w-[64px] h-[2px]' : is5 ? 'w-[36px] h-[1.2px] opacity-60' : 'w-[18px] h-[1px] opacity-30'}`} />
                  {is10 && <span className="ml-2 text-[11px] font-medium text-black/70">{cm}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* center indicator line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-black z-20 pointer-events-none">
        <div className="absolute left-[72px] top-1/2 -translate-y-1/2 flex items-baseline gap-1 pl-3 pr-4 py-2 bg-[#FFFBF2] rounded-full border border-black/10 shadow-sm whitespace-nowrap">
          <span ref={displayRef} className="text-[26px] font-black tracking-tight leading-none">{value}</span>
          <span className="text-[12px] font-medium ml-0.5">Cm</span>
          <span className="text-[12px] opacity-30 mx-1">~</span>
          <span ref={ftRef} className="text-[20px] font-black leading-none">{cmToFt(value)}</span>
          <span className="text-[12px] font-medium ml-0.5">Ft</span>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#FFFBF2] via-transparent to-[#FFFBF2] opacity-80" />
    </div>
  )
}

function WeightRuler({value, onChange}:{value:number,onChange:(v:number)=>void}){
  const min=30, max=150, pxPer=14
  const x = useMotionValue(-(value-min)*pxPer)
  const displayKgRef = useRef<any>(null)
  const displayLbRef = useRef<any>(null)
  const init = useRef(false)
  useEffect(()=>{ if(!init.current){ x.set(-(value-min)*pxPer); init.current=true } else { animate(x, -(value-min)*pxPer, {duration:0.18}) } },[value])

  useMotionValueEvent(x, "change", (latest)=>{
    let v = Math.round(min + (-latest)/pxPer)
    v = Math.max(min, Math.min(max, v))
    if(displayKgRef.current) displayKgRef.current.textContent = v.toFixed(1)
    if(displayLbRef.current) displayLbRef.current.textContent = (v*2.20462).toFixed(1)
  })

  const snap = ()=>{
    let v = Math.round(min + (-x.get())/pxPer)
    v = Math.max(min, Math.min(max, v))
    animate(x, -(v-min)*pxPer, {type:"spring", stiffness:400, damping:40})
    onChange(v)
  }

  const ticks = useMemo(()=> Array.from({length: max-min+1},(_,i)=> min+i),[])
  return (
    <div className="relative w-full mt-6 select-none touch-none">
      {/* lbs + kg header */}
      <div className="text-center">
        <div ref={displayLbRef} className="text-[10px] text-[#9C9082] font-medium">{(value*2.20462).toFixed(1)} Lbs</div>
        <div className="text-[28px] font-black tracking-tight leading-none mt-1"><span ref={displayKgRef}>{value.toFixed(1)}</span> <span className="text-[14px] font-semibold">Kg</span></div>
      </div>

      <div className="relative h-[100px] mt-8 overflow-hidden rounded-[16px] bg-[#F5EBDD]/60 border border-black/5">
        {/* red needle */}
        <div className="absolute left-1/2 top-0 bottom-[22px] w-px bg-[#FF3B30] z-20 pointer-events-none">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FF3B30] rounded-full" />
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#FF3B30]" />
        </div>

        <motion.div
          drag="x"
          dragConstraints={{left: - (max-min)*pxPer, right: 0}}
          dragElastic={0.08}
          dragMomentum={true}
          style={{x}}
          onDragEnd={()=>snap()}
          className="absolute top-0 left-1/2 h-full flex items-end pb-6 will-change-transform"
        >
          <div className="flex items-end pl-0 pr-0">
            {ticks.map(k=>{
              const is10 = k%10===0
              const is5 = k%5===0
              return (
                <div key={k} className="relative flex flex-col items-center" style={{width:pxPer}}>
                  <div className={`${is10 ? 'w-[1.5px] h-[26px] bg-black' : is5 ? 'w-px h-[18px] bg-black/60' : 'w-px h-[10px] bg-black/25'}`} />
                  {is10 && <span className="absolute -bottom-5 text-[9px] text-[#9C9082]">{k}</span>}
                </div>
              )
            })}
          </div>
        </motion.div>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#FFFBF2] via-transparent to-[#FFFBF2]" />
      </div>
    </div>
  )
}

function WheelPicker({min,max,value,onChange,suffix, height=300}:{min:number,max:number,value:number,onChange:(v:number)=>void,suffix?:string,height?:number}){
  const itemH=44
  const y = useMotionValue(-(value-min)*itemH)
  const didInit = useRef(false)
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{ if(!didInit.current){ y.set(-(value-min)*itemH); didInit.current=true } else { animate(y, -(value-min)*itemH, {duration:0.18}) } },[value])

  const [internal, setInternal] = useState(value)
  useEffect(()=>setInternal(value),[value])
  useMotionValueEvent(y, "change", (latest)=>{
    let v = Math.round(min + (-latest)/itemH)
    v = Math.max(min, Math.min(max, v))
    if(v!==internal) setInternal(v)
  })

  const snap = ()=>{
    let v = Math.round(min + (-y.get())/itemH)
    v = Math.max(min, Math.min(max, v))
    animate(y, -(v-min)*itemH, {type:"spring", stiffness:380, damping:36})
    onChange(v)
  }

  const list = useMemo(()=> Array.from({length:max-min+1},(_,i)=>min+i),[min,max])

  return (
    <div className="relative w-full overflow-hidden select-none touch-none" style={{height}}>
      <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[48px] bg-[#FFF1C9] rounded-[14px] border border-[#FFE9A8] z-0" />
      <motion.div
        drag="y"
        dragConstraints={{top: - (max-min)*itemH, bottom:0}}
        dragElastic={0.15}
        dragMomentum={true}
        style={{y}}
        onDragEnd={()=>snap()}
        className="absolute inset-x-0 top-0 will-change-transform z-10"
      >
        <div className="pt-[120px] pb-[120px]">
          {list.map(n=>{
            const active = n===internal
            return (
              <div key={n} className="flex items-center justify-center" style={{height:itemH}}>
                <div className={`flex items-center gap-2 px-5 h-[36px] rounded-full transition-all ${active?'bg-white shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-[#F0E6D8] scale-105 font-black text-[18px]':'text-[15px] text-[#C4B8A8] font-medium'}`}>
                  <span>{n}</span>{active && suffix && <span className="text-[12px] font-semibold opacity-60">{suffix}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#FFFBF2] via-transparent to-[#FFFBF2] z-20" />
    </div>
  )
}

function notify(message:string, type:'success'|'info'|'error'='info'){
  window.dispatchEvent(new CustomEvent('platepal:toast', {detail:{message,type}}))
}

function TopNotifier(){
  const [toast, setToast] = useState<{message:string,type:'success'|'info'|'error'}|null>(null)
  useEffect(()=>{
    let timer:number|undefined
    const handler = (e:Event)=>{
      const detail = (e as CustomEvent).detail || {}
      setToast({message: detail.message || 'Done', type: detail.type || 'info'})
      if(timer) window.clearTimeout(timer)
      timer = window.setTimeout(()=>setToast(null), 2600)
    }
    window.addEventListener('platepal:toast', handler)
    return ()=>{ window.removeEventListener('platepal:toast', handler); if(timer) window.clearTimeout(timer) }
  },[])
  if(!toast) return null
  const color = toast.type==='success' ? 'bg-[#C6ED6A] text-black border-[#A9D84A]' : toast.type==='error' ? 'bg-[#FFE6E6] text-[#9C1C1C] border-[#FFC7C7]' : 'bg-white text-black border-[#F0E6D8]'
  return (
    <motion.div initial={{y:-24, opacity:0, scale:.96}} animate={{y:0, opacity:1, scale:1}} exit={{y:-24, opacity:0}} className={`absolute top-[36px] left-4 right-4 z-[120] rounded-full border ${color} shadow-[0_12px_30px_rgba(0,0,0,0.18)] px-4 py-3 flex items-center gap-3 pointer-events-none`}>
      <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center shrink-0">{toast.type==='success' ? <Check className="w-3.5 h-3.5"/> : toast.type==='error' ? <X className="w-3.5 h-3.5"/> : <Info className="w-3.5 h-3.5"/>}</div>
      <div className="text-[12px] font-black tracking-tight leading-tight">{toast.message}</div>
    </motion.div>
  )
}

// Phone shell
const PhoneShell = ({children, noPad}:{children:any,noPad?:boolean})=>(
  <div className="h-screen h-[100dvh] w-full bg-[#EDE4D5] flex items-center justify-center md:p-6 overflow-hidden">
    <div className="w-full h-full md:max-w-[400px] md:h-[840px] md:max-h-[92dvh] bg-[#FFFBF2] md:rounded-[36px] shadow-none md:shadow-[0_24px_80px_rgba(70,50,20,0.18),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden relative flex flex-col border-0 md:border md:border-white">
      <TopNotifier />
      <div className="h-[20px] md:h-[28px] w-full flex justify-center items-center shrink-0">
        <div className="w-[92px] h-[5px] bg-black rounded-full" />
      </div>
      <div className={`${noPad?'flex-1 flex flex-col relative overflow-hidden':'px-4 md:px-5 pb-3 flex-1 flex flex-col relative overflow-hidden'}`}>{children}</div>
    </div>
  </div>
)

export default function App(){
  const [screen, setScreen] = useState<ScreenId>(()=>{
    try {
      if(localStorage.getItem('platepal_subscribed') === '1') return 'home'
      if(localStorage.getItem('platepal_profile_completed') === '1') return 'paywall'
      if(localStorage.getItem('platepal_seen_onboarding') === '1') return 'setup'
      return 'onboarding'
    } catch { return 'onboarding' }
  })
  const [onboardIdx, setOnboardIdx] = useState(0)
  const [setupStep, setSetupStep] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState<'weekly'|'yearly'>('yearly')
  const [offerSeconds, setOfferSeconds] = useState(9 * 60 + 47)
  const defaultProfile: Profile = {gender:'Female', age:17, height:173, weight:69, targetWeight:66, goal:'Lose Weight', activity:'Lightly active', dailyCalories:1650}
  const [profile, setProfile] = useState<Profile>(()=>{
    try { return JSON.parse(localStorage.getItem('platepal_profile') || '') || defaultProfile } catch { return defaultProfile }
  })
  const [diary, setDiary] = useState<DiaryEntry[]>(()=>{
    try { return JSON.parse(localStorage.getItem('platepal_diary') || '[]') || [] } catch { return [] }
  })
  const [water, setWater] = useState<number>(()=>{
    try { return Number(localStorage.getItem('platepal_water') || 0) } catch { return 0 }
  })
  const [exercises, setExercises] = useState<ExerciseEntry[]>(()=>{
    try { return JSON.parse(localStorage.getItem('platepal_exercises') || '[]') || [] } catch { return [] }
  })
  const [achievements, setAchievements] = useState<AchievementId[]>(()=>{
    try { return JSON.parse(localStorage.getItem('platepal_achievements') || '[]') || [] } catch { return [] }
  })
  const [logDates, setLogDates] = useState<string[]>(()=>{
    try { return JSON.parse(localStorage.getItem('platepal_log_dates') || '[]') || [] } catch { return [] }
  })
  const [achievementPopup, setAchievementPopup] = useState<AchievementDef|null>(null)
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0])
  const [exerciseMinutes, setExerciseMinutes] = useState(30)
  const [scanResult, setScanResult] = useState<FoodAnalysis|null>(null)
  const [scanImage, setScanImage] = useState<string|null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [portion, setPortion] = useState(80)
  const [selectedMeal, setSelectedMeal] = useState<MealType>(()=>{
    const h = new Date().getHours()
    if(h < 11) return 'Breakfast'
    if(h < 16) return 'Lunch'
    if(h < 18) return 'Snack'
    return 'Dinner'
  })
  const [nutritionMetric, setNutritionMetric] = useState<'Calories'|'Protein'|'Carbs'|'Fat'>('Calories')
  const [aiTip, setAiTip] = useState('Start logging meals and PlatePal will suggest your next healthy choice.')
  const [searchQuery, setSearchQuery] = useState('')
  const [foodTab, setFoodTab] = useState<'All'|'My Foods'|'Meals'|'Brands'>('All')
  const [selectedFood, setSelectedFood] = useState<FoodItem>(FOOD_LIBRARY[0])
  const [showMealOptions, setShowMealOptions] = useState(false)
  const [recipeCategory, setRecipeCategory] = useState<'All'|Recipe['category']>('All')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(RECIPE_DATA[0])
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream|null>(null)
  const waterEffectReady = useRef(false)
  const [cameraError, setCameraError] = useState('')
  const [aiMessages, setAiMessages] = useState<{role:'user'|'assistant', text:string}[]>(()=>{
    try { return JSON.parse(localStorage.getItem(`platepal_ai_chat_${todayKey()}`) || '[]') || [] } catch { return [] }
  })
  const todayDate = new Date().toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'})

  useEffect(()=>{ localStorage.setItem('platepal_profile', JSON.stringify(profile)) },[profile])
  useEffect(()=>{ localStorage.setItem('platepal_diary', JSON.stringify(diary)) },[diary])
  useEffect(()=>{ localStorage.setItem('platepal_water', String(water)) },[water])
  useEffect(()=>{
    if(screen !== 'paywall') return
    const id = window.setInterval(()=>setOfferSeconds(s=>Math.max(0,s-1)),1000)
    return ()=>window.clearInterval(id)
  },[screen])
  useEffect(()=>{ localStorage.setItem('platepal_exercises', JSON.stringify(exercises)) },[exercises])
  useEffect(()=>{ localStorage.setItem('platepal_achievements', JSON.stringify(achievements)) },[achievements])
  useEffect(()=>{ localStorage.setItem('platepal_log_dates', JSON.stringify(logDates)) },[logDates])
  useEffect(()=>{ localStorage.setItem(`platepal_ai_chat_${todayKey()}`, JSON.stringify(aiMessages)) },[aiMessages])

  const unlockAchievement = (id: AchievementId)=>{
    const def = ACHIEVEMENTS.find(a=>a.id===id)
    if(!def) return
    const dailyKey = `platepal_daily_achievements_${todayKey()}`
    let dailyShown:string[] = []
    try { dailyShown = JSON.parse(localStorage.getItem(dailyKey) || '[]') || [] } catch {}
    const showDaily = !dailyShown.includes(id)
    if(showDaily){
      localStorage.setItem(dailyKey, JSON.stringify([...dailyShown, id]))
      showAchievementToast(def)
    }
    setAchievements(prev=>{
      if(prev.includes(id)) return prev
      return [...prev, id]
    })
  }

  useEffect(()=>{
    if(!waterEffectReady.current){ waterEffectReady.current = true; return }
    if(water >= 8) unlockAchievement('water_complete')
  },[water])

  useEffect(()=>{
    if(diary.length >= 5) unlockAchievement('five_logs')
    if(diary.length >= 10) unlockAchievement('ten_logs')
    const today = todayKey()
    const todays = diary.filter(d=>d.date===today)
    const meals = new Set(todays.map(d=>d.meal))
    if(meals.has('Breakfast') && meals.has('Lunch') && meals.has('Dinner')) unlockAchievement('three_meals')
    if(todays.reduce((s,d)=>s+d.protein,0) >= Math.round(profile.dailyCalories*0.28/4)) unlockAchievement('protein_hit')
    const cal = todays.reduce((s,d)=>s+d.calories,0)
    if(cal > 0 && cal >= profile.dailyCalories*0.9 && cal <= profile.dailyCalories*1.05) unlockAchievement('calorie_goal')
    if(todays.some(d=>d.protein>0) && todays.some(d=>d.carbs>0) && todays.some(d=>d.fat>0)) unlockAchievement('balanced_day')
  },[diary, profile.dailyCalories])

  const isNative = useMemo(()=>Capacitor.isNativePlatform(),[])

  const openNativeFoodCamera = async ()=>{
    setCameraError('')
    try{
      const photo = await CapacitorCamera.getPhoto({
        quality: 82,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 1024
      })
      if(!photo.dataUrl) throw new Error('No photo was captured')
      const blob = await (await fetch(photo.dataUrl)).blob()
      const file = new File([blob], `platepal-camera-${Date.now()}.jpg`, {type: blob.type || 'image/jpeg'})
      unlockAchievement('first_scan')
      handleScanUpload(file, 'camera')
    }catch(err:any){
      const msg = String(err?.message || err || '')
      if(/cancel/i.test(msg)){
        // user backed out of the native camera; just leave the tap-to-open state, no error banner
        return
      }
      setCameraError(/denied|permission/i.test(msg) ? 'Camera permission was denied. Enable it in your phone Settings > Apps > PlatePal > Permissions.' : (msg || 'Could not open the camera. Please try again.'))
    }
  }

  useEffect(()=>{
    if(isNative && screen==='foodScanner' && !scanImage && !isScanning && !cameraError){
      openNativeFoodCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[screen, isNative])

  useEffect(()=>{
    let cancelled = false
    async function openCamera(){
      if(isNative && screen==='foodScanner') return
      if((screen !== 'foodScanner' && screen !== 'barcodeScanner') || scanImage || isScanning) return
      setCameraError('')
      try{
        if(!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is not available on this device')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false
        })
        if(cancelled){ stream.getTracks().forEach(t=>t.stop()); return }
        streamRef.current = stream
        if(videoRef.current){
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(()=>{})
        }
      }catch(err:any){
        if(!cancelled) setCameraError(err?.message || 'Please allow camera access to scan your meal')
      }
    }
    openCamera()
    return ()=>{
      cancelled = true
      streamRef.current?.getTracks().forEach(t=>t.stop())
      streamRef.current = null
    }
  },[screen, scanImage, isScanning])

  const todayDiary = useMemo(()=>diary.filter(d=>d.date === todayKey()),[diary])
  const todayExercises = useMemo(()=>exercises.filter(e=>e.date === todayKey()),[exercises])
  const totals = useMemo(()=>{
    const c=todayDiary.reduce((s,e)=>s+e.calories,0)
    const p=todayDiary.reduce((s,e)=>s+e.protein,0)
    const cb=todayDiary.reduce((s,e)=>s+e.carbs,0)
    const f=todayDiary.reduce((s,e)=>s+e.fat,0)
    const burned=todayExercises.reduce((s,e)=>s+e.calories,0)
    return {calories:c, protein:p, carbs:cb, fat:f, burned, net:c-burned, remaining: profile.dailyCalories-c+burned}
  },[todayDiary, todayExercises, profile.dailyCalories])

  useEffect(()=>{
    if(screen==='home'){
      const usedKey = 'platepal_tip_queue'
      let queue:number[] = []
      try { queue = JSON.parse(localStorage.getItem(usedKey) || '[]') || [] } catch { queue = [] }
      if(queue.length >= HOME_TIPS.length) queue = []
      const available = HOME_TIPS.map((_,i)=>i).filter(i=>!queue.includes(i))
      const seed = (Date.now() + totals.calories + Math.floor(Math.random()*9999)) % available.length
      const index = available[seed] ?? 0
      queue.push(index)
      localStorage.setItem(usedKey, JSON.stringify(queue))
      setAiTip(HOME_TIPS[index])
    }
  },[screen])

  useEffect(()=>{ setProfile(p=>({...p, dailyCalories: calcDailyCalories(p)})) },[profile.gender, profile.age, profile.height, profile.weight, profile.goal, profile.activity])

  const bmi = calcBMI(profile.weight, profile.height)
  const bmiInfo = bmiStatus(bmi)
  const bmr = calcBMR(profile)
  const maintenanceCalories = calcTDEE(profile)
  const targetCalories = targetCaloriesForGoal(profile)
  const plan = weightTimeline(profile)
  const weeklyNutrition = useMemo(()=>{
    const days = Array.from({length:7},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-(6-i))
      const key = todayKey(d)
      const label = d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3)
      const foods = diary.filter(x=>x.date===key)
      return {key,label, calories: foods.reduce((s,x)=>s+x.calories,0), protein: foods.reduce((s,x)=>s+x.protein,0), carbs: foods.reduce((s,x)=>s+x.carbs,0), fat: foods.reduce((s,x)=>s+x.fat,0)}
    })
    const maxCal = Math.max(profile.dailyCalories, ...days.map(d=>d.calories), 1)
    const proteinGoal = Math.round(profile.dailyCalories*0.28/4)
    const carbsGoal = Math.round(profile.dailyCalories*0.45/4)
    const fatGoal = Math.round(profile.dailyCalories*0.26/9)
    const maxProtein = Math.max(proteinGoal, ...days.map(d=>d.protein), 1)
    const maxCarbs = Math.max(carbsGoal, ...days.map(d=>d.carbs), 1)
    const maxFat = Math.max(fatGoal, ...days.map(d=>d.fat), 1)
    return {days, maxCal, maxProtein, proteinGoal, carbsGoal, maxCarbs, fatGoal, maxFat}
  },[diary, profile.dailyCalories])

  const handleScanUpload = async (file:File, source:'camera'|'gallery'='gallery')=>{
    const url=await makeDiaryPreview(file)
    if(source==='gallery') unlockAchievement('scan_gallery')
    setScanImage(url); setIsScanning(true); setScreen('foodScanner')
    setTimeout(async()=>{
      try{
        const res = await analyzeFoodImage(file)
        if(res.is_drink) setPortion(250)
        else setPortion(100)
        unlockAchievement('first_scan')
        setScanResult(res); setScreen('scanResult')
      }catch{
        setScreen('errorState')
      }finally{setIsScanning(false)}
    },400)
  }

  const makeDiaryPreview = (file:File)=> new Promise<string>((resolve)=>{
    const img = new Image()
    img.onload = ()=>{
      const canvas = document.createElement('canvas')
      const size = 320
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if(!ctx){ resolve(URL.createObjectURL(file)); return }
      ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = ()=> resolve(URL.createObjectURL(file))
    img.src = URL.createObjectURL(file)
  })

  const captureCameraPhoto = async ()=>{
    const video = videoRef.current
    if(!video || video.readyState < 2){
      setCameraError('Camera is still starting. Try again in a second.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if(!ctx){ setCameraError('Could not capture photo'); return }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve, 'image/jpeg', 0.82))
    if(!blob){ setCameraError('Could not capture photo'); return }
    const file = new File([blob], `platepal-camera-${Date.now()}.jpg`, {type:'image/jpeg'})
    unlockAchievement('first_scan')
    handleScanUpload(file, 'camera')
  }

  const lookupBarcode = async (code:string)=>{
    const clean = code.replace(/\D/g,'')
    if(!clean){ setBarcodeError('Enter or scan a valid barcode.'); return }
    setBarcodeLoading(true); setBarcodeError('')
    try{
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,nutriments,image_front_small_url,image_front_url`)
      const data = await res.json()
      if(data.status !== 1 || !data.product){
        setBarcodeError('Food not found in database.')
        return
      }
      const p = data.product
      const n = p.nutriments || {}
      const kcal = Math.round(Number(n['energy-kcal_100g'] || n['energy-kcal'] || 0)) || 100
      setScanImage(p.image_front_url || p.image_front_small_url || null)
      setScanResult({
        food_name: p.product_name || 'Packaged food',
        estimated_calories: kcal,
        protein_g: Math.round(Number(n.proteins_100g || n.proteins || 0)),
        carbs_g: Math.round(Number(n.carbohydrates_100g || n.carbohydrates || 0)),
        fat_g: Math.round(Number(n.fat_100g || n.fat || 0)),
        confidence: 99
      })
      setScreen('scanResult')
    }catch{
      setBarcodeError('Food not found in database.')
    }finally{ setBarcodeLoading(false) }
  }

  const scanBarcodeFromCamera = async ()=>{
    const Detector = (window as any).BarcodeDetector
    if(!Detector){ setBarcodeError('Barcode scanner is not supported on this device. Enter the barcode number below.'); return }
    const video = videoRef.current
    if(!video || video.readyState < 2){ setBarcodeError('Camera is still starting. Try again.'); return }
    setBarcodeLoading(true); setBarcodeError('')
    try{
      const detector = new Detector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']})
      const codes = await detector.detect(video)
      const raw = codes?.[0]?.rawValue
      if(raw) await lookupBarcode(raw)
      else setBarcodeError('No barcode detected. Center the barcode and try again.')
    }catch{ setBarcodeError('Could not scan barcode. Enter the number below.') }
    finally{ setBarcodeLoading(false) }
  }

  const addToDiary = (pct=portion)=>{
    if(!scanResult) return
    const factor=pct/100
    const key = todayKey()
    const entry: DiaryEntry={id:Date.now().toString(), name:scanResult.food_name, calories:Math.round(scanResult.estimated_calories*factor), protein:Math.round(scanResult.protein_g*factor), carbs:Math.round(scanResult.carbs_g*factor), fat:Math.round(scanResult.fat_g*factor), meal:selectedMeal, time:new Date().toLocaleTimeString([],{hour:'numeric', minute:'2-digit'}), date:key, image:scanImage||undefined}
    setDiary(prev=>[...prev, entry])
    unlockAchievement('first_log')
    if(selectedMeal==='Breakfast' && new Date().getHours() < 10) unlockAchievement('early_breakfast')
    if(new Date().getHours() >= 20) unlockAchievement('night_logger')
    setLogDates(prev=>{
      const next = Array.from(new Set([...prev, key]))
      if(hasSevenDayStreak(next)) setTimeout(()=>unlockAchievement('seven_day'), 150)
      return next
    })
    notify(`${entry.name} added to ${entry.meal}`, 'success')
    setScreen('home'); setPortion(80); setScanResult(null)
  }

  const addExercise = ()=>{
    const calories = exerciseCalories(selectedExercise.met, profile.weight, exerciseMinutes)
    const entry: ExerciseEntry = {id:Date.now().toString(), name:selectedExercise.name, minutes:exerciseMinutes, calories, time:new Date().toLocaleTimeString([],{hour:'numeric', minute:'2-digit'}), date: todayKey(), icon:selectedExercise.icon}
    setExercises(prev=>[...prev, entry])
    setScreen('home')
  }

  const sendCoachMessage = async (text:string)=>{
    if(!text.trim()) return
    unlockAchievement('ai_chat')
    setAiMessages(prev=>[...prev,{role:'user', text}])
    setAiMessages(prev=>[...prev,{role:'assistant', text:'Thinking...'}])
    const fullQuestion = `${text}. User profile: ${profile.gender}, ${profile.age} years, ${profile.height}cm, ${profile.weight}kg, target ${profile.targetWeight}kg, activity ${profile.activity}, goal ${profile.goal}, target calories ${profile.dailyCalories}, BMR ${bmr}, TDEE ${maintenanceCalories}. Today's intake: ${totals.calories} calories, protein ${totals.protein}g, carbs ${totals.carbs}g, fat ${totals.fat}g, remaining ${totals.remaining} calories. Give a specific meal plan for today with breakfast/lunch/dinner/snack and calories/macros.`
    const reply = await generateCoachReply(fullQuestion, {consumed: totals.calories, goal: profile.dailyCalories, remaining: totals.remaining, water, recent: todayDiary.map(d=>d.name)}).catch(()=>`For today, aim for ${profile.dailyCalories} kcal with lean protein, vegetables, slow carbs and ${water<6?'more water':'steady hydration'}.`)
    setAiMessages(prev=>[...prev.slice(0,-1),{role:'assistant', text:reply}])
  }

  const ScreenDebugBar = ()=> null

  const LogoMark = ({className='w-8 h-8'}:{className?:string}) => (
    <img src={platePalLogo} alt="PlatePal logo" className={`${className} rounded-full object-cover shadow-sm`} />
  )

  const FoodThumbs = ({items, fallback}:{items:DiaryEntry[], fallback:string})=>{
    if(!items.length){
      return <div className="w-8 h-8 rounded-full bg-[#FFFBF2] border border-[#F5E9D9] flex items-center justify-center text-[13px] shadow-sm">{fallback}</div>
    }
    return (
      <div className="flex -space-x-2 min-w-[34px]">
        {items.slice(-3).reverse().map((it,idx)=>(
          <div key={it.id} className="w-8 h-8 rounded-full bg-[#FFF8EC] border-2 border-white overflow-hidden flex items-center justify-center text-[12px] shadow-sm" style={{zIndex:3-idx}}>
            {it.image ? <img src={it.image} className="w-full h-full object-cover"/> : '🍽️'}
          </div>
        ))}
      </div>
    )
  }

  if(screen==='onboarding'){
    const slides=[
      {
        label:'ONBOARDING',
        title:'Welcome to\nPlatePal',
        desc:'AI powered calorie tracking\nmade simple.',
        visual:(
          <div className="relative mt-10 flex justify-center">
            <div className="w-[190px] h-[190px] rounded-full bg-[#FFF2D9] border border-[#FFE5B8] flex items-center justify-center shadow-[inset_0_0_40px_rgba(255,170,40,0.15)]">
              <div className="w-[108px] h-[108px] rounded-full bg-white border border-white shadow-[0_14px_28px_rgba(30,30,20,0.18)] flex items-center justify-center p-1.5">
                <LogoMark className="w-full h-full"/>
              </div>
            </div>
          </div>
        )
      },
      {
        label:'ONBOARDING',
        title:'Scan. Track.\nAchieve.',
        desc:'Scan your food, track calories\nand reach your goals faster\nthan ever.',
        visual:(
          <div className="relative flex justify-center mt-6">
            <div className="w-[142px] h-[286px] rounded-[30px] bg-black p-[6px] shadow-[0_24px_48px_rgba(0,0,0,0.22)]">
              <div className="w-full h-full rounded-[24px] bg-white overflow-hidden">
                <div className="h-7 bg-black text-white text-[8px] flex items-center px-3 justify-between"><span className="flex items-center gap-1"><span className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center text-black text-[7px] font-bold">R</span> PlatePal</span><span className="opacity-60">9:41</span></div>
                <img src="/onboarding-breakfast.jpg" className="w-full h-[150px] object-cover"/>
                <div className="p-2.5"><div className="text-[10px] font-bold">Food Scan</div><div className="text-[8px] opacity-60">Calories • Macros • Portion</div><div className="mt-2 h-1.5 bg-[#F5EBDD] rounded-full"><div className="h-full w-[70%] bg-black rounded-full"/></div></div>
              </div>
            </div>
            <div className="absolute -left-3 bottom-20 w-11 h-11 rounded-full bg-white shadow-xl border border-[#F0E6D8] flex items-center justify-center"><Camera className="w-5 h-5"/></div>
          </div>
        )
      },
      {
        label:'ONBOARDING',
        title:'Everything you\nneed in one app',
        desc:'',
        visual:(
          <div className="w-full space-y-3 mt-8">
            {[
              {icon:<Search className="w-4 h-4"/>, t:'AI Food Scanner', d:'Instant calorie detection'},
              {icon:<Lightbulb className="w-4 h-4"/>, t:'Personalized Insights', d:'Smart recommendations'},
              {icon:<BarChart3 className="w-4 h-4"/>, t:'Track Progress', d:'Charts, streaks & more'},
            ].map((f,i)=>(
              <div key={i} className="bg-white rounded-[18px] border border-[#F1E8D8] p-4 flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <div className="w-9 h-9 rounded-full bg-[#FFFBF2] border border-[#F0E6D8] flex items-center justify-center">{f.icon}</div>
                <div><div className="text-[13px] font-bold tracking-tight">{f.t}</div><div className="text-[11px] text-[#9C9082]">{f.d}</div></div>
              </div>
            ))}
          </div>
        )
      },
    ]
    const cur=slides[onboardIdx]
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="text-[9px] font-bold tracking-widest text-[#7A9A2D] bg-[#EAF6C9] inline-block px-2.5 py-1 rounded-full w-fit">{cur.label}</div>
          <h1 className="serif text-[28px] font-bold leading-[1.02] mt-4 whitespace-pre-line tracking-tight">{cur.title}</h1>
          <p className="text-[13px] text-[#8A7E71] mt-2 leading-[1.35] whitespace-pre-line font-medium">{cur.desc}</p>
          <div className="flex-1 flex flex-col justify-center">{cur.visual}</div>
          <div className="mt-auto">
            <div className="flex justify-center gap-2 mb-5">
              {[0,1,2].map(i=><div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i===onboardIdx?'w-6 bg-black':'w-1.5 bg-[#D9D0C4]'}`} />)}
            </div>
            <button onClick={()=>{ if(onboardIdx<2) setOnboardIdx(v=>v+1); else { localStorage.setItem('platepal_seen_onboarding','1'); setSetupStep(0); setScreen('setup')}}} className="w-full h-[54px] rounded-full bg-[#C6ED6A] hover:bg-[#BCE45A] font-bold text-[15px] shadow-[0_6px_0_#AED64D] active:shadow-[0_2px_0_#AED64D] active:translate-y-[4px] transition-all">Get Started</button>
          </div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='paywall'){
    const mm = String(Math.floor(offerSeconds/60)).padStart(2,'0')
    const ss = String(offerSeconds%60).padStart(2,'0')
    const choosePlan = (plan:'weekly'|'yearly') => setSelectedPlan(plan)
    const continuePlan = () => {
      localStorage.setItem('platepal_subscribed','1')
      localStorage.setItem('platepal_plan', selectedPlan)
      setScreen('home')
      window.setTimeout(()=>{
        unlockAchievement('profile_complete')
        unlockAchievement('weight_goal_set')
      }, 350)
    }
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center justify-between pt-1">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest text-[#7A9A2D] bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/40"><Crown className="w-3 h-3"/> PLATEPAL PRO</div>
            <div className="text-[10px] font-black bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-1.5"><Timer className="w-3 h-3"/> {mm}:{ss}</div>
          </div>

          <div className="mt-5 text-center">
            <div className="mx-auto w-20 h-20 rounded-[24px] bg-white border border-[#FFE6A8] flex items-center justify-center shadow-[0_10px_24px_rgba(255,190,70,0.18)] p-1"><LogoMark className="w-full h-full rounded-[20px]"/></div>
            <h1 className="serif text-[28px] font-bold leading-[1.05] mt-4 tracking-tight">Unlock your AI diet coach</h1>
            <p className="text-[13px] text-[#8A7E71] leading-[1.4] mt-2 font-medium px-4">Scan meals, calculate targets, follow your timeline, and get smarter meal advice every day.</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 text-center">
            {[
              {icon:<Camera className="w-4 h-4"/>, title:'AI Food Scan', sub:'instant calories'},
              {icon:<Target className="w-4 h-4"/>, title:'Weight Timeline', sub:'goal date'},
              {icon:<Activity className="w-4 h-4"/>, title:'TDEE Planner', sub:'smart targets'},
              {icon:<Sparkles className="w-4 h-4"/>, title:'AI Tips', sub:'meal ideas'},
            ].map((f,i)=><div key={i} className="bg-white rounded-[16px] border border-[#F0E6D8] p-3 shadow-sm"><div className="mx-auto w-8 h-8 rounded-full bg-[#FFFBF2] border border-[#F5E9D9] flex items-center justify-center mb-2">{f.icon}</div><div className="text-[11px] font-black tracking-tight">{f.title}</div><div className="text-[9px] text-[#9C9082] font-bold mt-0.5">{f.sub}</div></div>)}
          </div>

          <div className="mt-4 bg-[#1A1A1A] text-white rounded-[18px] p-3.5 flex items-center gap-3 shadow-[0_8px_20px_rgba(0,0,0,0.15)]">
            <div className="w-9 h-9 rounded-full bg-[#C6ED6A] text-black flex items-center justify-center shrink-0"><Crown className="w-4 h-4"/></div>
            <div className="flex-1"><div className="text-[12px] font-black tracking-tight">72,418 users chose Annual this month</div><div className="text-[10px] text-white/60 font-medium">Limited launch price ends when timer hits zero.</div></div>
          </div>

          <div className="mt-4 space-y-3">
            <button onClick={()=>choosePlan('yearly')} className={`w-full text-left rounded-[20px] border-[2px] p-4 relative transition ${selectedPlan==='yearly'?'bg-[#EAF6C9] border-[#C6ED6A] shadow-[0_0_0_4px_#F3F9E0]':'bg-white border-[#F0E6D8]'}`}>
              <div className="absolute -top-3 right-4 bg-[#FFDE7A] text-black text-[9px] font-black tracking-widest px-3 py-1 rounded-full border border-[#EBC75B]">BEST VALUE</div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan==='yearly'?'bg-black border-black text-white':'border-[#D9D0C4]'}`}>{selectedPlan==='yearly'&&<Check className="w-3.5 h-3.5"/>}</div>
                <div className="flex-1"><div className="text-[14px] font-black tracking-tight">Annual Plan</div><div className="text-[11px] text-[#6C8D25] font-black mt-0.5">Only $0.67 / week • Save 74%</div></div>
                <div className="text-right"><div className="text-[18px] font-black">$34.99</div><div className="text-[10px] text-[#9C9082] font-bold">annually</div></div>
              </div>
            </button>

            <button onClick={()=>choosePlan('weekly')} className={`w-full text-left rounded-[20px] border-[2px] p-4 transition ${selectedPlan==='weekly'?'bg-[#EAF6C9] border-[#C6ED6A] shadow-[0_0_0_4px_#F3F9E0]':'bg-white border-[#F0E6D8]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan==='weekly'?'bg-black border-black text-white':'border-[#D9D0C4]'}`}>{selectedPlan==='weekly'&&<Check className="w-3.5 h-3.5"/>}</div>
                <div className="flex-1"><div className="text-[14px] font-black tracking-tight">Weekly Plan</div><div className="text-[11px] text-[#9C9082] font-bold mt-0.5">Flexible weekly access</div></div>
                <div className="text-right"><div className="text-[18px] font-black">$2.47</div><div className="text-[10px] text-[#9C9082] font-bold">weekly</div></div>
              </div>
            </button>
          </div>

          <div className="mt-auto pt-5">
            <button onClick={continuePlan} className="w-full h-[54px] rounded-full bg-[#C6ED6A] hover:bg-[#BCE45A] font-black text-[15px] shadow-[0_6px_0_#AED64D] active:shadow-[0_2px_0_#AED64D] active:translate-y-[4px] transition-all">Continue with {selectedPlan==='yearly'?'Annual':'Weekly'}</button>
            <div className="flex justify-center gap-4 mt-3 text-[10px] text-[#9C9082] font-bold"><span>Cancel anytime</span><span>•</span><span>Secure checkout</span></div>
          </div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='setup'){
    const steps=[
      {
        title:"Let's set you up", sub:'This helps us personalize your experience', content:(
          <div className="mt-12">
            <div className="text-center font-bold text-[15px] mb-6 tracking-tight">What's your gender?</div>
            <div className="grid grid-cols-2 gap-3">
              {(['Female','Male'] as Gender[]).map(g=>(
                <button key={g} onClick={()=>setProfile(p=>({...p, gender:g}))} className={`rounded-[22px] border-[1.5px] p-5 h-[128px] flex flex-col items-center justify-center gap-3 transition-all ${profile.gender===g?'bg-[#EEF6D1] border-[#C6ED6A] shadow-[0_0_0_4px_#EEF6D1]':'bg-white border-[#F0E6D8]'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${profile.gender===g?'bg-white':'bg-[#FFF8EC]'} border border-[#F0E6D8] shadow-sm`}>{g==='Female'?<span className="text-[20px]">👩‍🦱</span>:<span className="text-[20px]">👨‍🦱</span>}</div>
                  <span className="text-[13px] font-bold tracking-tight">{g}</span>
                  {profile.gender===g && <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center -mt-1"><Check className="w-3 h-3"/></div>}
                </button>
              ))}
            </div>
          </div>
        )
      },
      {
        title:'How old are you?', sub:'', content:(
          <div className="pt-2">
            <WheelPicker min={10} max={80} value={profile.age} onChange={v=>setProfile(p=>({...p, age:v}))} suffix="years" />
            <div className="text-center text-[11px] text-[#9C9082] mt-4 flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#C6ED6A] animate-pulse"/> Drag smoothly — spring physics</div>
          </div>
        )
      },
      {
        title:'Your height', sub:'', content:(<HeightRuler value={profile.height} onChange={v=>setProfile(p=>({...p, height:v}))} />)
      },
      {
        title:"What's your current weight?", sub:'', content:(
          <div className="pt-2">
            <WeightRuler value={profile.weight} onChange={v=>setProfile(p=>({...p, weight:v}))}/>
            <div className="bg-white rounded-[18px] border border-[#F0E6D8] p-4 mt-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 text-[13px] font-bold">Your BMI: {bmi} <span className="bg-[#E9F8C9] text-[#5A9A00] px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide">{bmiInfo.label}</span></div>
              <div className="text-[11px] text-[#8A7E71] leading-[1.4] mt-2">{bmiInfo.note}</div>
            </div>
          </div>
        )
      },
      {
        title:"What's your goal?", sub:'', content:(
          <div className="space-y-3 mt-8">
            {[
              {k:'Lose Weight', sub:'Burn fat & get lean', icon:<Target className="w-4 h-4"/>},
              {k:'Maintain Weight', sub:'Stay healthy', icon:<Scale className="w-4 h-4"/>},
              {k:'Gain Weight', sub:'Build muscle', icon:<Beef className="w-4 h-4"/>},
            ].map(o=>(
              <button key={o.k} onClick={()=>setProfile(p=>({...p, goal:o.k as Goal}))} className={`w-full text-left rounded-[18px] border-[1.5px] p-4 flex items-center gap-3.5 transition-all ${profile.goal===o.k?'border-[#C6ED6A] bg-[#F3F9E0] shadow-[0_0_0_3px_#EEF6D1]':'bg-white border-[#F0E6D8]'}`}>
                <div className="w-10 h-10 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm">{o.icon}</div>
                <div className="flex-1"><div className="text-[13px] font-bold tracking-tight">{o.k}</div><div className="text-[11px] text-[#9C9082] font-medium">{o.sub}</div></div>
                <div className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center ${profile.goal===o.k?'bg-[#C6ED6A] border-[#AAD84E]':''}`}>{profile.goal===o.k&&<Check className="w-3.5 h-3.5"/>}</div>
              </button>
            ))}
          </div>
        )
      },
      {
        title:'Target weight', sub:'', content:(
          <div className="pt-4">
            <div className="text-center mb-4"><span className="text-[11px] text-[#9C9082]">Set your ideal weight</span></div>
            <WheelPicker min={40} max={120} value={profile.targetWeight} onChange={v=>setProfile(p=>({...p, targetWeight:v}))} suffix="Kg"/>
          </div>
        )
      },
      {
        title:'Activity level', sub:'How active are you?', content:(
          <div className="space-y-3 mt-4">
            {[
              {id:'Sedentary', d:'Little or no exercise', icon:<User className="w-4 h-4"/>},
              {id:'Lightly active', d:'1-2 days/week', icon:<Footprints className="w-4 h-4"/>},
              {id:'Moderately active', d:'3-5 days/week', icon:<Activity className="w-4 h-4"/>},
              {id:'Very active', d:'6-7 days/week', icon:<Zap className="w-4 h-4"/>},
            ].map(o=>(
              <button key={o.id} onClick={()=>setProfile(p=>({...p, activity:o.id as ActivityLevel}))} className={`w-full text-left rounded-[18px] border-[1.5px] p-4 flex items-center gap-3.5 transition-all ${profile.activity===o.id?'bg-[#EEF6D1] border-[#C6ED6A] shadow-[0_0_0_3px_#EEF6D1]':'bg-white border-[#F0E6D8]'}`}>
                <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center shadow-sm">{o.icon}</div>
                <div className="flex-1"><div className="text-[13px] font-bold tracking-tight">{o.id}</div><div className="text-[11px] text-[#9C9082]">{o.d}</div></div>
                <div className={`w-6 h-6 rounded-full ${profile.activity===o.id?'bg-[#C6ED6A]':''} flex items-center justify-center border`}>{profile.activity===o.id&&<Check className="w-3.5 h-3.5"/>}</div>
              </button>
            ))}
          </div>
        )
      },
      {
        title:'Your daily calorie goal', sub:'Based on your info, we recommend', content:(
          <div className="flex flex-col items-center pt-10">
            <motion.div initial={{scale:0.8}} animate={{scale:1}} className="text-[40px] font-black serif tracking-tight">{targetCalories.toLocaleString()}</motion.div>
            <div className="text-[13px] text-[#9C9082] font-medium -mt-1">Target calories / day</div>
            <div className="grid grid-cols-3 gap-3 mt-8 w-full text-center">
              <div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3 shadow-sm"><div className="mx-auto w-7 h-7 rounded-full bg-[#FFF4E0] flex items-center justify-center mb-1.5"><Flame className="w-3.5 h-3.5 text-[#FF8A2E]" fill="#FF8A2E"/></div><div className="text-[10px] text-[#9C9082] font-bold">BMR</div><div className="font-black text-[14px] mt-1">{bmr}</div></div>
              <div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3 shadow-sm"><div className="mx-auto w-7 h-7 rounded-full bg-[#EAF2FF] flex items-center justify-center mb-1.5"><Activity className="w-3.5 h-3.5 text-[#3A8DFF]"/></div><div className="text-[10px] text-[#9C9082] font-bold">Maintain</div><div className="font-black text-[14px] mt-1">{maintenanceCalories}</div></div>
              <div className="bg-[#EAF6C9] border border-[#C6ED6A] rounded-[14px] p-3 shadow-sm"><div className="mx-auto w-7 h-7 rounded-full bg-white flex items-center justify-center mb-1.5"><Target className="w-3.5 h-3.5 text-[#5A8A00]"/></div><div className="text-[10px] text-[#6C8D25] font-bold">Target</div><div className="font-black text-[14px] mt-1">{targetCalories}</div></div>
            </div>
            <div className="grid grid-cols-3 gap-10 mt-7 w-full text-center">
              <div><div className="text-[11px] text-[#9C9082] font-medium">Protein</div><div className="font-black text-[16px] mt-1">{Math.round(targetCalories*0.28/4)}g</div></div>
              <div><div className="text-[11px] text-[#9C9082] font-medium">Carbs</div><div className="font-black text-[16px] mt-1">{Math.round(targetCalories*0.45/4)}g</div></div>
              <div><div className="text-[11px] text-[#9C9082] font-medium">Fat</div><div className="font-black text-[16px] mt-1">{Math.round(targetCalories*0.26/9)}g</div></div>
            </div>
            <div className="text-[11px] text-[#9C9082] mt-8 font-medium text-center px-4">Calculated from your age, gender, height, weight and activity using Mifflin-St Jeor TDEE.</div>
          </div>
        )
      },
      {
        title:'Almost done!', sub:'', content:(
          <div className="pt-6">
            <div className="text-[10px] font-black tracking-[0.12em] opacity-50 mb-4">PROFILE SUMMARY</div>
            <div className="space-y-3.5 bg-white rounded-[18px] border border-[#F0E6D8] p-5 shadow-sm">
              {[
                `Female, ${profile.age} years old`,
                `Height: ${profile.height} cm`,
                `Weight: ${profile.weight.toFixed(1)} kg`,
                `Goal: ${profile.goal}`,
                `Target: ${profile.targetWeight} kg`,
                `Activity: ${profile.activity}`,
                `Maintain: ${maintenanceCalories} kcal`,
                `Target Calories: ${targetCalories} kcal`,
              ].map((t,i)=><div key={i} className="flex items-center gap-3 text-[13px]"><div className="w-5 h-5 rounded-full bg-[#E7F7C3] flex items-center justify-center"><Check className="w-3 h-3 text-[#5A8A00]"/></div><span className="text-[#3C342B] font-medium">{t}</span></div>)}
            </div>
          </div>
        )
      }
    ]
    const cur = steps[setupStep]
    const topProgress = ((setupStep+1)/steps.length)*100
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3">
            <button onClick={()=> setupStep>0? setSetupStep(s=>s-1): setScreen('onboarding')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button>
            <div className="flex-1 h-2 bg-black rounded-full overflow-hidden p-0.5">
              <motion.div initial={{width:0}} animate={{width:`${topProgress}%`}} className="h-full bg-[#FFE48A] rounded-full" />
            </div>
            <div className="text-[8px] font-black tracking-widest text-[#7A9A2D] bg-[#EAF6C9] px-2 py-1 rounded-full border border-[#C6ED6A]/30">PROFILE SETUP</div>
          </div>
          <h2 className="serif text-[22px] font-bold mt-7 leading-[1.1] tracking-tight">{cur.title}</h2>
          {cur.sub && <p className="text-[13px] text-[#8A7E71] mt-1 font-medium">{cur.sub}</p>}
          <div className="flex-1 flex flex-col">{cur.content}</div>
          <button onClick={()=> setupStep<steps.length-1 ? setSetupStep(s=>s+1) : (localStorage.setItem('platepal_profile_completed','1'), setOfferSeconds(299), setScreen('paywall'))} className={`mt-8 w-full h-[54px] rounded-full font-bold text-[14px] shadow-[0_6px_0_rgba(0,0,0,0.15)] active:shadow-[0_2px_0_rgba(0,0,0,0.15)] active:translate-y-[4px] transition-all tracking-tight ${setupStep===steps.length-1?'bg-[#C6ED6A] text-black':'bg-[#FFDE7A] text-black'}`}>{setupStep===steps.length-1?'Start Tracking':'Continue'}</button>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  // Common bottom nav
  const BottomNav = ({active}:{active?:string})=>(
    <div className="bg-white rounded-full border border-[#F0E6D8] shadow-[0_12px_32px_rgba(0,0,0,0.10)] px-2 h-[58px] md:h-[64px] flex items-center justify-between shrink-0">
      {[
        {id:'home', icon:Utensils, label:'Home'},
        {id:'dailyDiary', icon:BarChart3, label:'Progress'},
        {id:'center', icon:Plus, label:'+'},
        {id:'recipes', icon:BookOpen, label:'Recipes'},
        {id:'profile', icon:User, label:'Me'},
      ].map(it=>{
        if(it.id==='center') return <div key={it.id} className="flex-1 flex justify-center"><button onClick={()=>{setScanImage(null); setCameraError(''); setScreen('foodScanner')}} className="w-[48px] h-[48px] md:w-[52px] md:h-[52px] rounded-full bg-black flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.3)] active:scale-95 transition"><Plus className="w-5 h-5 md:w-6 md:h-6 text-white"/></button></div>
        const isActive = (active||screen)===it.id || (it.id==='home' && screen==='home')
        const go = it.id==='dailyDiary' ? 'progressWeight' : it.id
        return <button key={it.id} onClick={()=>setScreen(go as ScreenId)} className={`flex-1 h-[42px] md:h-[46px] rounded-full flex flex-col items-center justify-center gap-0.5 transition ${isActive?'bg-[#FFFBF2] shadow-sm border border-[#F5E9D9]':''}`}><it.icon className={`w-[16px] h-[16px] md:w-[18px] md:h-[18px] ${isActive?'text-black':'opacity-35'}`}/><span className={`text-[9px] md:text-[10px] tracking-tight ${isActive?'font-bold':'opacity-50 font-medium'}`}>{it.label}</span></button>
      })}
    </div>
  )

  // HOME
  if(screen==='home'){
    const proteinNeed = Math.round(profile.dailyCalories*0.28/4)
    const carbsNeed = Math.round(profile.dailyCalories*0.45/4)
    const fatNeed = Math.round(profile.dailyCalories*0.26/9)
    const pLeft = Math.max(0, proteinNeed - totals.protein)
    const cLeft = Math.max(0, carbsNeed - totals.carbs)
    const fLeft = Math.max(0, fatNeed - totals.fat)
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex justify-between items-center"><div className="flex items-center gap-2"><LogoMark className="w-8 h-8"/><span className="font-bold text-[14px] flex items-center gap-1 tracking-tight">PlatePal</span></div><div className="flex gap-1.5"><div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center shadow-sm"><Crown className="w-3.5 h-3.5 text-[#FFB800]"/></div><div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center shadow-sm">🥑</div><div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center shadow-sm"><Flame className="w-3.5 h-3.5 text-[#FF5A2E]" fill="#FF5A2E"/></div><button onClick={()=>setScreen('profile')} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center shadow-sm"><User className="w-3.5 h-3.5"/></button></div></div>

          <div className="mt-4 flex justify-between text-[10px]">{currentWeekDays().map((day,i)=><div key={i} className="flex flex-col items-center gap-1"><span className={`${day.active?'font-black text-black':'text-[#9C9082]'} text-[10px]`}>{day.label}</span><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium ${day.active?'bg-[#C6ED6A] font-black shadow-sm':''}`}>{day.n}</div></div>)}</div>

          <div className="mt-5 grid grid-cols-12 gap-3">
            <div className="col-span-7 bg-white rounded-[22px] border border-[#F0E6D8] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"><div className="flex justify-between items-start"><div><div className="text-[24px] font-black tracking-tight">{totals.remaining}</div><div className="text-[11px] text-[#9C9082] font-medium -mt-1">Calories left</div></div><div className="w-10 h-10 rounded-full bg-[#FFF4E0] flex items-center justify-center border border-[#FFE9C2]"><Flame className="w-5 h-5 text-[#FF8A2E]" fill="#FF8A2E"/></div></div><div className="mt-4 h-2 bg-[#F5EBDD] rounded-full overflow-hidden"><div className="h-full bg-black rounded-full transition-all duration-500" style={{width:`${Math.min(100, Math.max(0, totals.net)/profile.dailyCalories*100)}%`}}/></div><div className="text-[10px] text-[#9C9082] mt-2 font-medium">{totals.calories} eaten - {totals.burned} burned = {totals.net} net</div></div>
            <div className="col-span-5 flex flex-col gap-3"><div className="bg-white rounded-[18px] border border-[#F0E6D8] p-3 flex justify-between items-center shadow-sm"><div><div className="font-black text-[14px]">{pLeft}g</div><div className="text-[10px] text-[#9C9082] font-medium">Protein left</div></div><span className="text-[18px]">🍗</span></div><div className="bg-white rounded-[18px] border border-[#F0E6D8] p-3 flex justify-between items-center shadow-sm"><div><div className="font-black text-[14px]">{cLeft}g</div><div className="text-[10px] text-[#9C9082] font-medium">Carbs left</div></div><span className="text-[18px]">🍞</span></div></div>
            <button onClick={()=>setScreen('waterTracker')} className="col-span-7 bg-white rounded-[18px] border border-[#F0E6D8] p-3.5 flex items-center gap-3 shadow-sm text-left active:scale-[0.99] transition"><div className="w-10 h-11 rounded-[10px] bg-[#E6F1FF] border border-[#D6E6FF] relative overflow-hidden flex items-end justify-center"><div className="w-full bg-[#7AB8FF] transition-all duration-700" style={{height:`${water/8*100}%`}}/><Droplets className="w-4 h-4 absolute top-1.5 text-[#3A8BFF]"/></div><div><div className="text-[11px] font-bold tracking-tight">Water</div><div className="text-[11px] text-[#9C9082] font-medium">{water} / 8 glasses</div></div></button>
            <div className="col-span-5 bg-white rounded-[18px] border border-[#F0E6D8] p-3 flex justify-between items-center shadow-sm"><div><div className="text-[13px] font-black">{fLeft}g</div><div className="text-[10px] text-[#9C9082] font-medium">Fat left</div></div><span className="text-[18px]">🧀</span></div>

            <div className="col-span-12 bg-white rounded-[22px] border border-[#F0E6D8] p-4 shadow-sm">
              {([{meal:'Breakfast', items:todayDiary.filter(d=>d.meal==='Breakfast')},{meal:'Lunch', items:todayDiary.filter(d=>d.meal==='Lunch')},{meal:'Dinner', items:todayDiary.filter(d=>d.meal==='Dinner')},{meal:'Snack', items:todayDiary.filter(d=>d.meal==='Snack')}] as any[]).map((r:any)=><button key={r.meal} onClick={()=>{setSelectedMeal(r.meal); setShowMealOptions(true)}} className="w-full flex justify-between items-center py-3 border-b last:border-0 border-[#F6EEE2] text-left active:scale-[0.99] transition"><div className="flex items-center gap-3"><FoodThumbs items={r.items} fallback={r.meal==='Breakfast'?'🥣':r.meal==='Lunch'?'🍛':r.meal==='Dinner'?'➕':'🍎'}/><div><div className="text-[11px] font-bold text-[#9C9082] tracking-wide">{r.meal}</div><div className="text-[12px] font-bold tracking-tight truncate max-w-[150px]">{r.items.length? r.items.map((x:any)=>x.name).join(', '): <span className="text-[#9C9082] font-medium">Tap to log your {r.meal.toLowerCase()}</span>}</div></div></div><div className="text-[11px] font-black">{r.items.reduce((s:any,i:any)=>s+i.calories,0) ? `${r.items.reduce((s:any,i:any)=>s+i.calories,0)} kcal`:<ChevronRight className="w-4 h-4 opacity-30"/>}</div></button>)}
            </div>

            <button onClick={()=>setScreen('exerciseList')} className="col-span-12 bg-white rounded-[18px] border border-[#F0E6D8] p-3.5 flex items-center justify-between shadow-sm text-left"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#EAF6C9] flex items-center justify-center border border-[#C6ED6A]"><Dumbbell className="w-5 h-5"/></div><div><div className="text-[12px] font-black tracking-tight">Exercise</div><div className="text-[14px] font-black text-[#5A8A00]">+{totals.burned} kcal allowance</div><div className="text-[10px] text-[#9C9082] font-medium -mt-0.5">Log workout to increase calories left</div></div></div><ChevronRight className="w-4 h-4 opacity-30"/></button>

            <div className="col-span-12 bg-[#1A1A1A] rounded-[20px] p-4 text-white relative overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.15)]"><div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10"><Sparkles className="w-4 h-4 text-[#C6ED6A]"/></div><div><div className="text-[11px] opacity-60 font-bold tracking-wide">AI COACH • PlatePal</div><div className="text-[13px] leading-[1.4] mt-1.5 font-medium">{aiTip}</div></div></div><div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#C6ED6A]/10 rounded-full blur-[12px]"/></div>
          </div>
          {showMealOptions && <div className="absolute inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-end p-4">
            <div className="w-full bg-[#FFFBF2] rounded-[28px] border border-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between"><div><div className="text-[18px] font-black tracking-tight">Add to {selectedMeal}</div><div className="text-[12px] text-[#9C9082] font-bold mt-0.5">Choose how you want to log food</div></div><button onClick={()=>setShowMealOptions(false)} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center"><X className="w-4 h-4"/></button></div>
              <div className="grid grid-cols-3 gap-3 mt-5">
                <button onClick={()=>{setShowMealOptions(false); setScanImage(null); setCameraError(''); setScreen('foodScanner')}} className="h-[92px] rounded-[18px] bg-[#C6ED6A] border border-[#AED64D] flex flex-col items-center justify-center gap-2 shadow-[0_4px_0_#AED64D]"><Camera className="w-6 h-6"/><span className="text-[12px] font-black">Scan Food</span></button>
                <button onClick={()=>{setShowMealOptions(false); setScreen('barcodeScanner')}} className="h-[92px] rounded-[18px] bg-white border border-[#F0E6D8] flex flex-col items-center justify-center gap-2 shadow-sm"><ScanLine className="w-6 h-6"/><span className="text-[12px] font-black">Barcode</span></button>
                <button onClick={()=>{setShowMealOptions(false); setFoodTab('All'); setScreen('foodSearch')}} className="h-[92px] rounded-[18px] bg-white border border-[#F0E6D8] flex flex-col items-center justify-center gap-2 shadow-sm"><Search className="w-6 h-6"/><span className="text-[12px] font-black">Search</span></button>
              </div>
            </div>
          </div>}
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-6"><BottomNav active="home"/></div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) handleScanUpload(f)}}/>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='foodScanner'){
    return (
      <PhoneShell noPad>
        <div className="relative w-full h-[840px] bg-black rounded-[32px] overflow-hidden">
          <div className="absolute inset-0">
            {scanImage ? <img src={scanImage} className="w-full h-full object-cover"/> : (isNative ? null : <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />)}
            {!scanImage && cameraError && <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center px-8"><Camera className="w-14 h-14 text-white/80 mb-4"/><p className="text-white font-bold text-[15px]">Camera access needed</p><p className="text-white/60 text-[12px] mt-2 leading-[1.4]">{cameraError}</p><button onClick={()=>{setCameraError(''); isNative ? openNativeFoodCamera() : setScreen('foodScanner')}} className="mt-4 px-5 h-10 rounded-full bg-white text-black font-black text-[12px]">Try again</button><button onClick={()=>fileRef.current?.click()} className="mt-2.5 px-5 h-10 rounded-full bg-white/15 border border-white/25 text-white font-black text-[12px]">Upload from gallery</button></div>}
            {!scanImage && !cameraError && isNative && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"><button onClick={openNativeFoodCamera} className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center"><Camera className="w-7 h-7 text-white"/></button><p className="text-white/70 text-[12px] font-bold bg-black/30 backdrop-blur px-3 py-1.5 rounded-full">Tap to open camera</p></div>}
            {!scanImage && !cameraError && !isNative && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-white/70 text-[12px] font-bold bg-black/30 backdrop-blur px-3 py-1.5 rounded-full">Live camera</div></div>}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70"/>
          </div>
          <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-20"><button onClick={()=>setScreen('home')} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/20"><X className="w-4 h-4"/></button><div className="text-white text-[10px] font-black tracking-[0.14em] bg-white/15 backdrop-blur px-3 py-1 rounded-full border border-white/20">AI FOOD SCANNER</div><button onClick={()=>{setScanImage(null); setBarcodeError(''); setScreen('barcodeScanner')}} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/20"><ScanLine className="w-4 h-4"/></button></div>
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><div className="w-[300px] h-[300px] relative"><div className="absolute top-0 left-0 w-12 h-12 border-l-[3px] border-t-[3px] border-white rounded-tl-[20px] shadow-[0_0_12px_rgba(255,255,255,0.5)]"/><div className="absolute top-0 right-0 w-12 h-12 border-r-[3px] border-t-[3px] border-white rounded-tr-[20px] shadow-[0_0_12px_rgba(255,255,255,0.5)]"/><div className="absolute bottom-0 left-0 w-12 h-12 border-l-[3px] border-b-[3px] border-white rounded-bl-[20px] shadow-[0_0_12px_rgba(255,255,255,0.5)]"/><div className="absolute bottom-0 right-0 w-12 h-12 border-r-[3px] border-b-[3px] border-white rounded-br-[20px] shadow-[0_0_12px_rgba(255,255,255,0.5)]"/><motion.div animate={{opacity:[0.2,0.6,0.2]}} transition={{duration:2, repeat:Infinity}} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-white/5 rounded-full blur-[2px] border border-white/10"/></div></div>
          {isScanning && <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center"><div className="w-20 h-20 rounded-full border-[3px] border-[#C6ED6A] border-t-transparent animate-spin shadow-[0_0_20px_#C6ED6A]"/><p className="text-white font-bold mt-6 text-[16px] tracking-tight">Analyzing your meal...</p><p className="text-white/60 text-[12px] mt-1.5 font-medium">Analyzing food and estimating nutrition</p></div>}
          <div className="absolute bottom-28 left-0 right-0 text-center z-20"><p className="text-white/90 text-[13px] font-medium tracking-tight drop-shadow">Place the food in the frame</p></div>
          <div className="absolute bottom-0 left-0 right-0 p-7 flex items-center justify-between z-20"><button onClick={()=>fileRef.current?.click()} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center border border-white/20"><ImageIcon className="w-5 h-5"/></button><button onClick={isNative ? openNativeFoodCamera : captureCameraPhoto} className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center shadow-[0_0_0_6px_rgba(255,255,255,0.20),0_8px_24px_rgba(0,0,0,0.4)] active:scale-95 transition"><div className="w-14 h-14 rounded-full bg-white border-[3px] border-black flex items-center justify-center"><div className="w-9 h-9 rounded-full bg-black"/></div></button><button onClick={()=>{setScanImage(null); setBarcodeError(''); setScreen('barcodeScanner')}} className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center border border-white/20"><ScanLine className="w-5 h-5"/></button></div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) handleScanUpload(f)}}/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='exerciseList'){
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('home')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><div><div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full w-fit">EXERCISE LOG</div><h2 className="text-[18px] font-black mt-1">Choose exercise</h2></div></div>
          <div className="mt-4 bg-[#1A1A1A] text-white rounded-[18px] p-4 flex items-center justify-between"><div><div className="text-[11px] text-white/55 font-bold">Burned Today</div><div className="text-[24px] font-black">{totals.burned} kcal</div></div><Dumbbell className="w-8 h-8 text-[#C6ED6A]"/></div>
          <div className="mt-4 grid grid-cols-2 gap-3 overflow-y-auto no-scrollbar pb-4">
            {EXERCISES.map(ex=><button key={ex.name} onClick={()=>{setSelectedExercise(ex); setExerciseMinutes(30); setScreen('exerciseTimer')}} className="bg-white rounded-[16px] border border-[#F0E6D8] p-3.5 text-left shadow-sm hover:shadow-md transition"><div className="text-[24px] mb-2">{ex.icon}</div><div className="text-[13px] font-black tracking-tight">{ex.name}</div><div className="text-[10px] text-[#9C9082] font-bold mt-0.5">~{exerciseCalories(ex.met, profile.weight, 30)} kcal / 30 min</div></button>)}
          </div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-3"><BottomNav active="home"/></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='exerciseTimer'){
    const burn = exerciseCalories(selectedExercise.met, profile.weight, exerciseMinutes)
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('exerciseList')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><div><div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full w-fit">EXERCISE TIME</div><h2 className="text-[18px] font-black mt-1">{selectedExercise.name}</h2></div></div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white border border-[#F0E6D8] shadow-lg flex items-center justify-center text-[54px]">{selectedExercise.icon}</div>
            <div className="mt-8 text-[48px] font-black tracking-tight">{exerciseMinutes}<span className="text-[16px] font-bold text-[#9C9082] ml-1">min</span></div>
            <input type="range" min={5} max={180} step={5} value={exerciseMinutes} onChange={e=>setExerciseMinutes(Number(e.target.value))} className="w-full mt-8 accent-[#8ED500]"/>
            <div className="grid grid-cols-4 gap-2 mt-5 w-full">{[15,30,45,60].map(m=><button key={m} onClick={()=>setExerciseMinutes(m)} className={`h-10 rounded-full border font-black text-[12px] ${exerciseMinutes===m?'bg-black text-white border-black':'bg-white border-[#F0E6D8]'}`}>{m}m</button>)}</div>
            <div className="mt-8 bg-[#EAF6C9] border border-[#C6ED6A] rounded-[18px] p-4 w-full text-center"><div className="text-[11px] text-[#6C8D25] font-black tracking-widest">CALORIES BURNED</div><div className="text-[28px] font-black mt-1">{burn} kcal</div><div className="text-[11px] text-[#6C8D25] font-bold">This will add {burn} kcal to your remaining intake.</div></div>
          </div>
          <button onClick={addExercise} className="w-full h-[52px] rounded-full bg-[#C6ED6A] font-black text-[15px] shadow-[0_5px_0_#AED64D]">Add Exercise</button>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='scanResult' && scanResult){
    const isDrink = !!scanResult.is_drink
    const calAdj=isDrink ? Math.round((scanResult.calories_per_100ml || scanResult.estimated_calories) * portion / 100) : Math.round(scanResult.estimated_calories*portion/100)
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="text-center pt-1"><div className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest bg-[#EAF6C9] px-3 py-1 rounded-full border border-[#C6ED6A]/30">SCAN RESULT</div><div className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-bold tracking-tight">Analysis Complete <Sparkles className="w-4 h-4 text-[#FFB800]"/></div></div>
          <div className="mt-5 flex justify-center"><div className="w-[160px] h-[160px] rounded-full overflow-hidden border-[8px] border-white shadow-[0_12px_36px_rgba(0,0,0,0.14)]">{scanImage ? <img src={scanImage} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-[#FFF3E0] flex items-center justify-center text-[46px]">🍽️</div>}</div></div>
          <div className="text-center mt-6"><h2 className="text-[18px] font-black tracking-tight">{scanResult.food_name}</h2><div className="text-[26px] font-black serif mt-1 tracking-tight">{calAdj} <span className="text-[13px] font-sans font-bold opacity-60">kcal</span></div><div className="text-[11px] text-[#9C9082] font-medium -mt-1">{isDrink ? `${scanResult.calories_per_100ml || scanResult.estimated_calories} kcal / 100ml • ${portion}ml selected` : `Per serving • ${portion}% portion`}</div></div>
          <div className="grid grid-cols-3 gap-3 mt-6"><div className="bg-white border border-[#F0E6D8] rounded-[16px] p-3.5 text-center shadow-sm"><div className="text-[10px] text-[#9C9082] font-bold tracking-wide">Protein</div><div className="text-[15px] font-black mt-1">{Math.round(scanResult.protein_g*portion/100)}g</div></div><div className="bg-white border border-[#F0E6D8] rounded-[16px] p-3.5 text-center shadow-sm"><div className="text-[10px] text-[#9C9082] font-bold tracking-wide">Carbs</div><div className="text-[15px] font-black mt-1">{Math.round(scanResult.carbs_g*portion/100)}g</div></div><div className="bg-white border border-[#F0E6D8] rounded-[16px] p-3.5 text-center shadow-sm"><div className="text-[10px] text-[#9C9082] font-bold tracking-wide">Fat</div><div className="text-[15px] font-black mt-1">{Math.round(scanResult.fat_g*portion/100)}g</div></div></div>
          <div className="mt-4 bg-white border border-[#F0E6D8] rounded-[16px] p-3.5 shadow-sm">
            <div className="text-[11px] text-[#9C9082] font-black tracking-widest mb-2">ADD TO MEAL</div>
            <div className="grid grid-cols-4 gap-2">
              {(['Breakfast','Lunch','Dinner','Snack'] as MealType[]).map(meal=>(
                <button key={meal} onClick={()=>setSelectedMeal(meal)} className={`h-[58px] rounded-[14px] border-[1.5px] flex flex-col items-center justify-center gap-1 transition ${selectedMeal===meal?'bg-[#EAF6C9] border-[#C6ED6A] shadow-[0_0_0_3px_#F3F9E0]':'bg-[#FFFBF2] border-[#F0E6D8]'}`}>
                  <span className="text-[17px]">{meal==='Breakfast'?'🥣':meal==='Lunch'?'🍛':meal==='Dinner'?'🍽️':'🍎'}</span>
                  <span className="text-[9px] font-black tracking-tight">{meal}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 bg-[#FFF8EC] border border-[#F7E9D1] rounded-[16px] p-3.5 flex justify-between items-center shadow-sm"><span className="text-[12px] font-bold tracking-tight">Recognition confidence</span><span className="text-[12px] font-black bg-[#C6ED6A] px-2.5 py-0.5 rounded-full">{scanResult.confidence||96}%</span></div>
          <div className="mt-auto space-y-3 pt-6"><button onClick={()=>setScreen('portion')} className="w-full h-12 rounded-full border-[1.5px] border-[#F0E6D8] bg-white text-[13px] font-bold tracking-tight shadow-sm">Adjust {isDrink ? `Amount (${portion}ml)` : `Portion (${portion}%)`}</button><button onClick={()=>addToDiary()} className="w-full h-[52px] rounded-full bg-[#FFDE7A] hover:bg-[#FFD44D] font-black text-[15px] shadow-[0_5px_0_#D9B94A] active:shadow-[0_2px_0_#D9B94A] active:translate-y-[3px] transition-all">Add to {selectedMeal}</button><button onClick={()=>setScreen('home')} className="w-full text-center text-[12px] text-[#9C9082] font-medium">Skip for now</button></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='portion'){
    const isDrink = !!scanResult?.is_drink
    const baseDrinkCal = scanResult?.calories_per_100ml || scanResult?.estimated_calories || 42
    const curCal=isDrink ? Math.round(baseDrinkCal * portion / 100) : Math.round((scanResult?.estimated_calories||560)*portion/100)
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('scanResult')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><div className="flex-1 text-center pr-9"><div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-0.5 rounded-full inline-block border border-[#C6ED6A]/30">PORTION ADJUSTMENT</div><h2 className="text-[16px] font-black tracking-tight mt-1.5">Adjust portion size</h2><p className="text-[11px] text-[#9C9082] font-medium">How much did you eat?</p></div></div>
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="relative w-[220px] h-[220px]">
              <svg className="w-full h-full -rotate-90"><circle cx="110" cy="110" r="92" stroke="#F5EBDD" strokeWidth="16" fill="none"/><motion.circle cx="110" cy="110" r="92" stroke="#8ED500" strokeWidth="16" fill="none" strokeDasharray={`${2*Math.PI*92}`} initial={{strokeDashoffset: 2*Math.PI*92}} animate={{strokeDashoffset: 2*Math.PI*92*(1-portion/100)}} transition={{type:"spring", stiffness:120, damping:20}} strokeLinecap="round"/></svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[40px] font-black tracking-tight">{portion}{isDrink?'ml':'%'}</span><span className="text-[11px] text-[#9C9082] font-bold">{isDrink?'drink amount':'of plate'}</span></div>
            </div>
            <div className="mt-7 text-[13px] text-[#3C342B] font-bold">{isDrink ? `${baseDrinkCal} kcal / 100ml` : `${scanResult?.estimated_calories||560} kcal`} → <span className="text-[#8ED500]">{curCal} kcal</span></div>
            <div className="w-full mt-8 relative">
              <input type="range" min={isDrink?50:10} max={isDrink?1000:200} step={isDrink?50:5} value={portion} onChange={e=>setPortion(Number(e.target.value))} className="w-full accent-[#8ED500] h-2 bg-[#F5EBDD] rounded-full appearance-none cursor-pointer"/>
              <div className="flex justify-between w-full text-[10px] text-[#9C9082] mt-2 font-bold px-1"><span>{isDrink?'50ml':'10%'}</span><span>{isDrink?'500ml':'100%'}</span><span>{isDrink?'1000ml':'200%'}</span></div>
            </div>
            <div className="flex gap-2 mt-7 flex-wrap justify-center">{(isDrink?[100,250,330,500]:[50,80,100,150]).map(v=><button key={v} onClick={()=>setPortion(v)} className={`px-5 py-2.5 rounded-full text-[12px] font-bold border-[1.5px] transition ${portion===v?'bg-black text-white border-black shadow-md':'bg-white border-[#F0E6D8]'}`}>{isDrink?`${v}ml`:v===50?'½ Plate':v===80?'0.8 Plate':v===100?'1 Plate':'1.5 Plate'}</button>)}</div>
          </div>
          <div className="flex gap-3 mt-auto"><button onClick={()=>setScreen('scanResult')} className="flex-1 h-12 rounded-full border-[1.5px] border-[#E2D9CA] bg-white font-bold text-[13px]">Cancel</button><button onClick={()=>{unlockAchievement('portion_master'); setScreen('scanResult')}} className="flex-1 h-12 rounded-full bg-[#C6ED6A] font-black text-[14px] shadow-[0_4px_0_#AED64D]">Confirm</button></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='dailyDiary'){
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('home')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><div className="flex-1 text-center pr-9"><div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-0.5 rounded-full inline-block border border-[#C6ED6A]/30">DAILY DIARY</div><h2 className="text-[14px] font-black tracking-tight mt-1">{todayDate}</h2></div><div className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><Settings2 className="w-4 h-4"/></div></div>
          <div className="mt-4 bg-white rounded-[18px] border border-[#F0E6D8] p-3.5 grid grid-cols-4 gap-2 text-center text-[10px] shadow-sm"><div><div className="font-black text-[12px]">{totals.calories} / {profile.dailyCalories}</div><div className="text-[#9C9082] font-medium">Calories</div></div><div><div className="font-black text-[12px]">{totals.protein} / {Math.round(profile.dailyCalories*0.28/4)}g</div><div className="text-[#9C9082] font-medium">Protein</div></div><div><div className="font-black text-[12px]">{totals.carbs} / {Math.round(profile.dailyCalories*0.45/4)}g</div><div className="text-[#9C9082] font-medium">Carbs</div></div><div><div className="font-black text-[12px]">{totals.fat} / {Math.round(profile.dailyCalories*0.26/9)}g</div><div className="text-[#9C9082] font-medium">Fat</div></div></div>
          <div className="mt-5 space-y-3">{(['Breakfast','Lunch','Snack','Dinner'] as MealType[]).map(meal=>{const items=todayDiary.filter(d=>d.meal===meal); return <div key={meal} className="bg-white rounded-[18px] border border-[#F0E6D8] p-3.5 shadow-sm"><div className="flex justify-between items-center mb-2.5"><span className="text-[12px] font-black tracking-tight">{meal}</span><span className="text-[11px] text-[#9C9082] font-bold">{items.reduce((s,i)=>s+i.calories,0)} kcal</span></div>{items.length? items.map(it=><div key={it.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-[#F5EBDD]"><div className="w-11 h-11 rounded-full bg-[#FFFBF2] overflow-hidden flex items-center justify-center border border-[#F5E9D9] shadow-sm">{it.image?<img src={it.image} className="w-full h-full object-cover"/>:'🍛'}</div><div className="flex-1"><div className="text-[13px] font-bold tracking-tight">{it.name}</div><div className="text-[11px] text-[#9C9082] font-medium">{it.time}</div></div><div className="text-[11px] font-black">{it.calories} kcal</div><button onClick={()=>setDiary(d=>d.filter(x=>x.id!==it.id))} className="w-7 h-7 rounded-full bg-[#FFF5F5] border border-[#FFE0E0] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-[#FF5A5A]"/></button></div>): <button onClick={()=>setScreen('foodSearch')} className="w-full py-3.5 border-[1.5px] border-dashed border-[#E2D9CA] rounded-[12px] text-[11px] text-[#9C9082] font-bold flex items-center justify-center gap-1.5 hover:bg-[#FFFBF2] transition"><Plus className="w-3.5 h-3.5"/> Add your {meal.toLowerCase()}</button>}</div>})}</div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-6"><BottomNav active="dailyDiary"/></div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='foodSearch'){
    const foods = FOOD_LIBRARY
      .filter(f=> foodTab==='All' ? true : f.category===foodTab)
      .filter(f=>f.name.toLowerCase().includes(searchQuery.toLowerCase()) || (f.brand||'').toLowerCase().includes(searchQuery.toLowerCase()))
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">FOOD SEARCH</div><div className="ml-auto flex gap-2"><button onClick={()=>setScreen('barcodeScanner')} className="w-8 h-8 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ScanLine className="w-4 h-4"/></button><button onClick={()=>setScreen('home')} className="w-8 h-8 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button></div></div>
          <div className="mt-4 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search for food" className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-[#F0E6D8] text-[13px] font-medium outline-none shadow-sm focus:border-black transition"/></div>
          <div className="mt-3 flex gap-2 text-[10px] font-bold overflow-x-auto no-scrollbar">{(['All','My Foods','Meals','Brands'] as const).map(t=><button key={t} onClick={()=>setFoodTab(t)} className={`px-4 py-2 rounded-full border-[1.5px] tracking-tight shrink-0 ${foodTab===t?'bg-black text-white border-black':'bg-white border-[#F0E6D8]'}`}>{t}</button>)}</div>
          <div className="mt-5 overflow-y-auto no-scrollbar pb-4"><div className="text-[11px] font-black tracking-widest opacity-40 mb-3">{foodTab==='All'?'Popular Searches':foodTab}</div><div className="space-y-2.5">{foods.map(f=><button key={f.name} onClick={()=>{ setSelectedFood(f); setScanResult({food_name:f.name, estimated_calories:f.calories, protein_g:f.protein, carbs_g:f.carbs, fat_g:f.fat, confidence:99}); setScanImage(null); setScreen('foodDetails')}} className="w-full flex items-center justify-between p-3.5 rounded-[18px] bg-white border border-[#F0E6D8] text-left hover:shadow-md hover:border-black/10 transition shadow-sm"><div className="flex items-center gap-3.5"><span className="text-[22px] w-12 h-12 rounded-full bg-[#FFFBF2] border border-[#F5E9D9] flex items-center justify-center">{f.icon}</span><div><div className="text-[14px] font-black tracking-tight">{f.name}</div><div className="text-[12px] text-[#8A7E71] font-medium">{f.calories} kcal / {f.serving}{f.brand?` • ${f.brand}`:''}</div></div></div><ChevronRight className="w-4 h-4 opacity-25"/></button>)}</div>{foods.length===0 && <div className="text-center text-[12px] text-[#9C9082] font-bold py-12">No foods found</div>}</div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-4"><BottomNav active="foodSearch"/></div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='barcodeScanner'){
    return (
      <PhoneShell noPad>
        <div className="relative w-full h-[840px] bg-black rounded-[32px] overflow-hidden">
          <div className="absolute inset-0">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            {cameraError && <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center px-8"><ScanLine className="w-14 h-14 text-white/80 mb-4"/><p className="text-white font-bold text-[15px]">Camera access needed</p><p className="text-white/60 text-[12px] mt-2 leading-[1.4]">{cameraError}</p></div>}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75"/>
          </div>
          <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-20"><button onClick={()=>setScreen('foodScanner')} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/20"><X className="w-4 h-4"/></button><div className="text-white text-[9px] font-black tracking-widest bg-white/15 backdrop-blur px-3 py-1 rounded-full border border-white/20">BARCODE SCANNER</div><button onClick={()=>setScreen('foodScanner')} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/20"><Camera className="w-4 h-4"/></button></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><div className="w-[280px] h-[180px] relative border-2 border-white/85 rounded-[16px] shadow-[0_0_40px_rgba(255,255,255,0.14)]"><div className="absolute -top-2 -left-2 w-7 h-7 border-l-[3px] border-t-[3px] border-white rounded-tl-[8px]"/><div className="absolute -top-2 -right-2 w-7 h-7 border-r-[3px] border-t-[3px] border-white rounded-tr-[8px]"/><div className="absolute -bottom-2 -left-2 w-7 h-7 border-l-[3px] border-b-[3px] border-white rounded-bl-[8px]"/><div className="absolute -bottom-2 -right-2 w-7 h-7 border-r-[3px] border-b-[3px] border-white rounded-br-[8px]"/><motion.div initial={{top:'12%'}} animate={{top:'88%'}} transition={{duration:1.6, repeat:Infinity, ease:'easeInOut'}} className="absolute left-0 right-0 h-[2px] bg-[#FF3B30] shadow-[0_0_12px_#FF3B30]"/></div><p className="text-white/80 text-[12px] mt-8 font-medium tracking-wide">Center barcode inside the frame</p></div>
          {barcodeError && <div className="absolute left-5 right-5 bottom-40 z-20 bg-black/60 backdrop-blur-md border border-white/15 rounded-[16px] p-3 text-white text-center text-[12px] font-bold">{barcodeError}</div>}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <div className="flex gap-2 mb-3"><input value={manualBarcode} onChange={e=>setManualBarcode(e.target.value)} placeholder="Enter barcode number" inputMode="numeric" className="flex-1 h-11 rounded-full bg-white/95 px-4 text-[13px] font-bold outline-none"/><button onClick={()=>lookupBarcode(manualBarcode)} className="px-4 h-11 rounded-full bg-[#C6ED6A] text-black font-black text-[12px]">Find</button></div>
            <button onClick={scanBarcodeFromCamera} disabled={barcodeLoading} className="w-full h-[54px] rounded-full bg-white text-black font-black text-[14px] shadow-[0_0_0_5px_rgba(255,255,255,0.16)] active:scale-[.98] transition">{barcodeLoading?'Searching OpenFoodFacts...':'Scan barcode'}</button>
          </div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='foodDetails'){
    const f = selectedFood
    const addManualFood = ()=>{
      const key = todayKey()
      const entry: DiaryEntry = {
        id: Date.now().toString(),
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        meal: selectedMeal,
        time: new Date().toLocaleTimeString([],{hour:'numeric', minute:'2-digit'}),
        date: key,
      }
      setDiary(d=>[...d, entry])
      unlockAchievement('first_log')
      setLogDates(prev=>Array.from(new Set([...prev, key])))
      setScreen('home')
    }
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex justify-between items-center pt-1"><button onClick={()=>setScreen('foodSearch')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">FOOD DETAILS</div><button className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><Heart className="w-4 h-4"/></button></div>
          <div className="mt-7 flex gap-4 items-center"><div className="w-[72px] h-[72px] rounded-[18px] bg-white border border-[#F0E6D8] flex items-center justify-center text-[34px] shadow-sm">{f.icon}</div><div><div className="text-[13px] font-bold tracking-tight">{f.name}</div><div className="text-[22px] font-black tracking-tight">{f.calories} <span className="text-[13px] font-bold">kcal</span></div><div className="text-[10px] text-[#9C9082] font-medium">Per {f.serving}{f.brand?` • ${f.brand}`:''}</div></div></div>
          <div className="mt-4 bg-white border border-[#F0E6D8] rounded-[16px] p-3.5 shadow-sm">
            <div className="text-[11px] text-[#9C9082] font-black tracking-widest mb-2">ADD TO MEAL</div>
            <div className="grid grid-cols-4 gap-2">{(['Breakfast','Lunch','Dinner','Snack'] as MealType[]).map(meal=><button key={meal} onClick={()=>setSelectedMeal(meal)} className={`h-[56px] rounded-[14px] border-[1.5px] flex flex-col items-center justify-center gap-1 transition ${selectedMeal===meal?'bg-[#EAF6C9] border-[#C6ED6A]':'bg-[#FFFBF2] border-[#F0E6D8]'}`}><span className="text-[16px]">{meal==='Breakfast'?'🥣':meal==='Lunch'?'🍛':meal==='Dinner'?'🍽️':'🍎'}</span><span className="text-[9px] font-black">{meal}</span></button>)}</div>
          </div>
          <div className="mt-5 bg-white rounded-[18px] border border-[#F0E6D8] divide-y divide-[#F5EBDD] overflow-hidden shadow-sm"><div className="flex justify-between p-4 text-[13px]"><span className="text-[#9C9082] font-medium">Protein</span><span className="font-black">{f.protein} g</span></div><div className="flex justify-between p-4 text-[13px]"><span className="text-[#9C9082] font-medium">Carbs</span><span className="font-black">{f.carbs} g</span></div><div className="flex justify-between p-4 text-[13px]"><span className="text-[#9C9082] font-medium">Fat</span><span className="font-black">{f.fat} g</span></div><div className="flex justify-between p-4 text-[13px]"><span className="text-[#9C9082] font-medium">Category</span><span className="font-black">{f.category}</span></div></div>
          <div className="mt-5 text-[12px] bg-[#FFFBF2] rounded-[14px] border border-[#F5E9D9] p-4"><div className="font-black text-[12px] mb-1.5 tracking-tight">Ingredients</div><div className="text-[#8A7E71] font-medium leading-[1.4]">{f.ingredients || 'Nutrition estimate from PlatePal food library.'}</div></div>
          <div className="mt-auto pt-6"><button onClick={addManualFood} className="w-full h-[52px] rounded-full bg-[#FFDE7A] font-black text-[14px] shadow-[0_5px_0_#D9B94A] active:translate-y-[3px] active:shadow-[0_2px_0_#D9B94A] transition">Add to {selectedMeal}</button></div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='progressWeight'){
    const chartStart = new Date()
    const chartEnd = plan.mode==='maintain' ? addDays(chartStart, 30) : plan.date
    const chartMid1 = addDays(chartStart, Math.round((plan.days || 30) / 3))
    const chartMid2 = addDays(chartStart, Math.round(((plan.days || 30) * 2) / 3))
    const startW = profile.weight
    const endW = profile.targetWeight
    const highW = Math.ceil(Math.max(startW,endW)+2)
    const lowW = Math.floor(Math.min(startW,endW)-2)
    const directionPoints = plan.mode==='gain'
      ? "10,134 60,110 110,96 160,72 210,48 260,20"
      : plan.mode==='maintain'
        ? "10,82 60,80 110,84 160,81 210,83 260,80"
        : "10,20 60,42 110,72 160,92 210,108 260,134"
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('home')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><div className="flex-1 flex items-center gap-2"><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">WEIGHT PROGRESS</span><h2 className="font-black text-[14px] tracking-tight ml-2">Weight</h2></div><div className="text-[11px] font-bold flex items-center gap-1 bg-white border border-[#F0E6D8] px-2.5 py-1 rounded-full shadow-sm">Goal {shortDate(chartEnd)} <ChevronRight className="w-3 h-3"/></div></div>
          <div className="mt-6 flex justify-between items-end"><div><div className="text-[30px] font-black tracking-tight">{profile.weight.toFixed(1)} <span className="text-[15px]">kg</span></div><div className="text-[11px] text-[#5A9A00] font-bold mt-1 flex items-center gap-1"><span className="bg-[#EAF6C9] rounded-full px-1.5">→</span> Target {profile.targetWeight} kg</div></div></div>
          <div className="mt-6 bg-white rounded-[30px] border border-[#F0E6D8] p-5 h-[320px] relative shadow-[0_12px_32px_rgba(80,60,30,0.08)] overflow-hidden">
            <div className="text-center text-[12px] font-black tracking-[0.18em] text-[#7B6B62]">YOU WILL REACH</div>
            <div className="text-center mt-0.5 text-[28px] font-black tracking-tight leading-tight"><span className="text-[#FF6733]">{profile.targetWeight} kg</span> <span className="text-[#6B5B53]">by</span> <span className="text-[#FF6733]">{shortDate(chartEnd)}</span></div>
            <svg viewBox="0 0 300 150" preserveAspectRatio="none" className="absolute left-5 right-5 bottom-12 w-[calc(100%-40px)] h-[150px]">
              <defs><linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6733" stopOpacity="0.22"/><stop offset="100%" stopColor="#FF6733" stopOpacity="0"/></linearGradient></defs>
              <motion.path d={plan.mode==='gain' ? 'M 0 130 C 70 122, 100 90, 145 70 S 235 20, 300 16' : plan.mode==='maintain' ? 'M 0 78 C 65 72, 105 88, 155 78 S 240 75, 300 80' : 'M 0 18 C 70 18, 105 55, 145 85 S 235 137, 300 138'} fill="none" stroke="#FF6733" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.25, ease:'easeInOut'}}/>
              <motion.path d={plan.mode==='gain' ? 'M 0 130 C 70 122, 100 90, 145 70 S 235 20, 300 16 L 300 150 L 0 150 Z' : plan.mode==='maintain' ? 'M 0 78 C 65 72, 105 88, 155 78 S 240 75, 300 80 L 300 150 L 0 150 Z' : 'M 0 18 C 70 18, 105 55, 145 85 S 235 137, 300 138 L 300 150 L 0 150 Z'} fill="url(#goalFill)" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.55,duration:.8}}/>
              <circle cx="0" cy={plan.mode==='gain'?130:plan.mode==='maintain'?78:18} r="7" fill="#6B5B53" stroke="white" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
              <motion.circle cx="300" cy={plan.mode==='gain'?16:plan.mode==='maintain'?80:138} r="7" fill="#FF6733" stroke="white" strokeWidth="4" vectorEffect="non-scaling-stroke" initial={{scale:0}} animate={{scale:1}} transition={{delay:1.1,type:'spring'}}/>
            </svg>
            <div className="absolute left-5 right-5 bottom-5 flex justify-between text-[11px] font-black tracking-[0.1em] text-[#6B5B53]"><span>TODAY · {profile.weight.toFixed(0)}KG</span><span>{shortDate(chartEnd).toUpperCase()} · {profile.targetWeight}KG</span></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3.5 shadow-sm"><div className="text-[10px] text-[#9C9082] font-bold tracking-wide">Current</div><div className="font-black text-[13px] mt-1">{profile.weight.toFixed(1)} kg</div></div><div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3.5 shadow-sm"><div className="text-[10px] text-[#9C9082] font-bold tracking-wide">BMI</div><div className="font-black text-[13px] mt-1">{bmi}</div></div><div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3.5 shadow-sm"><div className="text-[10px] text-[#9C9082] font-bold tracking-wide">Goal</div><div className="font-black text-[13px] mt-1">{profile.targetWeight} kg</div></div></div>
          <div className="mt-4 bg-[#FFF8EC] text-[#1A1A1A] rounded-[20px] p-4 border border-[#F7E9D1] shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black tracking-widest text-[#9C9082]">TDEE TARGET PLAN</div>
                <div className="text-[20px] font-black mt-1 tracking-tight">{plan.mode==='maintain' ? 'At target' : plan.dateText}</div>
                <div className="text-[11px] text-[#8A7E71] mt-1 leading-[1.35]">{plan.mode==='loss' ? `Lose ${plan.kg.toFixed(1)} kg in about ${plan.weeks} weeks.` : plan.mode==='gain' ? `Gain ${plan.kg.toFixed(1)} kg in about ${plan.weeks} weeks.` : plan.message}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#C6ED6A] text-black flex items-center justify-center shrink-0 shadow-[0_0_0_5px_rgba(198,237,106,0.18)]"><Target className="w-6 h-6"/></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-white border border-[#F0E6D8] rounded-[12px] p-2.5"><div className="text-[9px] text-[#9C9082] font-bold">Maintain</div><div className="text-[13px] font-black">{maintenanceCalories}</div></div>
              <div className="bg-[#C6ED6A] text-black rounded-[12px] p-2.5"><div className="text-[9px] opacity-60 font-black">Target/day</div><div className="text-[13px] font-black">{plan.targetCalories}</div></div>
              <div className="bg-white border border-[#F0E6D8] rounded-[12px] p-2.5"><div className="text-[9px] text-[#9C9082] font-bold">Rate</div><div className="text-[13px] font-black">{plan.weeklyRate || 0}kg/wk</div></div>
            </div>
            <div className="mt-3 text-[10px] text-[#8A7E71] font-medium leading-[1.35]">{plan.mode==='loss' ? 'Uses a 500 kcal/day deficit from your TDEE, targeting ~0.5 kg/week.' : plan.message}</div>
            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-[#C6ED6A]/25 rounded-full blur-[12px]"/>
          </div>
          <button onClick={()=>setScreen('progressNutrition')} className="mt-5 h-11 rounded-full bg-[#C6ED6A] font-black text-[12px] shadow-[0_3px_0_#AED64D]">Nutrition Progress</button>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-6"><BottomNav active="dailyDiary"/></div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='progressNutrition'){
    const metric = nutritionMetric
    const metricConfig = {
      Calories: {goal: profile.dailyCalories, max: weeklyNutrition.maxCal, key:'calories' as const, unit:'kcal', color:'#8ED500', dark:'#1A1A1A'},
      Protein: {goal: weeklyNutrition.proteinGoal, max: weeklyNutrition.maxProtein, key:'protein' as const, unit:'g', color:'#1A1A1A', dark:'#8ED500'},
      Carbs: {goal: weeklyNutrition.carbsGoal, max: weeklyNutrition.maxCarbs, key:'carbs' as const, unit:'g', color:'#FFDE7A', dark:'#D6A800'},
      Fat: {goal: weeklyNutrition.fatGoal, max: weeklyNutrition.maxFat, key:'fat' as const, unit:'g', color:'#FF8A2E', dark:'#C45A0B'},
    }[metric]
    const todayMetric = weeklyNutrition.days.find(d=>d.key===todayKey())?.[metricConfig.key] || 0
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('home')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">NUTRITION PROGRESS</span></div>
          <div className="flex gap-2 text-[10px] font-bold mt-4">{(['Calories','Protein','Carbs','Fat'] as const).map(t=><button key={t} onClick={()=>setNutritionMetric(t)} className={`px-3.5 py-2 rounded-full border-[1.5px] tracking-tight ${metric===t?'bg-black text-white border-black shadow-md':'bg-white border-[#F0E6D8]'}`}>{t}</button>)}</div>
          <div className="mt-4 bg-white rounded-[18px] border border-[#F0E6D8] p-4 shadow-sm"><div className="text-[11px] text-[#9C9082] font-bold tracking-wide">{metric} Today</div><div className="flex justify-between items-end mt-1"><div className="text-[22px] font-black tracking-tight">{todayMetric} {metricConfig.unit}</div><div className="text-[10px] text-[#9C9082] font-bold bg-[#F5EBDD] px-2 py-1 rounded-full">Goal: {metricConfig.goal} {metricConfig.unit}</div></div></div>
          <div className="mt-4 bg-white rounded-[18px] border border-[#F0E6D8] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3"><div className="text-[12px] font-black">Weekly {metric}</div><div className="text-[10px] text-[#9C9082] font-bold">Goal {metricConfig.goal}{metricConfig.unit}/day</div></div>
            <div className="h-[160px] flex items-end justify-between gap-2.5">
              {weeklyNutrition.days.map((d,i)=>{ const v = d[metricConfig.key]; return <div key={d.key} className="flex-1 flex flex-col items-center gap-2"><motion.div initial={{height:0}} animate={{height:Math.max(4,(v/metricConfig.max)*135)}} transition={{delay:i*0.04, type:'spring'}} className="w-full rounded-t-[8px] shadow-sm" style={{background:d.key===todayKey()?metricConfig.dark:metricConfig.color}}/><span className="text-[9px] text-[#9C9082] font-bold">{d.label}</span><span className="text-[8px] text-[#9C9082] font-bold">{v}</span></div>})}
            </div>
          </div>
          <button onClick={()=>setScreen('progressWeight')} className="mt-5 h-11 rounded-full bg-[#C6ED6A] font-black text-[12px] shadow-[0_3px_0_#AED64D]">Weight Progress</button>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-6"><BottomNav active="dailyDiary"/></div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='recipes'){
    const filteredRecipes = RECIPE_DATA.filter(r=> recipeCategory==='All' || r.category===recipeCategory).filter(r=>!searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="relative mt-1"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Find healthy recipes" className="w-full h-11 pl-11 pr-4 rounded-full bg-white border border-[#F0E6D8] text-[13px] font-medium shadow-sm"/><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">RECIPES</span></div>
          <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-1">{[
            {l:'All', i:'🍽️'},{l:'High-Protein', i:'💪'},{l:'Low Calorie', i:'🥗'},{l:'Quick', i:'⏱️'},{l:'Veg', i:'🥬'},{l:'Balanced', i:'⚖️'}
          ].map(f=><button key={f.l} onClick={()=>setRecipeCategory(f.l as any)} className="shrink-0 flex flex-col items-center gap-1.5"><div className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-sm text-[18px] ${recipeCategory===f.l?'bg-[#C6ED6A] border-[#AED64D]':'bg-white border-[#F0E6D8]'}`}>{f.i}</div><span className="text-[10px] font-bold tracking-tight">{f.l}</span></button>)}</div>
          <div className="mt-5 flex items-center justify-between"><div className="text-[13px] font-black tracking-tight">{recipeCategory==='All'?'All Recipes':recipeCategory}</div><div className="text-[10px] text-[#9C9082] font-black">{filteredRecipes.length} recipes</div></div>
          <div className="mt-3 flex-1 overflow-y-auto no-scrollbar pr-1 space-y-2.5 pb-4">
            {filteredRecipes.map((r)=><button key={r.name} onClick={()=>{setSelectedRecipe(r); setScreen('recipeDetail')}} className="w-full bg-white rounded-[18px] border border-[#F0E6D8] p-3 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition">
              <div className="w-[62px] h-[62px] rounded-full bg-[#FFF7E8] border-[4px] border-[#FFF1D2] shrink-0 shadow-sm flex items-center justify-center text-[30px]">{recipeIcon(r.name)}</div>
              <div className="flex-1 min-w-0"><div className="text-[13px] font-black tracking-tight truncate">{r.name}</div><div className="text-[10px] text-[#9C9082] font-bold mt-0.5">{r.category} • {r.min} min</div><div className="flex gap-2 mt-1.5 text-[9px] font-black"><span className="px-2 py-0.5 rounded-full bg-[#EAF6C9]">{r.kcal} kcal</span><span className="px-2 py-0.5 rounded-full bg-[#F5EBDD]">{r.protein}g protein</span></div></div>
              <ChevronRight className="w-4 h-4 opacity-20"/>
            </button>)}
          </div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-3"><BottomNav active="recipes"/></div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='recipeDetail'){
    const r = selectedRecipe
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('recipes')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">RECIPE DETAIL</span></div>
          <div className="mt-6 flex items-center gap-5"><div className="w-[120px] h-[120px] rounded-full bg-[#FFF7E8] border-[8px] border-[#FFF1D2] shadow-[0_12px_28px_rgba(0,0,0,0.12)] shrink-0 flex items-center justify-center text-[58px]">{recipeIcon(r.name)}</div><div><h2 className="font-black text-[20px] tracking-tight leading-[1.1]">{r.name}</h2><div className="mt-2 text-[11px] text-[#9C9082] font-bold">{r.category} • {r.min} min</div><div className="mt-3 inline-flex px-3 py-1 rounded-full bg-[#C6ED6A] text-black text-[12px] font-black">{r.kcal} kcal</div></div></div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px]"><div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3 shadow-sm"><div className="font-black text-[15px]">{r.protein}g</div><div className="text-[#9C9082] font-bold">Protein</div></div><div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3 shadow-sm"><div className="font-black text-[15px]">{r.carbs}g</div><div className="text-[#9C9082] font-bold">Carbs</div></div><div className="bg-white border border-[#F0E6D8] rounded-[14px] p-3 shadow-sm"><div className="font-black text-[15px]">{r.fat}g</div><div className="text-[#9C9082] font-bold">Fat</div></div></div>
          <div className="mt-5 text-[12px] bg-white rounded-[16px] border border-[#F0E6D8] p-4 shadow-sm"><div className="font-black mb-2 tracking-tight">Ingredients</div><ul className="text-[#6B6054] list-disc pl-4 space-y-1 font-medium">{r.ingredients.map(i=><li key={i}>{i}</li>)}</ul></div>
          <div className="mt-3 text-[12px] bg-[#FFF8EC] rounded-[16px] border border-[#F7E9D1] p-4 shadow-sm"><div className="font-black mb-2 tracking-tight">How to prepare</div><ol className="text-[#6B6054] list-decimal pl-4 space-y-1.5 font-medium">{r.steps.map(s=><li key={s}>{s}</li>)}</ol></div>
          <button onClick={()=>{ const key=todayKey(); setDiary(d=>[...d,{id:Date.now().toString(), name:r.name, calories:r.kcal, protein:r.protein, carbs:r.carbs, fat:r.fat, meal:selectedMeal, time:new Date().toLocaleTimeString([],{hour:'numeric', minute:'2-digit'}), date:key}]); unlockAchievement('first_log'); unlockAchievement('recipe_added'); setLogDates(prev=>Array.from(new Set([...prev,key]))); setScreen('home')}} className="mt-auto w-full h-[52px] rounded-full bg-[#C6ED6A] font-black text-[14px] shadow-[0_5px_0_#AED64D] active:shadow-[0_2px_0_#AED64D] active:translate-y-[3px] transition">Add to {selectedMeal}</button>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='waterTracker'){
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2 items-center">
          <div className="w-full flex justify-between items-center pt-1"><button onClick={()=>setScreen('home')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><div className="text-[13px] font-black tracking-tight">Today</div><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">WATER TRACKER</span><button className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><Settings2 className="w-4 h-4"/></button></div>
          <div className="mt-14 relative w-[120px] h-[240px] rounded-[28px] border-[3px] border-black overflow-hidden bg-white flex flex-col justify-end shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
            <div className="absolute top-0 left-0 right-0 h-7 bg-black rounded-t-[22px] flex items-center justify-center"><div className="w-14 h-2.5 bg-[#222] rounded-full border border-white/20 shadow-inner"/></div>
            <motion.div animate={{height:`${water/8*100}%`}} transition={{type:"spring", stiffness:120, damping:20}} className="bg-gradient-to-b from-[#7CC4FF] to-[#3A8DFF] w-full relative overflow-hidden">
              <motion.div animate={{x:[-10,10,-10]}} transition={{duration:3, repeat:Infinity, ease:"easeInOut"}} className="absolute top-0 left-0 right-0 h-[12px] bg-white/30 rounded-full blur-[1px]" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none"><GlassWater className="w-20 h-20"/></div>
          </div>
          <div className="mt-10 flex items-center gap-7"><button onClick={()=>setWater(w=>Math.max(0,w-1))} className="w-11 h-11 rounded-full border-[1.5px] border-[#E2D9CA] bg-white flex items-center justify-center shadow-sm active:scale-95 transition"><Minus className="w-5 h-5"/></button><div className="text-center"><div className="text-[28px] font-black tracking-tight">{water} / 8</div><div className="text-[11px] text-[#9C9082] font-bold tracking-wide">glasses</div></div><button onClick={()=>setWater(w=>Math.min(8,w+1))} className="w-11 h-11 rounded-full border-[1.5px] border-[#E2D9CA] bg-white flex items-center justify-center shadow-sm active:scale-95 transition"><Plus className="w-5 h-5"/></button></div>
          <div className="mt-7 text-[13px] font-black tracking-tight text-[#3A8DFF] flex items-center gap-2 bg-[#EAF2FF] px-4 py-2 rounded-full border border-[#D6E6FF]">Nice! Keep it up <span className="text-[16px]">💧</span></div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-10"><BottomNav active="home"/><ScreenDebugBar/></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='aiCoach'){
    const coachQuestions = [
      'What should be my meal plan today? Balanced diet',
      'Make my today meal plan high protein',
      'Make my today meal plan keto friendly',
      'What can I eat with my remaining calories?'
    ]
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('profile')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">AI COACH</span><div className="flex items-center gap-2.5 ml-1"><div className="w-8 h-8 rounded-full bg-[#FFE7D0] flex items-center justify-center border border-[#FFD0A8] shadow-sm">👩‍⚕️</div><div><div className="text-[13px] font-black tracking-tight">PlatePal Coach</div><div className="text-[10px] text-[#2ECC71] font-bold">• Online</div></div></div><button onClick={()=>setScreen('home')} className="ml-auto w-8 h-8 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><X className="w-4 h-4"/></button></div>
          <div className="mt-6 space-y-3.5 flex-1 overflow-y-auto no-scrollbar pb-4">
            <div className="bg-white rounded-[18px] rounded-tl-[6px] border border-[#F0E6D8] p-3.5 max-w-[90%] text-[13px] shadow-sm"><div className="font-bold">Today’s personalized coach</div><div className="text-[#6B6054] mt-1 font-medium leading-[1.4]">I’ll use your profile, target calories, BMI/TDEE and today’s diary to plan meals.</div></div>
            <div className="grid grid-cols-1 gap-2 mt-3">{coachQuestions.map(q=><button key={q} onClick={()=>sendCoachMessage(q)} className="text-left px-3.5 py-3 rounded-[16px] border border-[#F0E6D8] bg-white text-[12px] font-bold tracking-tight shadow-sm hover:bg-[#F7FFE8] transition">{q}</button>)}</div>
            {aiMessages.map((m,i)=><div key={i} className={`${m.role==='user'?'bg-[#1A1A1A] text-white rounded-tr-[6px] ml-auto':'bg-white border border-[#F0E6D8] rounded-tl-[6px]'} rounded-[18px] p-3.5 max-w-[84%] text-[13px] shadow-sm font-medium leading-[1.4]`}>{m.text}</div>)}
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2"><button onClick={()=>setScreen('profile')} className="h-10 rounded-full bg-[#C6ED6A] border border-[#AED64D] text-[11px] font-black shadow-sm">Back</button><button onClick={()=>setAiMessages([])} className="h-10 rounded-full bg-white border border-[#F0E6D8] text-[11px] font-black shadow-sm">Clear chat</button></div>
          <div className="mt-3"><BottomNav active="profile"/></div>
          <ScreenDebugBar/>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='achievements'){
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">ACHIEVEMENTS</span><h2 className="font-black text-[15px] ml-2 tracking-tight">Your Achievements</h2></div>
          <div className="mt-4 bg-white rounded-[16px] border border-[#F0E6D8] p-3 flex items-center justify-between shadow-sm"><div><div className="text-[12px] font-black">{achievements.length} / {ACHIEVEMENTS.length} unlocked</div><div className="text-[10px] text-[#9C9082] font-bold">Keep logging to collect them all</div></div><Crown className="w-5 h-5 text-[#FFB800]"/></div>
          <div className="mt-4 grid grid-cols-2 gap-3.5 overflow-y-auto no-scrollbar pb-24 pr-1">{ACHIEVEMENTS.map((a,i)=>{
            const unlocked = achievements.includes(a.id)
            return <motion.div key={a.id} initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} transition={{delay:i*0.06}} className={`border rounded-[18px] p-4 flex flex-col items-center text-center shadow-sm transition ${unlocked?'bg-white border-[#C6ED6A]':'bg-[#F4EBDD] border-[#E5D8C8] opacity-60 grayscale'}`}><div className="w-14 h-14 rounded-full border border-[#F5E9D9] flex items-center justify-center text-[26px] shadow-sm" style={{background: unlocked ? a.color : '#FFFBF2'}}>{unlocked ? a.icon : '🔒'}</div><div className="text-[12px] font-black mt-2.5 tracking-tight">{a.title}</div><div className="text-[9px] text-[#9C9082] font-medium mt-0.5 leading-[1.25]">{unlocked ? a.description : 'Locked'}</div></motion.div>
          })}</div>
          <div className="mt-5"><button onClick={()=>setScreen('profile')} className="w-full h-11 rounded-full bg-white border border-[#F0E6D8] font-black text-[12px] shadow-sm">Back to Profile</button></div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-6"><BottomNav active="profile"/><ScreenDebugBar/></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='profile'){
    const weightGap = +(profile.weight - profile.targetWeight).toFixed(1)
    const progressPct = Math.min(100, Math.max(0, profile.targetWeight < profile.weight ? ((Math.max(0, 10 - Math.abs(weightGap)) / 10) * 100) : 50))
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex justify-between items-center pt-1"><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">PROFILE</span><h2 className="font-black text-[15px] tracking-tight">My Health</h2><button onClick={()=>setScreen('settings')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><Settings2 className="w-4 h-4"/></button></div>
          <div className="mt-5 bg-[#1A1A1A] rounded-[28px] p-5 text-white shadow-[0_16px_34px_rgba(0,0,0,0.22)] relative overflow-hidden"><div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#C6ED6A]/25 blur-[6px]"/><div className="absolute -left-8 -bottom-10 w-28 h-28 rounded-full bg-[#FFDE7A]/15 blur-[8px]"/><div className="relative z-10 flex items-center gap-4"><div className="relative"><div className="w-[82px] h-[82px] rounded-[26px] bg-gradient-to-br from-[#FFE8C8] to-[#FFC98B] flex items-center justify-center text-[40px] border-2 border-white/20 shadow-xl">{profile.gender==='Male'?'👨':'👩'}</div><div className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-[#C6ED6A] text-black flex items-center justify-center border-2 border-[#1A1A1A]"><Crown className="w-4 h-4"/></div></div><div className="flex-1"><div className="text-[19px] font-black tracking-tight">PlatePal User</div><div className="text-[11px] text-white/60 font-bold mt-1">{profile.gender || 'User'} • {profile.age} years • {profile.activity}</div><div className="mt-3 flex gap-2 flex-wrap"><span className="px-2.5 py-1 rounded-full bg-[#C6ED6A] text-black text-[10px] font-black">BMI {bmi} · {bmiInfo.label}</span><span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-[10px] font-black">{profile.goal}</span></div></div><button onClick={()=>{ setSetupStep(0); setScreen('setup')}} className="px-3 py-2 rounded-full bg-white text-black text-[11px] font-black tracking-tight shadow-sm">Edit</button></div></div>

          <div className="mt-4 grid grid-cols-3 gap-3"><button onClick={()=>setScreen('progressWeight')} className="bg-white rounded-[18px] border border-[#F0E6D8] p-3.5 text-left shadow-sm"><div className="w-9 h-9 rounded-full bg-[#EAF6C9] flex items-center justify-center mb-2"><Scale className="w-4 h-4 text-[#5A8A00]"/></div><div className="text-[10px] text-[#9C9082] font-bold">Weight</div><div className="text-[15px] font-black">{profile.weight}kg</div></button><button onClick={()=>setScreen('progressNutrition')} className="bg-white rounded-[18px] border border-[#F0E6D8] p-3.5 text-left shadow-sm"><div className="w-9 h-9 rounded-full bg-[#FFF4E0] flex items-center justify-center mb-2"><Flame className="w-4 h-4 text-[#FF8A2E]" fill="#FF8A2E"/></div><div className="text-[10px] text-[#9C9082] font-bold">Target</div><div className="text-[15px] font-black">{targetCalories}</div></button><button onClick={()=>setScreen('waterTracker')} className="bg-white rounded-[18px] border border-[#F0E6D8] p-3.5 text-left shadow-sm"><div className="w-9 h-9 rounded-full bg-[#EAF2FF] flex items-center justify-center mb-2"><Droplets className="w-4 h-4 text-[#3A8DFF]"/></div><div className="text-[10px] text-[#9C9082] font-bold">Water</div><div className="text-[15px] font-black">{water}/8</div></button></div>
          <div className="mt-4 bg-white rounded-[22px] border border-[#F0E6D8] p-4 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[12px] font-black tracking-tight">Goal Journey</div><div className="text-[10px] text-[#9C9082] font-bold mt-0.5">{weightGap > 0 ? `${weightGap} kg to lose` : weightGap < 0 ? `${Math.abs(weightGap)} kg to gain` : 'Target reached'}</div></div><div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#C6ED6A] flex items-center justify-center"><Target className="w-5 h-5"/></div></div><div className="mt-4 h-2.5 rounded-full bg-[#F5EBDD] overflow-hidden"><div className="h-full rounded-full bg-[#C6ED6A]" style={{width:`${progressPct}%`}}/></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="bg-[#FFFBF2] rounded-[12px] border border-[#F5E9D9] p-2"><div className="text-[9px] text-[#9C9082] font-bold">Current</div><div className="text-[12px] font-black">{profile.weight}kg</div></div><div className="bg-[#FFFBF2] rounded-[12px] border border-[#F5E9D9] p-2"><div className="text-[9px] text-[#9C9082] font-bold">Goal</div><div className="text-[12px] font-black">{profile.targetWeight}kg</div></div><div className="bg-[#EAF6C9] rounded-[12px] border border-[#C6ED6A] p-2"><div className="text-[9px] text-[#6C8D25] font-bold">ETA</div><div className="text-[12px] font-black">{plan.weeks ? `${plan.weeks}w` : 'Now'}</div></div></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><button onClick={()=>setScreen('aiCoach')} className="h-14 rounded-[18px] bg-[#C6ED6A] font-black text-[12px] shadow-[0_4px_0_#AED64D] flex items-center justify-center gap-2"><Sparkles className="w-4 h-4"/> AI Coach</button><button onClick={()=>setScreen('achievements')} className="h-14 rounded-[18px] bg-white border border-[#F0E6D8] font-black text-[12px] shadow-sm flex items-center justify-center gap-2"><Crown className="w-4 h-4 text-[#FFB800]"/> Achievements</button></div>
          <div className="mt-4 bg-white rounded-[22px] border border-[#F0E6D8] p-4 shadow-sm"><div className="text-[11px] font-black tracking-widest text-[#9C9082] mb-3">BODY & ENERGY</div><div className="grid grid-cols-2 gap-2.5">{[['Height', `${profile.height} cm`, Ruler, '#F5EBDD'],['Age', `${profile.age} yrs`, User, '#FFF4E0'],['BMR', `${bmr} kcal`, Flame, '#FFEFE0'],['Maintain', `${maintenanceCalories} kcal`, Activity, '#EAF2FF']].map(([k,v,Icon,bg]:any)=><div key={k} className="rounded-[14px] border border-[#F0E6D8] p-3 flex items-center gap-2" style={{background:bg}}><div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"><Icon className="w-4 h-4 opacity-70"/></div><div><div className="text-[9px] text-[#9C9082] font-bold">{k}</div><div className="text-[12px] font-black">{v}</div></div></div>)}</div></div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-6"><BottomNav active="profile"/><ScreenDebugBar/></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='settings'){
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center gap-3 pt-1"><button onClick={()=>setScreen('profile')} className="w-9 h-9 rounded-full bg-white border border-[#F0E6D8] flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4"/></button><span className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30">SETTINGS</span><h2 className="font-black text-[15px] ml-2 tracking-tight">Settings</h2></div>
          <div className="mt-7 space-y-2.5">{[
            {icon: Ruler, t:'Units', v:'Metric (kg, cm)'},
            {icon: Bell, t:'Notifications', v:''},
            {icon: Timer, t:'Reminders', v:''},
            {icon: Settings2, t:'Theme', v:'Light'},
            {icon: Shield, t:'Privacy Policy', v:''},
            {icon: HelpCircle, t:'Help & Support', v:''},
            {icon: Info, t:'About PlatePal', v:''},
          ].map((r,i)=><div key={i} className="flex justify-between items-center bg-white rounded-[14px] border border-[#F0E6D8] p-4 shadow-sm hover:shadow-md transition cursor-pointer"><div className="flex items-center gap-3 text-[13px] font-bold tracking-tight"><r.icon className="w-4 h-4 opacity-60"/>{r.t}</div><div className="flex items-center gap-1.5 text-[11px] text-[#9C9082] font-bold">{r.v}<ChevronRight className="w-3.5 h-3.5 opacity-40"/></div></div>)}</div>
          <button onClick={()=>{ localStorage.clear(); setDiary([]); setWater(0); setProfile(defaultProfile); setScreen('onboarding') }} className="mt-6 w-full h-11 rounded-full bg-white border border-[#F0E6D8] font-black text-[12px] shadow-sm">Clear Saved Data</button>
          <div className="mt-5 text-center text-[11px] text-[#9C9082] font-bold tracking-wide">Version 1.0.0 • PlatePal</div>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-6"><BottomNav active="profile"/><ScreenDebugBar/></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='emptyState'){
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2 items-center justify-center">
          <div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30 mb-14">EMPTY STATE</div>
          <div className="w-[120px] h-[96px] bg-[#FFF3E0] rounded-[24px] border border-[#FFE0B2] flex items-center justify-center text-[44px] shadow-[0_8px_24px_rgba(255,180,80,0.15)] relative">🥣<span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#FFE0B2] flex items-center justify-center text-[12px]">♡</span></div>
          <div className="mt-8 text-center"><div className="font-black text-[16px] tracking-tight">No meals logged yet</div><div className="text-[12px] text-[#9C9082] mt-2 font-medium leading-[1.4]">Tap the + button to log<br/>your first meal.</div></div>
          <button onClick={()=>setScreen('foodScanner')} className="mt-10 w-16 h-16 rounded-full bg-black text-white flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.25)] active:scale-95 transition"><Plus className="w-8 h-8"/></button>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-10"><BottomNav active="home"/><ScreenDebugBar/></div>
        </div>
      </PhoneShell>
    )
  }

  if(screen==='errorState'){
    return (
      <PhoneShell>
        <div className="flex flex-col h-full flex-1 overflow-y-auto no-scrollbar pb-2 items-center justify-center">
          <div className="text-[9px] font-black tracking-widest bg-[#EAF6C9] px-2.5 py-1 rounded-full border border-[#C6ED6A]/30 mb-14">ERROR STATE</div>
          <div className="w-[110px] h-[110px] bg-[#FFF8EC] border border-[#F5E9D9] rounded-[22px] flex items-center justify-center relative shadow-sm"><FileQuestion className="w-12 h-12 opacity-20"/><div className="absolute bottom-3 text-[18px]">😢</div></div>
          <div className="mt-8 text-center"><div className="font-black text-[16px] tracking-tight leading-[1.2]">Oooops! Something<br/>went wrong</div><div className="text-[12px] text-[#9C9082] mt-3 font-medium leading-[1.4]">Please check your connection<br/>and try again.</div></div>
          <button onClick={()=>setScreen('home')} className="mt-10 px-8 h-11 rounded-full bg-[#C6ED6A] font-black text-[13px] tracking-tight shadow-[0_4px_0_#AED64D] active:shadow-[0_2px_0_#AED64D] active:translate-y-[2px] transition">Try Again</button>
          <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 bg-[#FFFBF2]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] pt-10"><BottomNav active="home"/><ScreenDebugBar/></div>
        </div>
      </PhoneShell>
    )
  }

  return null
}