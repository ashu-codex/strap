import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  GeneratedWorkoutPlan,
  NutritionPlan,
  RecoveryAnalysis,
  WeeklyAdaptation,
  FitnessMetrics,
  UserGoal,
} from "@/types";
import { calculateBMR, calculateTDEE } from "./utils";

const apiKey = process.env.GEMINI_API_KEY || "";
const rawModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const RETIRED_MODELS = new Set(["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-2.5-flash"]);
const modelName = RETIRED_MODELS.has(rawModel) ? "gemini-3.8-flash" : rawModel;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Fast circuit-breaker & timeout guard so users never wait on slow/503 upstream model calls
let liveModelCooldownUntil = 0;

function canAttemptLiveModel(): boolean {
  return Boolean(
    genAI &&
      apiKey &&
      apiKey !== "your-gemini-api-key" &&
      Date.now() >= liveModelCooldownUntil
  );
}

function withFastTimeout<T>(promise: Promise<T>, ms = 3200): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Fast timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function tripLiveModelCooldown() {
  liveModelCooldownUntil = Date.now() + 180_000;
}

/**
 * Safely parse JSON from Gemini text response (handling markdown code fences)
 */
function extractJsonFromText<T>(text: string): T {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", text);
    throw new Error("Invalid structured JSON received from AI engine");
  }
}

/**
 * GENERATE PERSONALIZED WORKOUT PLAN
 */
export async function generateWorkoutPlanAI(params: {
  metrics: Partial<FitnessMetrics>;
  goal: Partial<UserGoal>;
  recentWorkouts?: any[];
}): Promise<{ plan: GeneratedWorkoutPlan; isAiGenerated: boolean }> {
  const { metrics, goal } = params;

  if (canAttemptLiveModel()) {
    try {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
      });

      const prompt = `You are the lead exercise physiologist for STRAP Fitness.
Generate a comprehensive, scientifically-backed personalized workout plan in JSON format based on:
- Age: ${metrics.age || 26}
- Gender: ${metrics.gender || "male"}
- Height: ${metrics.height_cm || 175} cm
- Weight: ${metrics.current_weight_kg || 75} kg
- Target Weight: ${goal.target_weight_kg || metrics.current_weight_kg || 75} kg
- Primary Goal: ${goal.primary_goal || "muscle_gain"}
- Experience Level: ${metrics.experience_level || "intermediate"}
- Workout Days/Week: ${goal.weekly_workout_days || 4}
- Location: ${metrics.workout_location || "gym"}
- Workout Duration: ${metrics.workout_duration_mins || 60} minutes
- Equipment: ${(metrics.equipment || ["barbell", "dumbbell", "cables", "machines"]).join(", ")}
- Limitations/Injuries: ${metrics.limitations || "None reported"}
- Strength levels: ${JSON.stringify(metrics.strength_levels || {})}

Return valid JSON strictly adhering to this structure:
{
  "split_name": "string (e.g. 4-Day Upper / Lower Hypertrophy)",
  "split_type": "Full Body" | "Upper / Lower" | "Push Pull Legs" | "Bro Split" | "Custom",
  "rationale": "Detailed scientific explanation why this split fits their experience, recovery capacity and schedule.",
  "weekly_schedule": [
    {
      "day_number": 1,
      "day_title": "string (e.g. Day 1: Upper Power & Hypertrophy)",
      "focus": "string (e.g. Chest, Back & Triceps)",
      "warmup": ["5 min dynamic shoulder drills", "Scapular pullups"],
      "exercises": [
        {
          "exercise_name": "Barbell Bench Press",
          "target_muscle": "Chest",
          "sets": 4,
          "reps": "6-8",
          "rest_seconds": 120,
          "recommended_weight_kg": "RPE 8 (~70-80% 1RM)",
          "tempo": "3-0-1-0",
          "notes": "Arch upper back, retract scapulae.",
          "alternatives": ["Dumbbell Bench Press", "Floor Press"]
        }
      ],
      "cooldown": ["Chest door stretch", "Lats hang stretch"]
    }
  ],
  "progressive_overload_rules": [
    "Increase load by 2.5kg when all prescribed sets hit the upper rep ceiling at RPE <= 8",
    "Add 1 rep per set before increasing bar weight for isolation movements"
  ]
}`;

      const result = await withFastTimeout(model.generateContent(prompt), 3500);
      const text = result.response.text();
      const plan = extractJsonFromText<GeneratedWorkoutPlan>(text);
      return { plan, isAiGenerated: true };
    } catch (error) {
      tripLiveModelCooldown();
      console.warn("Gemini API call failed, utilizing high-precision fallback engine:", (error as any)?.message || error);
    }
  }

  // Deterministic Exercise Science Engine Fallback
  const fallbackPlan = buildFallbackWorkoutPlan(metrics, goal);
  return { plan: fallbackPlan, isAiGenerated: false };
}

/**
 * GENERATE NUTRITION PLAN
 */
export async function generateNutritionPlanAI(params: {
  metrics: Partial<FitnessMetrics>;
  goal: Partial<UserGoal>;
}): Promise<{ plan: NutritionPlan; isAiGenerated: boolean }> {
  const { metrics, goal } = params;
  const weight = metrics.current_weight_kg || 75;
  const height = metrics.height_cm || 175;
  const age = metrics.age || 26;
  const gender = metrics.gender || "male";
  const activity = metrics.daily_activity_level || "moderately_active";
  const primaryGoal = goal.primary_goal || "muscle_gain";
  const diet = metrics.diet_preference || "non_vegetarian";

  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activity);

  let targetCalories = tdee;
  if (primaryGoal === "fat_loss") targetCalories = Math.round(tdee * 0.8);
  else if (primaryGoal === "muscle_gain") targetCalories = Math.round(tdee * 1.12);
  else if (primaryGoal === "strength") targetCalories = Math.round(tdee * 1.05);

  if (canAttemptLiveModel()) {
    try {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
      });

      const prompt = `You are a certified sports nutritionist for STRAP Fitness.
Generate a structured scientific macro & meal plan in JSON for a client with:
- Weight: ${weight} kg, Height: ${height} cm, Age: ${age}, Gender: ${gender}
- Calculated BMR: ${bmr} kcal, TDEE: ${tdee} kcal
- Primary Goal: ${primaryGoal}
- Calculated Target Calories: ${targetCalories} kcal
- Diet Preference: ${diet} (Strictly respect vegetarian/vegan/eggetarian/non-veg restrictions!)

Return strictly JSON matching this structure:
{
  "bmr": ${bmr},
  "tdee": ${tdee},
  "target_calories": ${targetCalories},
  "protein_grams": number (target 1.8 - 2.2g per kg bodyweight),
  "carbs_grams": number,
  "fats_grams": number,
  "water_liters": number (approx 3.5 - 4.5 L),
  "explanation": "Clear, non-medical scientific rationale for this calorie target and macronutrient distribution.",
  "meal_timing": [
    {
      "meal_name": "string (e.g. Breakfast / Pre-Workout)",
      "suggested_time": "8:00 AM",
      "calorie_share_pct": 25,
      "recommendation": "High protein + moderate complex carbs for sustained glycogen."
    }
  ],
  "sample_foods": {
    "protein_sources": ["Paneer / Whey / Chicken breast / Tofu depending on diet"],
    "carb_sources": ["Oats", "Brown rice", "Sweet potato"],
    "fat_sources": ["Almonds", "Olive oil", "Flaxseed"]
  }
}`;

      const result = await withFastTimeout(model.generateContent(prompt), 3500);
      const text = result.response.text();
      const plan = extractJsonFromText<NutritionPlan>(text);
      return { plan, isAiGenerated: true };
    } catch (err) {
      tripLiveModelCooldown();
      console.warn("Gemini nutrition call failed, falling back to scientific formulas:", (err as any)?.message || err);
    }
  }

  // Deterministic nutrition calculation fallback
  const proteinGrams = Math.round(weight * 2.0); // 2.0g per kg
  const fatGrams = Math.round((targetCalories * 0.25) / 9); // 25% fat
  const carbCalories = targetCalories - (proteinGrams * 4 + fatGrams * 9);
  const carbsGrams = Math.max(80, Math.round(carbCalories / 4));

  const isVeg = diet === "vegetarian" || diet === "vegan";
  const plan: NutritionPlan = {
    bmr,
    tdee,
    target_calories: targetCalories,
    protein_grams: proteinGrams,
    carbs_grams: carbsGrams,
    fats_grams: fatGrams,
    water_liters: 3.8,
    explanation: `Calculated using the Mifflin-St Jeor equation. TDEE estimated at ${tdee} kcal with an adjusted target of ${targetCalories} kcal to support your ${primaryGoal.replace("_", " ")} objective. Notice: These estimates are based on sports science models and do not replace personalized medical advice.`,
    meal_timing: [
      {
        meal_name: "Meal 1: Breakfast / Kickstart",
        suggested_time: "08:30 AM",
        calorie_share_pct: 25,
        recommendation: isVeg
          ? "Sprouted moong / Oats with soy milk, whey/plant protein isolate and crushed almonds."
          : "3 Whole Eggs + 2 Egg Whites scrambled with whole grain toast and berries.",
      },
      {
        meal_name: "Meal 2: Power Lunch",
        suggested_time: "01:30 PM",
        calorie_share_pct: 35,
        recommendation: isVeg
          ? "200g Low-fat Paneer / Tofu curry, 1 bowl brown rice, dal, and fresh green cucumber-carrot salad."
          : "180g Grilled chicken breast, 1.5 cups steamed basmati rice, steamed broccoli, and curd.",
      },
      {
        meal_name: "Meal 3: Pre-Workout Fuel",
        suggested_time: "05:30 PM",
        calorie_share_pct: 15,
        recommendation: "1 Banana + 1 scoop whey/plant protein with black coffee.",
      },
      {
        meal_name: "Meal 4: Recovery Dinner",
        suggested_time: "08:45 PM",
        calorie_share_pct: 25,
        recommendation: isVeg
          ? "Soya chunks / Lentil soup with sautéed mixed vegetables and 2 multigrain rotis."
          : "Grilled fish or chicken with quinoa and tossed greens drizzled with cold-pressed olive oil.",
      },
    ],
    sample_foods: {
      protein_sources: isVeg
        ? ["Low-fat Paneer", "Tofu", "Soya Chunks", "Whey/Pea Protein", "Lentils", "Greek Yogurt"]
        : ["Chicken Breast", "Whole Eggs & Egg Whites", "Fish (Salmon/Rohu)", "Whey Protein", "Paneer"],
      carb_sources: ["Rolled Oats", "Brown & White Rice", "Sweet Potatoes", "Whole Wheat Roti", "Bananas"],
      fat_sources: ["Almonds & Walnuts", "Cold-Pressed Extra Virgin Olive Oil", "Peanut Butter", "Chia Seeds"],
    },
  };

  return { plan, isAiGenerated: false };
}

/**
 * RECOVERY ANALYSIS
 */
export async function generateRecoveryAnalysisAI(params: {
  sleepHours: number;
  fatigueScore: number; // 1-5
  sorenessScore: number; // 1-5
  recentWorkoutCount: number;
}): Promise<{ analysis: RecoveryAnalysis; isAiGenerated: boolean }> {
  const { sleepHours, fatigueScore, sorenessScore, recentWorkoutCount } = params;

  // Recovery formula: Sleep (40%), Fatigue (30%), Soreness (30%)
  const sleepFactor = Math.min(100, (sleepHours / 8.0) * 100);
  const fatigueFactor = (6 - fatigueScore) * 20;
  const sorenessFactor = (6 - sorenessScore) * 20;
  const recoveryScore = Math.round(sleepFactor * 0.4 + fatigueFactor * 0.3 + sorenessFactor * 0.3);

  let readiness: "ready" | "recovering" | "rest_recommended" = "ready";
  if (recoveryScore < 50 || sleepHours < 5 || fatigueScore >= 4) {
    readiness = "rest_recommended";
  } else if (recoveryScore < 75 || sorenessScore >= 4) {
    readiness = "recovering";
  }

  if (canAttemptLiveModel()) {
    try {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
      });

      const prompt = `You are the STRAP Recovery & Autonomic Nervous System Coach.
Analyze the user's recovery metrics:
- Average Sleep: ${sleepHours} hours
- Fatigue Rating: ${fatigueScore}/5
- Muscle Soreness Rating: ${sorenessScore}/5
- Workouts completed last 7 days: ${recentWorkoutCount}
- Computed Recovery Score: ${recoveryScore}%
- Status: ${readiness}

Return strictly JSON:
{
  "recovery_score_pct": ${recoveryScore},
  "readiness_status": "${readiness}",
  "sleep_analysis": "string evaluating circadian timing, sleep debt and restorative potential.",
  "fatigue_notes": "string evaluating central nervous system load vs muscular fatigue.",
  "soreness_assessment": "string detailing DOMS progression.",
  "actionable_tips": [
    "Prioritize 300ml electrolyte water upon waking",
    "Engage in 15 minutes of low-intensity zone 1 walking",
    "Keep evening blue light exposure minimal 60 minutes before bed"
  ]
}`;

      const res = await withFastTimeout(model.generateContent(prompt), 3500);
      const text = res.response.text();
      const analysis = extractJsonFromText<RecoveryAnalysis>(text);
      return { analysis, isAiGenerated: true };
    } catch (err) {
      tripLiveModelCooldown();
      console.warn("Gemini recovery call failed, falling back to rule engine:", (err as any)?.message || err);
    }
  }

  const analysis: RecoveryAnalysis = {
    recovery_score_pct: recoveryScore,
    readiness_status: readiness,
    sleep_analysis:
      sleepHours >= 7.5
        ? `Solid sleep volume at ${sleepHours} hours. Growth hormone synthesis and cellular repair are functioning optimally.`
        : `Logged sleep is ${sleepHours} hours, below the 7.5-8.5 hour restorative threshold. Mild sleep debt may impair peak power output.`,
    fatigue_notes:
      fatigueScore <= 2
        ? "Low systemic fatigue. Central nervous system is primed for high neuromuscular recruitment."
        : `Elevated fatigue rating (${fatigueScore}/5). Autonomic balance is stressed. Avoid pushing sets past RPE 8.`,
    soreness_assessment:
      sorenessScore >= 4
        ? "High delayed onset muscle soreness (DOMS). Muscle fibers are actively in inflammatory recovery phase."
        : "Muscular soreness is well-tolerated. Local tissue recovery is on schedule.",
    actionable_tips: [
      "Hydrate with 500ml water and a pinch of unrefined sea salt / electrolytes first thing in the morning.",
      "Execute 10 minutes of light foam rolling and thoracic spine mobility drills.",
      "Maintain consistent sleep-wake cycles within a 30-minute window tonight.",
    ],
  };

  return { analysis, isAiGenerated: false };
}

/**
 * WEEKLY ADAPTATION ENGINE
 */
export async function generateWeeklyAdaptationAI(params: {
  completedWorkoutsCount: number;
  averageRpe: number;
  missedWorkouts: number;
  currentSplit: string;
}): Promise<{ adaptation: WeeklyAdaptation; isAiGenerated: boolean }> {
  const { completedWorkoutsCount, averageRpe, missedWorkouts, currentSplit } = params;

  if (canAttemptLiveModel()) {
    try {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
      });

      const prompt = `You are the STRAP Adaptive Intelligence System.
Evaluate this past week's training log:
- Split: ${currentSplit}
- Completed Sessions: ${completedWorkoutsCount}
- Missed Sessions: ${missedWorkouts}
- Average RPE: ${averageRpe} / 10

Return strictly JSON explaining how and WHY the training plan adapts for next week:
{
  "original_plan_summary": "${currentSplit} with ${completedWorkoutsCount} sessions logged",
  "adaptation_triggers": ["List specific triggers like high RPE, missed volume, or rapid rep completion"],
  "why_plan_changed": "Comprehensive explanation of the physiological rationale behind this week's adaptations.",
  "updated_split_focus": "string (e.g. Progressive Overload Phase 2 - Volume Bump)",
  "adjustments": [
    {
      "exercise_name": "Barbell Bench Press",
      "action": "increase_load",
      "details": "RPE was consistently <= 7 on all sets; advance bar weight by 2.5kg."
    }
  ],
  "coach_message": "Inspiring, data-driven message from your AI coach."
}`;

      const res = await withFastTimeout(model.generateContent(prompt), 3500);
      const text = res.response.text();
      const adaptation = extractJsonFromText<WeeklyAdaptation>(text);
      return { adaptation, isAiGenerated: true };
    } catch (err) {
      tripLiveModelCooldown();
      console.warn("Gemini weekly adaptation failed, falling back to rule engine:", (err as any)?.message || err);
    }
  }

  const adaptation: WeeklyAdaptation = {
    original_plan_summary: `${currentSplit} (${completedWorkoutsCount} sessions recorded)`,
    adaptation_triggers: [
      averageRpe >= 8.5
        ? "Average RPE exceeded 8.5 indicating localized fatigue accumulation"
        : "Consistent set completion within prescribed rep bracket",
      missedWorkouts > 0 ? `${missedWorkouts} session(s) missed this cycle` : "100% adherence to scheduled sessions",
    ],
    why_plan_changed:
      averageRpe > 8.5
        ? "Because systemic strain was elevated (average RPE > 8.5), we have slightly tapered isolation volume by 1 set per exercise while sustaining compound intensity to prevent overreaching."
        : "You achieved target reps across your primary lifts with optimal recovery headroom. The progressive overload algorithm has prescribed a 2.5kg load progression on primary compounds.",
    updated_split_focus: "Adaptive Progressive Overload: Phase 2",
    adjustments: [
      {
        exercise_name: "Primary Compound Lifts",
        action: averageRpe > 8.5 ? "maintain" : "increase_load",
        details:
          averageRpe > 8.5
            ? "Hold current weights steady to solidify neuromuscular motor patterns before adding load."
            : "Add +2.5kg to working sets if the first set felt below RPE 8.",
      },
      {
        exercise_name: "Accessory / Isolation Lifts",
        action: "increase_reps",
        details: "Push for +1 rep per set while keeping eccentric control strictly at 3 seconds.",
      },
    ],
    coach_message:
      "Consistent execution beats sporadic perfection. STRAP has recalibrated your target volumes to keep you progressing without hitting a fatigue wall.",
  };

  return { adaptation, isAiGenerated: false };
}

export interface CoachUserContext {
  name?: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weight?: number;
  goal?: string;
  experienceLevel?: string;
  trainingStyle?: 'powerlifting' | 'muscle_building';
  weeklyDays?: number;
  actual1RMs?: { squat?: number; bench?: number; deadlift?: number };
  nutritionTargets?: {
    bmr: number;
    tdee: number;
    target_calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    fiber_g: number;
    water_ml: number;
    goal_label: string;
  };
  todayNutrition?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    water_ml: number;
    entries: any[];
  };
  workouts?: any[];
  prs?: any[];
  recoveryLogs?: any[];
  plan?: string;
}

/**
 * STRAP COACH INTERACTIVE CHAT
 * Uses live model when configured and falls back to a deeply personalized, question-specific sports science engine.
 * Never exposes underlying AI provider or model names to end users.
 */
export async function chatWithAIAssistant(
  userMessage: string,
  history: { role: "user" | "model"; parts: string }[] = [],
  userContext?: CoachUserContext
): Promise<string> {
  const ctx = userContext || {};
  const athleteName = ctx.name || "Athlete";
  const weightKg = Number(ctx.weight) || 75;
  const heightCm = Number(ctx.heightCm) || 175;
  const age = Number(ctx.age) || 26;
  const gender = ctx.gender || "male";
  const trainingStyleLabel =
    ctx.trainingStyle === "powerlifting" ? "Powerlifting (Squat / Bench / Deadlift)" : "Muscle Building (Hypertrophy)";
  const experience = ctx.experienceLevel || "intermediate";
  const goalLabel = ctx.nutritionTargets?.goal_label || ctx.goal || "Strength & Hypertrophy";
  const weeklyDays = Number(ctx.weeklyDays) || 4;

  const targets = ctx.nutritionTargets || {
    bmr: 1750,
    tdee: 2450,
    target_calories: 2350,
    protein_g: Math.round(weightKg * 2.0),
    carbs_g: Math.round(weightKg * 3.0),
    fats_g: Math.round(weightKg * 0.9),
    fiber_g: 32,
    water_ml: 3200,
    goal_label: goalLabel,
  };

  const todayNut = ctx.todayNutrition || {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    water_ml: 0,
    entries: [],
  };

  const recentWorkoutsSummary =
    (ctx.workouts || []).length > 0
      ? (ctx.workouts || [])
          .slice(0, 5)
          .map(
            (w: any) =>
              `${w.name || w.workout_name || "Session"} (${String(w.completed_at || w.created_at || "").slice(0, 10)}, Vol: ${
                w.total_volume_kg || 0
              }kg)`
          )
          .join("; ")
      : "No workout sessions logged yet";

  const prSummary =
    (ctx.prs || []).length > 0
      ? (ctx.prs || [])
          .slice(0, 8)
          .map((p: any) => {
            const val = Number(p.value) || Number(p.estimated_1rm_kg) || Number(p.max_weight_kg) || 0;
            const kind = p.record_type === "max_volume" ? "Max Vol" : "Est 1RM";
            return `${p.exercise_name}: ${val}kg (${kind})`;
          })
          .join("; ")
      : "No personal records logged yet";

  const todayFoodList =
    (todayNut.entries || []).length > 0
      ? (todayNut.entries || [])
          .map(
            (e: any) =>
              `${e.food_name} (${e.quantity} ${e.unit}: ${e.calories} kcal, ${e.protein_g}g P, ${e.carbs_g}g C, ${e.fat_g}g F)`
          )
          .join("; ")
      : "No foods logged in today's nutrition diary yet";

  if (canAttemptLiveModel()) {
    const validHistory = history
      .filter((h) => h && h.parts && (h.role === "user" || h.role === "model"))
      .map((h) => ({
        role: h.role,
        parts: [{ text: h.parts }],
      }));
    while (validHistory.length > 0 && validHistory[0].role !== "user") {
      validHistory.shift();
    }

    try {
      const model = genAI!.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.55,
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
        systemInstruction: `You are STRAP Coach, an elite, science-based strength, hypertrophy, and nutrition coach inside the STRAP fitness platform.
Never mention Google, Gemini, LLM models, API keys, or provider names. Identify yourself solely as STRAP Coach.

Athlete Profile & Real-Time Logged Data:
- Name: ${athleteName}
- Biometrics: Age ${age}, Gender ${gender}, Height ${heightCm} cm, Weight ${weightKg} kg
- Primary Goal: ${goalLabel}
- Training Mode: ${trainingStyleLabel} (${experience} level, ${weeklyDays} days/week)
- Configured 1RMs: Squat ${ctx.actual1RMs?.squat || "not set"} kg, Bench ${ctx.actual1RMs?.bench || "not set"} kg, Deadlift ${ctx.actual1RMs?.deadlift || "not set"} kg
- Logged Personal Records: ${prSummary}
- Recent Workouts: ${recentWorkoutsSummary}
- Daily Nutrition Targets (Mifflin-St Jeor): BMR ${targets.bmr} kcal, TDEE ${targets.tdee} kcal, Target ${targets.target_calories} kcal | Protein ${targets.protein_g}g | Carbs ${targets.carbs_g}g | Fat ${targets.fats_g}g | Fibre ${targets.fiber_g}g | Water ${targets.water_ml} ml
- Today's Logged Nutrition Intake: ${todayNut.calories} kcal consumed | Protein ${todayNut.protein_g}g | Carbs ${todayNut.carbs_g}g | Fat ${todayNut.fat_g}g | Fibre ${todayNut.fiber_g}g | Water ${todayNut.water_ml} ml
- Today's Logged Foods: ${todayFoodList}

Coaching Rules:
1. Answer the user's exact question directly, completely, and specifically. Never reply with a generic template and never stop mid-sentence.
2. Reference the athlete's real logged numbers above when relevant, and clearly distinguish between logged data vs. calculated estimates.
3. Keep the response well-structured and concise (250-450 words) with clear headings, bullet points, and specific numbers (sets/reps/RPE or grams/calories).
4. For medical or injury issues, advise safe biomechanics and consulting a qualified medical professional.`,
      });

      const chat = model.startChat({ history: validHistory });
      const response = await withFastTimeout(chat.sendMessage(userMessage), 3200);

      let text = (response.response.text() || "").trim();
      const finishReason = response.response.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS" && text.length > 0 && !/[.!?*`)]$/.test(text)) {
        const lastSentenceIdx = Math.max(text.lastIndexOf(". "), text.lastIndexOf(".\n"), text.lastIndexOf("\n"));
        if (lastSentenceIdx > text.length * 0.6) {
          text = text.slice(0, lastSentenceIdx + 1).trim();
        }
      }

      if (text && text.length > 60 && /[a-zA-Z0-9.!?*`)]$/.test(text)) {
        return text.replace(/Google Gemini|Gemini AI|Gemini/gi, "STRAP Coach");
      }
    } catch (err) {
      tripLiveModelCooldown();
      console.warn(`STRAP Coach live model (${modelName}) fast fallback triggered:`, (err as any)?.message || err);
    }
  }

  return buildPersonalizedCoachReply(userMessage, history, {
    athleteName,
    age,
    gender,
    heightCm,
    weightKg,
    trainingStyle: ctx.trainingStyle || "muscle_building",
    trainingStyleLabel,
    experience,
    goalLabel,
    weeklyDays,
    actual1RMs: ctx.actual1RMs || {},
    targets,
    todayNut,
    workouts: ctx.workouts || [],
    prs: ctx.prs || [],
    recoveryLogs: ctx.recoveryLogs || [],
  });
}

function buildPersonalizedCoachReply(
  userMessage: string,
  _history: { role: "user" | "model"; parts: string }[],
  c: {
    athleteName: string;
    age: number;
    gender: string;
    heightCm: number;
    weightKg: number;
    trainingStyle: "powerlifting" | "muscle_building";
    trainingStyleLabel: string;
    experience: string;
    goalLabel: string;
    weeklyDays: number;
    actual1RMs: { squat?: number; bench?: number; deadlift?: number };
    targets: {
      bmr: number;
      tdee: number;
      target_calories: number;
      protein_g: number;
      carbs_g: number;
      fats_g: number;
      fiber_g: number;
      water_ml: number;
      goal_label: string;
    };
    todayNut: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      fiber_g: number;
      water_ml: number;
      entries: any[];
    };
    workouts: any[];
    prs: any[];
    recoveryLogs: any[];
  }
): string {
  const q = userMessage.toLowerCase();

  // Find relevant logged PRs (supporting both `value` from progress_records and legacy fields)
  const benchPr = c.prs.find((p: any) => /bench/i.test(p.exercise_name || "") && p.record_type !== "max_volume");
  const squatPr = c.prs.find((p: any) => /squat/i.test(p.exercise_name || "") && p.record_type !== "max_volume");
  const deadliftPr = c.prs.find((p: any) => /deadlift/i.test(p.exercise_name || "") && p.record_type !== "max_volume");

  const loggedBench1RM =
    Number(c.actual1RMs.bench) ||
    Number(benchPr?.value) ||
    Number(benchPr?.estimated_1rm_kg) ||
    Number(benchPr?.max_weight_kg) ||
    0;
  const estBench1RM = loggedBench1RM || Math.round(c.weightKg * 1.05);

  const loggedSquat1RM =
    Number(c.actual1RMs.squat) ||
    Number(squatPr?.value) ||
    Number(squatPr?.estimated_1rm_kg) ||
    Number(squatPr?.max_weight_kg) ||
    0;
  const estSquat1RM = loggedSquat1RM || Math.round(c.weightKg * 1.4);

  const loggedDeadlift1RM =
    Number(c.actual1RMs.deadlift) ||
    Number(deadliftPr?.value) ||
    Number(deadliftPr?.estimated_1rm_kg) ||
    Number(deadliftPr?.max_weight_kg) ||
    0;
  const estDeadlift1RM = loggedDeadlift1RM || Math.round(c.weightKg * 1.65);

  // 1. BENCH PRESS PROGRESSION
  if (q.includes("bench")) {
    const dataNote = loggedBench1RM
      ? `Based on your **logged Bench Press 1RM of ${loggedBench1RM} kg** (at ${c.weightKg} kg bodyweight)`
      : `You haven't logged a competition Bench Press 1RM yet, so using an **estimated working 1RM of ~${estBench1RM} kg** for your ${c.weightKg} kg bodyweight and **${c.experience}** profile`;

    const topSingle = Math.round((estBench1RM * 0.875) / 2.5) * 2.5;
    const backoffLoad = Math.round((estBench1RM * 0.775) / 2.5) * 2.5;
    const hypertrophyLoad = Math.round((estBench1RM * 0.725) / 2.5) * 2.5;

    return `### Bench Press Progression Blueprint for ${c.athleteName}

${dataNote}, here is your structured plan tailored to your **${c.trainingStyleLabel}** mode and **${c.goalLabel}** goal:

#### 1. Weekly Frequency & Loading Structure
- **Day A – Primary Heavy Bench**:
  - **Top Set**: 1 set × 3–4 reps @ **${topSingle} kg** (~87.5% 1RM, RPE 8–8.5 / 1–2 RIR)
  - **Back-off Volume**: 3–4 sets × 5–6 reps @ **${backoffLoad} kg** (~77.5% 1RM, RPE 7.5–8)
  - **Rest Interval**: 3 to 4 minutes between heavy sets.
- **Day B – Variation & Hypertrophy Bench (48–72h later)**:
  - **Paused Bench Press or Spoto Press**: 4 sets × 6–8 reps @ **${hypertrophyLoad} kg** (1-second pause on chest to eliminate momentum and build bottom-end drive).
  - **Incline Dumbbell Press**: 3 sets × 8–10 reps @ RPE 8.

#### 2. Weak-Point Accessory Prescription
- **Off-the-Chest Sticking Point**: Paused Bench Press, Cambered/Deep Dumbbell Press, and Weighted Dips (3 × 8–10).
- **Mid-Range / Lockout Sticking Point**: Close-Grip Bench Press (3 × 6–8), Skull Crushers, and Rope Triceps Pushdowns (3 × 10–12).
- **Upper-Back Stability Shelf**: Barbell Rows, Chest-Supported Rows, and Face Pulls (3–4 sets × 10–15) to create a rigid scapular base.

#### 3. Technical Execution Cues
- **Scapular Retraction & Depression**: Pull shoulder blades back and down into the bench before unracking.
- **Leg Drive**: Push your heels horizontally into the floor to drive force toward your traps without lifting your glutes off the pad.
- **Double-Progression Rule**: Once you hit the top of your prescribed rep range across all working sets at RPE ≤ 8, increase the bar load by **+2.5 kg** next week.`;
  }

  // 2. SQUAT PROGRESSION / PLATEAU
  if (q.includes("squat")) {
    const dataNote = loggedSquat1RM
      ? `Looking at your **logged Squat 1RM of ${loggedSquat1RM} kg** (at ${c.weightKg} kg bodyweight)`
      : `Since no Squat 1RM is logged yet, using an **estimated reference 1RM of ~${estSquat1RM} kg** for your ${c.weightKg} kg bodyweight and **${c.experience}** level`;

    const primaryLoad = Math.round((estSquat1RM * 0.825) / 2.5) * 2.5;
    const pauseLoad = Math.round((estSquat1RM * 0.725) / 2.5) * 2.5;

    return `### Squat Plateau & Progression Analysis for ${c.athleteName}

${dataNote} in **${c.trainingStyleLabel}** mode, squat plateaus typically stem from one of three bottlenecks: **bracing/positional loss in the hole**, **quad/glute drive deficit**, or **accumulated systemic fatigue**.

#### 1. Diagnose & Fix Your Sticking Point
- **Collapsing Forward Out of the Hole ("Good-Morning Squat")**:
  - *Cause*: Quads are shifting load to the posterior chain or thoracic/core brace is softening at depth.
  - *Fix*: Add **Pause Squats** (3 sets × 4 reps @ **${pauseLoad} kg**, 2-sec pause in the hole) and **Front Squats or Hack Squats** (3 × 8–10) to build upright quad drive.
- **Slowing Down Mid-Ascent**:
  - *Cause*: Concentric rate-of-force production through the sticking point.
  - *Fix*: Program **Tempo Squats (3-1-0)** or **Box Squats** plus **Bulgarian Split Squats** (3 × 8–10/leg).

#### 2. Recommended 2-Day Weekly Squat Wave
- **Session 1 (Primary Strength)**:
  - **Competition Squat (High-Bar or Low-Bar)**: 4 sets × 4–5 reps @ **${primaryLoad} kg** (~82.5% 1RM, RPE 8 / 2 RIR).
  - **Romanian Deadlift**: 3 sets × 8 reps (hamstring & erector support).
- **Session 2 (Technical Variation)**:
  - **Pause Squat**: 3 sets × 4–5 reps @ **${pauseLoad} kg** (RPE 7.5).
  - **Leg Press or Hack Squat**: 3 sets × 10–12 reps for quad hypertrophy without spinal axial fatigue.

#### 3. Recovery & Nutrition Check
- Your daily target is **${c.targets.target_calories} kcal** and **${c.targets.protein_g}g protein** (today you have logged **${c.todayNut.calories} kcal** and **${c.todayNut.protein_g}g protein**). Under-recovering between heavy lower-body sessions stalls central nervous system output—aim for 7.5+ hours of sleep and 3.5–4m rest between heavy squat sets.`;
  }

  // 3. DEADLIFT PROGRESSION
  if (q.includes("deadlift")) {
    const dataNote = loggedDeadlift1RM
      ? `Based on your **logged Deadlift 1RM of ${loggedDeadlift1RM} kg**`
      : `Using an **estimated Deadlift 1RM of ~${estDeadlift1RM} kg** for your ${c.weightKg} kg profile`;
    const workWeight = Math.round((estDeadlift1RM * 0.825) / 2.5) * 2.5;
    const rdlWeight = Math.round((estDeadlift1RM * 0.65) / 2.5) * 2.5;

    return `### Deadlift Progression Strategy for ${c.athleteName}

${dataNote} (${c.trainingStyleLabel}), the deadlift demands high central nervous system (CNS) recovery and strict wedge mechanics:

- **Primary Pulling Session (1x/week Heavy)**:
  - **Top Working Sets**: 2–3 sets × 3–5 reps @ **${workWeight} kg** (~82.5% 1RM, RPE 8 / 2 RIR). Avoid pulling to RPE 10 failure every week.
- **Secondary Posterior Chain Session**:
  - **Romanian Deadlift (RDL) or Pause Deadlift**: 3 sets × 6–8 reps @ **${rdlWeight} kg** (~65% 1RM) to reinforce lat engagement and hamstring tension.
- **Weak-Point Variations**:
  - *Slow off the floor*: **Deficit Deadlifts** (1–1.5 inch deficit, 3 × 4 @ 72–75% 1RM) and quad work (Leg Press / Front Squat).
  - *Slow at knee/lockout*: **Block Pulls / Rack Pulls** and heavy **Barbell Hip Thrusts** + **Chest-Supported Rows**.`;
  }

  // 4. FAT LOSS / BELLY FAT / GETTING LEAN / CUTTING / ABS
  if (
    q.includes("belly") ||
    q.includes("lose fat") ||
    q.includes("fat loss") ||
    q.includes("weight loss") ||
    q.includes("lose weight") ||
    q.includes("get lean") ||
    q.includes("lean") ||
    q.includes("cut") ||
    q.includes("shred") ||
    q.includes("waist") ||
    q.includes("six pack") ||
    q.includes("6 pack")
  ) {
    const cutCalories = Math.max(1450, c.targets.tdee - 450);
    const cutProtein = Math.round(c.weightKg * 2.1);
    const cutFats = Math.round(c.weightKg * 0.8);
    const cutCarbs = Math.max(80, Math.round((cutCalories - cutProtein * 4 - cutFats * 9) / 4));

    return `### Evidence-Based Fat Loss & Leaning Blueprint for ${c.athleteName}

Spot-reducing abdominal/belly fat is physiologically impossible—visceral and subcutaneous abdominal fat is mobilized when you sustain a **controlled caloric deficit** while keeping protein and mechanical lifting tension high to protect lean muscle.

#### 1. Your Calibrated Fat-Loss Macros (Based on ${c.weightKg} kg, ${c.heightCm} cm, Age ${c.age})
- **Estimated Maintenance (TDEE)**: **${c.targets.tdee} kcal/day** (BMR: ${c.targets.bmr} kcal)
- **Recommended Fat-Loss Target (-450 kcal Deficit)**: **${cutCalories} kcal/day** (~0.4–0.5 kg fat loss/week)
- **High-Retention Protein Target**: **${cutProtein}g/day** (2.1 g/kg to prevent muscle loss during a deficit)
- **Carbohydrates**: **${cutCarbs}g/day** (timed around your workouts for training performance)
- **Dietary Fats**: **${cutFats}g/day** (supports hormonal health)
- **Dietary Fibre**: **${c.targets.fiber_g}g/day** (maximizes satiety and digestion)
- *(Note: Your profile is currently set to **${c.goalLabel}** at **${c.targets.target_calories} kcal**. You can switch your goal to **Fat Loss** anytime in **Profile & Settings** \`/profile\`!)*

#### 2. Training & Daily Activity Protocol
- **Keep Lifting Heavy (${c.weeklyDays} days/week)**: Maintain your working weights on compound lifts (Squat, Bench, Row, RDL, Overhead Press) at **RPE 8**—mechanical tension is the primary signal that forces your body to burn body fat instead of muscle tissue.
- **Daily Step Count (NEAT)**: Target **8,000–10,000 steps/day** plus **2–3 × 25-minute Zone-2 incline treadmill walks or cycling sessions** post-workout.
- **Core Hypertrophy**: Train abs directly 2–3x/week with **Cable Crunches (3 × 12–15)** and **Hanging Leg Raises (3 × 10–15)** so your abdominal wall is well-developed as body fat drops.`;
  }

  // 5. BREAKFAST / PRE-WORKOUT / POST-WORKOUT / MEAL IDEAS / WHAT TO EAT
  if (
    q.includes("breakfast") ||
    q.includes("lunch") ||
    q.includes("dinner") ||
    q.includes("pre-workout") ||
    q.includes("pre workout") ||
    q.includes("post-workout") ||
    q.includes("post workout") ||
    q.includes("what should i eat") ||
    q.includes("meal idea") ||
    q.includes("meal plan")
  ) {
    const mealCal = Math.round(c.targets.target_calories / 4);
    const mealProt = Math.round(c.targets.protein_g / 4);

    return `### Personalized Breakfast, Pre-Workout & Meal Blueprint for ${c.athleteName}

Calibrated to your **${c.targets.target_calories} kcal** and **${c.targets.protein_g}g protein** daily target (**~${mealCal} kcal** & **~${mealProt}g protein** per meal across 4 meals):

#### 1. High-Protein Breakfast Options (~${mealCal} kcal | ${mealProt}g+ Protein)
- **Option A (Eggs & Oats Power Bowl)**:
  - 3 Whole Eggs + 3 Egg Whites Bhurji/Omelette + 60g Rolled Oats cooked in 200ml Skim/Toned Milk + 1 Banana (**~580 kcal | 38g Protein | 64g Carbs | 16g Fat**).
- **Option B (Vegetarian Indian High-Protein)**:
  - 150g Low-Fat Paneer Bhurji + 2 Whole Wheat Rotis (or 1 bowl Poha/Upma) + 150g Curd (**~610 kcal | 36g Protein | 62g Carbs | 20g Fat**).
- **Option C (Whey + Overnight Oats)**:
  - 1 scoop (32g) Whey Protein Isolate/Concentrate + 70g Oats + 15g Peanut Butter + 1 Apple (**~560 kcal | 37g Protein | 68g Carbs | 14g Fat**).

#### 2. Optimal Pre-Workout Fueling
- **60–90 Minutes Before Training (Sustained Glycogen + Amino Acids)**:
  - 150g Cooked White Rice or 2 Slices Whole Wheat Bread + 120g Chicken Breast (or 100g Paneer / 4 Egg Whites) + 1 Banana (**~420 kcal | 32g Protein | 58g Carbs | 5g Fat**).
- **20–30 Minutes Before Training (Fast Digestion)**:
  - 1 Large Banana + 1 scoop Whey Protein in water + Black Coffee or Pre-Workout (200mg caffeine + 6g L-Citrulline Malate) (**~225 kcal | 25g Protein | 28g Carbs | 1g Fat**).

#### 3. Post-Workout Recovery Meal (Within 60–90 Mins)
- 1 scoop Whey Protein + 5g Creatine Monohydrate immediately post-workout, followed by 200g Cooked Rice / 2 Rotis + 150g Chicken Breast or 1 katori Dal + 50g Soya Chunks / Paneer.

*Log any of these items in seconds inside the **Nutrition Tracker** (\`/nutrition\`)!*`;
  }

  // 6. WATER / HYDRATION / SLEEP / RECOVERY / SORENESS / DELOAD / WARM-UP
  if (
    q.includes("water") ||
    q.includes("hydrat") ||
    q.includes("sleep") ||
    q.includes("recover") ||
    q.includes("sore") ||
    q.includes("doms") ||
    q.includes("fatigue") ||
    q.includes("deload") ||
    q.includes("warm") ||
    q.includes("mobility") ||
    q.includes("pain")
  ) {
    const waterLiters = (c.targets.water_ml / 1000).toFixed(2);
    const remainingWater = Math.max(0, c.targets.water_ml - c.todayNut.water_ml);

    return `### Recovery, Hydration & Sleep Architecture for ${c.athleteName}

For your **${c.weightKg} kg** bodyweight, **${c.trainingStyleLabel}** workload (${c.weeklyDays} days/week), and **${c.goalLabel}** objective:

#### 1. Daily Hydration Target & Today's Status
- **Baseline Daily Water Target**: **${c.targets.water_ml} ml (${waterLiters} Litres/day)** (~40–45 ml per kg of bodyweight).
- **Training Day Sweat Addition**: Add **+500 to 750 ml** with electrolytes (Sodium/Potassium) per hour of intense gym training.
- **Today's Logged Water**: **${c.todayNut.water_ml} ml** logged (**${remainingWater} ml remaining** today).
- *Why It Matters*: Even a 2% drop in intracellular hydration reduces barbell power output and increases perceived RPE by 1–1.5 points.

#### 2. Sleep Duration & Central Nervous System (CNS) Recovery
- **Target Sleep Window**: **7.5 to 9.0 hours** of continuous nightly sleep.
- **Physiological Impact**:
  - **Deep Slow-Wave Sleep**: Drives ~70% of daily pulsatile Growth Hormone (GH) secretion for tissue repair and tendon remodeling.
  - **REM & Late-Stage Sleep**: Restores motor-unit firing rate and central nervous system readiness for heavy compound lifts.
- **Evening Recovery Protocol**: Stop caffeine 8 hours before bed, consume 30–40g slow-digesting protein (Casein, Curd, or Paneer) at dinner, and consider 300–400mg Magnesium Glycinate 45 minutes pre-sleep.

#### 3. Managing Soreness (DOMS) & When to Deload
- If soreness lasts >72 hours or your primary lifts regress for 2 consecutive weeks at RPE 9+, run a **1-Week Reactive Deload**: keep bar weight at **85–90%** of normal working loads, cut total sets by **40%**, and stay at **RPE 6–7 (3–4 RIR)**.`;
  }

  // 7. PROTEIN INTAKE QUESTION ("Am I eating enough protein?")
  if (q.includes("protein")) {
    const targetP = c.targets.protein_g;
    const loggedP = c.todayNut.protein_g;
    const remainingP = Math.max(0, Math.round((targetP - loggedP) * 10) / 10);
    const gPerKg = (targetP / Math.max(1, c.weightKg)).toFixed(2);
    const statusText =
      c.todayNut.entries.length === 0
        ? `You currently have **0g protein logged today** (no meals entered in today's diary yet).`
        : loggedP >= targetP
        ? `**Yes — you have hit your protein target today!** You have logged **${loggedP}g / ${targetP}g** protein across ${c.todayNut.entries.length} logged item(s).`
        : `**Not yet for today:** You have logged **${loggedP}g protein** out of your **${targetP}g daily target**, leaving **${remainingP}g remaining** today.`;

    const loggedItemsBreak =
      c.todayNut.entries.length > 0
        ? `\n- **Today's Logged Protein Sources**: ${c.todayNut.entries
            .map((e: any) => `${e.food_name} (${e.protein_g}g P)`)
            .join(", ")}`
        : "";

    return `### Personalized Protein Intake Assessment for ${c.athleteName}

- **Your Biometric Profile**: **${c.weightKg} kg** bodyweight • Goal: **${c.goalLabel}** • Mode: **${c.trainingStyleLabel}**
- **Optimal Daily Target**: **${targetP}g protein/day** (**${gPerKg} g/kg** of bodyweight, calibrated inside the evidence-based 1.6–2.2 g/kg range)
- **Today's Status**: ${statusText}${loggedItemsBreak}

#### How to Close a ${remainingP > 0 ? `${remainingP}g` : "Daily"} Protein Gap Easily
1. **Whey Protein Isolate / Concentrate**: 1 scoop (32g) = **24–25g protein** (~120 kcal)
2. **Chicken Breast (Cooked, 150g)**: **46g protein** (~248 kcal)
3. **Low-Fat Paneer (150g) or Tofu (200g)**: **27–30g protein**
4. **4 Whole Eggs or 6 Egg Whites**: **22–25g protein**
5. **Soya Chunks (50g dry weight)**: **26g protein** (~172 kcal)
6. **Greek Yogurt / Curd (250g bowl) + Dal/Rajma (1 katori)**: **22–24g protein**

*Tip: Distribute your **${targetP}g** target across 3–4 meals (**~${Math.round(targetP / 4)}g protein per meal**) to maximize muscle protein synthesis throughout the day.*`;
  }

  // 8. TODAY'S LOGGED NUTRITION / CALORIE DEFICIT OR SURPLUS ANALYSIS
  if (
    q.includes("nutrition") ||
    q.includes("calorie") ||
    q.includes("diet") ||
    q.includes("macro") ||
    q.includes("eating") ||
    q.includes("food") ||
    q.includes("deficit") ||
    q.includes("surplus") ||
    q.includes("logged")
  ) {
    const calDiff = c.targets.target_calories - c.todayNut.calories;
    const pDiff = Math.max(0, Math.round((c.targets.protein_g - c.todayNut.protein_g) * 10) / 10);
    const cDiff = Math.max(0, Math.round((c.targets.carbs_g - c.todayNut.carbs_g) * 10) / 10);
    const fDiff = Math.max(0, Math.round((c.targets.fats_g - c.todayNut.fat_g) * 10) / 10);

    const entriesList =
      c.todayNut.entries.length > 0
        ? c.todayNut.entries
            .map(
              (e: any) =>
                `  - **${e.food_name}** (${e.quantity} ${e.unit} in *${e.meal_category}*): **${e.calories} kcal** | P: ${e.protein_g}g | C: ${e.carbs_g}g | F: ${e.fat_g}g`
            )
            .join("\n")
        : "  - *No food items logged for today yet. Open the **Nutrition Tracker** (`/nutrition`) to log Breakfast, Lunch, Snacks, Dinner, or Supplements.*";

    return `### Daily Nutrition & Metabolic Audit for ${c.athleteName}

#### 1. Your Personalized Energy Equations (Mifflin-St Jeor)
- **Biometrics**: Age ${c.age} • ${c.heightCm} cm • ${c.weightKg} kg • Goal: **${c.goalLabel}**
- **Basal Metabolic Rate (BMR)**: **${c.targets.bmr} kcal/day**
- **Total Daily Energy Expenditure (TDEE)**: **${c.targets.tdee} kcal/day**
- **Daily Goal Target**: **${c.targets.target_calories} kcal/day** (${
      c.targets.target_calories < c.targets.tdee
        ? `${c.targets.tdee - c.targets.target_calories} kcal deficit for fat loss while preserving lean tissue`
        : c.targets.target_calories > c.targets.tdee
        ? `+${c.targets.target_calories - c.targets.tdee} kcal controlled surplus for lean tissue & strength accretion`
        : `isocaloric maintenance / recomposition`
    })

#### 2. Today's Logged Intake vs. Targets
- **Calories**: **${Math.round(c.todayNut.calories)} kcal** consumed / **${c.targets.target_calories} kcal** target (${
      calDiff >= 0 ? `**${Math.round(calDiff)} kcal remaining**` : `**${Math.abs(Math.round(calDiff))} kcal over target**`
    })
- **Protein**: **${c.todayNut.protein_g}g** / ${c.targets.protein_g}g (${pDiff}g remaining)
- **Carbohydrates**: **${c.todayNut.carbs_g}g** / ${c.targets.carbs_g}g (${cDiff}g remaining)
- **Total Fat**: **${c.todayNut.fat_g}g** / ${c.targets.fats_g}g (${fDiff}g remaining)
- **Dietary Fibre**: **${c.todayNut.fiber_g}g** / ${c.targets.fiber_g}g
- **Hydration**: **${c.todayNut.water_ml} ml** / ${c.targets.water_ml} ml

#### 3. Foods & Supplements Logged Today (${c.todayNut.entries.length} items)
${entriesList}

#### 4. Coach Recommendation
${
  c.todayNut.entries.length === 0
    ? `Start by logging your first meal in the **Nutrition Tracker**. Aim for **~${Math.round(
        c.targets.protein_g / 4
      )}g protein** and **~${Math.round(c.targets.target_calories / 4)} kcal** per meal across 4 feedings.`
    : pDiff > 30
    ? `Priority for your next meal: focus on high-protein density (e.g., Paneer, Chicken Breast, Eggs, Soya Chunks, or 1 scoop Whey Isolate) to close your **${pDiff}g protein gap** while keeping calories within your **${Math.max(
        0,
        Math.round(calDiff)
      )} kcal** remaining budget.`
    : `Your protein pacing is on track! Keep hydration near **${(c.targets.water_ml / 1000).toFixed(
        1
      )} L** and hit at least **${c.targets.fiber_g}g dietary fibre** from vegetables, oats, or pulses.`
}`;
  }

  // 9. REAR DELTS / SHOULDER / SPECIFIC MUSCLE GROUP EXERCISES
  if (
    q.includes("rear delt") ||
    q.includes("posterior delt") ||
    q.includes("shoulder") ||
    q.includes("exercise") ||
    q.includes("chest") ||
    q.includes("back") ||
    q.includes("lat") ||
    q.includes("bicep") ||
    q.includes("tricep") ||
    q.includes("hamstring") ||
    q.includes("quad") ||
    q.includes("glute") ||
    q.includes("arm") ||
    q.includes("leg") ||
    q.includes("calf") ||
    q.includes("calves")
  ) {
    if (q.includes("rear delt") || q.includes("posterior delt") || q.includes("shoulder")) {
      return `### Targeted Rear Delt & Shoulder Hypertrophy Guide for ${c.athleteName}

To isolate the **posterior deltoid** without letting the upper traps or mid-back (rhomboids) take over, focus on horizontal abduction with a neutral or slightly internally rotated humerus:

#### Top 4 Rear Delt Exercises (Ranked by Biomechanical Tension)
1. **Reverse Pec Deck (Rear Delt Machine Fly)**
   - **Prescription**: 3–4 sets × 12–15 reps @ RPE 8.5–9 (60–75s rest)
   - **Execution Cue**: Drive the backs of your wrists outward in a wide arc ("push the walls apart") rather than pinching your shoulder blades together.
2. **Single-Arm or Cross-Body Cable Rear Delt Fly**
   - **Prescription**: 3 sets × 12–15 reps per arm @ RPE 8.5
   - **Execution Cue**: Set cables at shoulder height and pull across a 45° downward path to align directly with posterior deltoid fibers.
3. **Chest-Supported Incline Dumbbell Rear Delt Row / Swing**
   - **Prescription**: 3 sets × 15–20 reps @ RPE 8–9
   - **Execution Cue**: Keep elbows flared at a 60–75° angle relative to the torso; pause for 0.5s at peak contraction.
4. **High-Pulley Rope Face Pulls (External Rotation Focus)**
   - **Prescription**: 3 sets × 15–20 reps @ RPE 8
   - **Execution Cue**: Pull the rope toward your forehead while rotating your thumbs backward so your biceps finish in a double-biceps pose—essential for rotator cuff health and bench press stability.

*Programming Tip for your **${c.trainingStyleLabel}** split: Train rear delts **2x/week** for **8–12 total working sets/week** at the end of Pull or Upper-Body sessions.*`;
    }

    return `### Biomechanical Exercise Selection for ${c.athleteName} (${c.trainingStyleLabel})

Based on your **${c.experience}** experience level and **${c.goalLabel}** goal, here are the highest-yield movements sorted by mechanical tension profile:

- **Chest**: Barbell Bench Press (3–4 × 5–8), Incline Dumbbell Press (3 × 8–10), Cable Fly / Pec Deck (3 × 12–15).
- **Back (Width & Thickness)**: Weighted/Assisted Pull-Ups or Lat Pulldown (3–4 × 8–10), Chest-Supported Row or T-Bar Row (3–4 × 8–10), Seated Cable Row (3 × 10–12).
- **Shoulders**: Overhead Barbell/Dumbbell Press (3 × 6–8), Cable Lateral Raises (4 × 12–15), Reverse Pec Deck / Face Pulls (3 × 15).
- **Legs (Quads & Posterior Chain)**: High/Low-Bar Squat or Hack Squat (3–4 × 6–8), Romanian Deadlift (3 × 8–10), Seated/Lying Leg Curl (3 × 10–12), Standing Calf Raises (4 × 12–15).
- **Arms**: Incline Dumbbell Curl & Preacher Curl (3 × 10–12), Overhead Cable Triceps Extension & Rope Pushdown (3 × 10–12).

*You can log any of these directly in the **Workout Tracker** (\`/workout-tracker\`), or create custom exercises via the **+ Custom Exercise** button.*`;
  }

  // 10. NEXT TRAINING WEEK / WORKOUT PLAN / SPLIT
  if (
    q.includes("week") ||
    q.includes("plan") ||
    q.includes("split") ||
    q.includes("program") ||
    q.includes("routine") ||
    q.includes("schedule")
  ) {
    if (c.trainingStyle === "powerlifting") {
      return `### Next Training Week — Powerlifting SBD Block for ${c.athleteName}

Tailored for your **${c.weightKg} kg** profile, **${c.goalLabel}** goal, and **${c.weeklyDays} days/week** schedule (Squat ref: ~${estSquat1RM}kg | Bench ref: ~${estBench1RM}kg | Deadlift ref: ~${estDeadlift1RM}kg):

- **Day 1 – Heavy Squat & Quad Accessories**
  1. Competition Squat: 1 top set × 3 reps @ **${Math.round(estSquat1RM * 0.85)} kg** (RPE 8), then 3 × 5 @ **${Math.round(estSquat1RM * 0.775)} kg**
  2. Leg Press or Hack Squat: 3 sets × 8–10 reps @ RPE 8
  3. Seated Leg Curl: 3 sets × 10–12 reps
  4. Hanging Leg Raises / Plank: 3 sets
- **Day 2 – Heavy Bench Press & Upper Hypertrophy**
  1. Paused Barbell Bench Press: 1 top set × 3 reps @ **${Math.round(estBench1RM * 0.85)} kg** (RPE 8), then 4 × 5 @ **${Math.round(estBench1RM * 0.775)} kg**
  2. Incline Dumbbell Press: 3 sets × 8–10 reps
  3. Chest-Supported Row: 4 sets × 10 reps
  4. Rope Triceps Pushdown + Face Pulls: 3 sets × 12–15 reps
- **Day 3 – Heavy Deadlift & Secondary Bench**
  1. Competition Deadlift: 1 top set × 3 reps @ **${Math.round(estDeadlift1RM * 0.85)} kg** (RPE 8), then 2 × 4 @ **${Math.round(estDeadlift1RM * 0.775)} kg**
  2. Close-Grip or Spoto Bench Press: 3 sets × 6–8 reps @ **${Math.round(estBench1RM * 0.725)} kg**
  3. Lat Pulldown: 3 sets × 10–12 reps
- **Day 4 – Technical Squat / RDL & Arm Accessories**
  1. Pause Squat (2-sec pause): 3 sets × 4 reps @ **${Math.round(estSquat1RM * 0.725)} kg** (RPE 7.5)
  2. Romanian Deadlift: 3 sets × 8 reps @ **${Math.round(estDeadlift1RM * 0.625)} kg**
  3. Barbell/Dumbbell Curls + Overhead Triceps Extensions: 3 sets × 10–12 reps

*Load this directly in **Workout Tracker** (\`/workout-tracker\`) using the Powerlifting Periodization Templates.*`;
    }

    return `### Next Training Week — Hypertrophy & Progressive Overload Split for ${c.athleteName}

Designed for your **${c.trainingStyleLabel}** mode, **${c.goalLabel}** objective, and **${c.weeklyDays} days/week** frequency (Daily nutrition target: **${c.targets.target_calories} kcal** & **${c.targets.protein_g}g protein**):

- **Day 1 – Upper Body A (Chest & Back Thickness Focus)**
  1. Barbell Bench Press: 3 sets × 6–8 reps @ RPE 8
  2. Barbell or Chest-Supported Row: 3 sets × 8–10 reps @ RPE 8
  3. Incline Dumbbell Press: 3 sets × 8–10 reps @ RPE 8.5
  4. Lat Pulldown: 3 sets × 10–12 reps @ RPE 8.5
  5. Cable Lateral Raises + Rope Triceps Pushdown: 3 sets × 12–15 reps
- **Day 2 – Lower Body A (Quad & Glute Dominance)**
  1. High-Bar Squat or Hack Squat: 3 sets × 6–8 reps @ RPE 8
  2. Romanian Deadlift: 3 sets × 8–10 reps @ RPE 8
  3. Leg Extension: 3 sets × 12–15 reps @ RPE 9
  4. Lying/Seated Leg Curl: 3 sets × 10–12 reps @ RPE 8.5
  5. Standing Calf Raises: 4 sets × 12–15 reps
- **Day 3 – Upper Body B (Shoulder Width & Arm Hypertrophy)**
  1. Overhead Dumbbell Shoulder Press: 3 sets × 8–10 reps @ RPE 8
  2. Weighted Pull-Ups or Seated Cable Row: 3 sets × 8–10 reps
  3. Cable Fly or Pec Deck: 3 sets × 12–15 reps @ RPE 9
  4. Reverse Pec Deck / Face Pulls (Rear Delts): 3 sets × 15 reps
  5. Incline Dumbbell Curl + Overhead Cable Triceps Extension: 3 sets × 10–12 reps
- **Day 4 – Lower Body B (Posterior Chain & Unilateral)**
  1. Conventional/Trap-Bar Deadlift or Hip Thrust: 3 sets × 6–8 reps @ RPE 8
  2. Bulgarian Split Squat or Leg Press: 3 sets × 10–12 reps
  3. Seated Leg Curl: 3 sets × 12–15 reps
  4. Hanging Leg Raises & Cable Crunch: 3 sets × 12–15 reps`;
  }

  // 11. SUPPLEMENTS / CREATINE / WHEY / PRE-WORKOUT
  if (
    q.includes("supplement") ||
    q.includes("creatine") ||
    q.includes("whey") ||
    q.includes("vitamin") ||
    q.includes("omega") ||
    q.includes("fish oil") ||
    q.includes("bcaa") ||
    q.includes("eaa") ||
    q.includes("magnesium")
  ) {
    return `### Evidence-Based Supplement Protocol for ${c.athleteName} (${c.weightKg} kg)

For your **${c.goalLabel}** goal and **${c.trainingStyleLabel}** training style, here are the tier-1 scientifically validated supplements you can track in the **Supplements** tab of your STRAP Nutrition Tracker:

1. **Creatine Monohydrate (3–5g daily)**
   - *Calories/Macros*: 0 kcal, 0g protein.
   - *Protocol*: Take **5g (1 scoop) daily** at any consistent time with water or a meal. Saturates intramuscular phosphocreatine stores to boost 1–8 rep strength output and cell hydration.
2. **Whey Protein Isolate or Concentrate (1–2 scoops/day as needed)**
   - *Calories/Macros*: ~120 kcal, **24–25g protein** per 30–32g scoop.
   - *Protocol*: Use post-workout or between meals to help hit your **${c.targets.protein_g}g daily protein target** (you currently have **${c.todayNut.protein_g}g** logged today).
3. **Omega-3 Fish Oil (1000–2000mg combined EPA + DHA)**
   - *Protocol*: Take with a meal containing dietary fat to support joint recovery and cardiovascular health.
4. **Vitamin D3 (2000–4000 IU) + K2 & Magnesium Glycinate (300–400mg)**
   - *Protocol*: Vitamin D3+K2 with breakfast/lunch; Magnesium 45 minutes before sleep to support nervous system recovery.

*Educational Note: Supplements complement whole-food nutrition and are not medical treatments.*`;
  }

  // 12. MUSCLE GAIN / BULKING / HYPERTROPHY / SETS & REPS / RPE & RIR / CARDIO
  if (
    q.includes("bulk") ||
    q.includes("gain") ||
    q.includes("muscle") ||
    q.includes("grow") ||
    q.includes("hypertrophy") ||
    q.includes("volume") ||
    q.includes("rpe") ||
    q.includes("rir") ||
    q.includes("cardio")
  ) {
    const bulkCal = c.targets.tdee + 300;
    return `### Hypertrophy, Volume & Progressive Overload Guide for ${c.athleteName}

Tailored to your **${c.weightKg} kg** profile (${c.trainingStyleLabel} • **${c.goalLabel}**):

#### 1. Weekly Volume & Effort Landmarks (RPE / RIR)
- **Optimal Weekly Set Volume**: Aim for **10–18 hard working sets per muscle group per week**, split across **2 sessions/week** (5–9 sets per muscle per session).
- **Effort Calibration**: Take compound lifts (Squat, Bench, RDL, Row, Overhead Press) to **RPE 8–8.5 (1.5–2 RIR)** and isolation movements (Lateral Raises, Cable Flyes, Curls, Pushdowns, Leg Extensions) to **RPE 9–9.5 (0.5–1 RIR)** on the final set.
- **Double-Progression Rule**: Work inside a fixed rep range (e.g., 6–8 or 8–12 reps). When you hit the top of the rep range on all sets at RPE ≤ 8.5, add **+2.5 kg** next session.

#### 2. Caloric & Protein Alignment
- **Lean Muscle Accretion Target**: **${bulkCal} kcal/day** (+300 kcal above your **${c.targets.tdee} kcal** TDEE) with **${c.targets.protein_g}g protein/day** and **${c.targets.carbs_g}g carbs/day** to fuel glycogen-dependent training volume.
- **Cardio Pairing**: Perform **2–3 × 20–25 min Zone-2 LISS cardio** sessions (120–135 BPM) on rest days or after lifting to maximize work capacity and insulin sensitivity without interfering with hypertrophy.`;
  }

  // 13. DEFAULT CONTEXT-AWARE PERSONALIZED COACHING ANSWER
  return `### STRAP Coach Assessment for ${c.athleteName}

Regarding your question: **"${userMessage}"**

#### 1. Your Current Athlete Telemetry
- **Profile**: ${c.age} yrs • ${c.heightCm} cm • **${c.weightKg} kg** • Mode: **${c.trainingStyleLabel}** (${c.experience})
- **Primary Goal**: **${c.goalLabel}** (${c.weeklyDays} training days/week)
- **Daily Metabolic Targets**: **${c.targets.target_calories} kcal** (BMR: ${c.targets.bmr} kcal | TDEE: ${c.targets.tdee} kcal) • Protein: **${c.targets.protein_g}g** • Carbs: **${c.targets.carbs_g}g** • Fat: **${c.targets.fats_g}g**
- **Today's Logged Nutrition**: **${Math.round(c.todayNut.calories)} kcal** & **${c.todayNut.protein_g}g protein** across **${c.todayNut.entries.length} logged item(s)** • Water: **${c.todayNut.water_ml} ml**
- **Logged Workouts & PRs**: ${c.workouts.length} recent workout session(s) and ${c.prs.length} PR record(s) tracked.

#### 2. Direct Coaching Guidance
- **Training Execution**: In **${c.trainingStyleLabel}** mode, anchor your sessions around progressive overload at **RPE 7.5–8.5 (1.5–2.5 RIR)**. Add **+2.5 kg** or **+1 rep** whenever you complete all prescribed sets at the top of your target rep range with clean technique.
- **Nutrition & Recovery Alignment**: Stay within **±100 kcal** of your **${c.targets.target_calories} kcal** target, hit **${c.targets.protein_g}g protein** (**${(c.targets.protein_g / Math.max(1, c.weightKg)).toFixed(1)} g/kg**), drink **${(c.targets.water_ml / 1000).toFixed(1)} L water**, and get **7.5–8.5 hours** of sleep.`;
}

/**
 * HELPER: Build high-quality fallback workout plan
 */
function buildFallbackWorkoutPlan(
  metrics: Partial<FitnessMetrics>,
  goal: Partial<UserGoal>
): GeneratedWorkoutPlan {
  const days = goal.weekly_workout_days || 4;
  const exp = metrics.experience_level || "intermediate";

  if (days <= 3) {
    return {
      split_name: "3-Day Full Body Power & Hypertrophy",
      split_type: "Full Body",
      rationale:
        "Full-body splits maximize muscle protein synthesis frequency by stimulating every major muscle group 3 times weekly, optimal for a 3-day training schedule.",
      weekly_schedule: [
        {
          day_number: 1,
          day_title: "Full Body A (Chest, Quads, Back Focus)",
          focus: "Squat & Horizontal Push/Pull",
          warmup: ["5 min treadmill incline walk", "Leg swings", "Shoulder dislocates"],
          exercises: [
            {
              exercise_name: "Barbell Back Squat",
              target_muscle: "Quadriceps & Glutes",
              sets: 4,
              reps: "6-8",
              rest_seconds: 120,
              recommended_weight_kg: "75% 1RM",
              notes: "Maintain neutral spine, push knees out over toes.",
              alternatives: ["Goblet Squat", "Leg Press"],
            },
            {
              exercise_name: "Barbell Bench Press",
              target_muscle: "Chest",
              sets: 4,
              reps: "6-8",
              rest_seconds: 120,
              recommended_weight_kg: "75% 1RM",
              notes: "Pause 1 sec at sternum, drive heels into floor.",
              alternatives: ["Dumbbell Bench Press", "Push-ups"],
            },
            {
              exercise_name: "Barbell Bent-Over Row",
              target_muscle: "Lats & Rhomboids",
              sets: 3,
              reps: "8-10",
              rest_seconds: 90,
              recommended_weight_kg: "65-70% 1RM",
              notes: "Hinge at hips, pull through elbows.",
              alternatives: ["Seated Cable Row", "Dumbbell Row"],
            },
            {
              exercise_name: "Standing Calf Raise",
              target_muscle: "Calves",
              sets: 3,
              reps: "15",
              rest_seconds: 60,
              notes: "Full stretch at bottom, squeeze at peak.",
              alternatives: ["Seated Calf Raise"],
            },
          ],
          cooldown: ["Pigeon stretch", "Cobra stretch", "Doorway chest stretch"],
        },
        {
          day_number: 2,
          day_title: "Full Body B (Hips, Vertical Push/Pull)",
          focus: "Deadlift & Vertical Push/Pull",
          warmup: ["World's greatest stretch", "Band pull-aparts", "Glute bridges"],
          exercises: [
            {
              exercise_name: "Romanian Deadlift (RDL)",
              target_muscle: "Hamstrings & Glutes",
              sets: 3,
              reps: "8-10",
              rest_seconds: 120,
              notes: "Soft knees, push hips backward to wall.",
              alternatives: ["Lying Leg Curl", "Dumbbell RDL"],
            },
            {
              exercise_name: "Overhead Barbell Press",
              target_muscle: "Shoulders",
              sets: 4,
              reps: "6-8",
              rest_seconds: 90,
              notes: "Brace glutes and abs, lock out directly overhead.",
              alternatives: ["Dumbbell Shoulder Press"],
            },
            {
              exercise_name: "Lat Pulldown",
              target_muscle: "Lats",
              sets: 3,
              reps: "10-12",
              rest_seconds: 75,
              notes: "Drive elbows down to waist.",
              alternatives: ["Pull-ups", "Assisted Pull-ups"],
            },
            {
              exercise_name: "Plank Hold",
              target_muscle: "Abs & Core",
              sets: 3,
              reps: "45-60 sec",
              rest_seconds: 60,
              notes: "Squeeze glutes and brace core.",
              alternatives: ["Hanging Leg Raise"],
            },
          ],
          cooldown: ["Hamstring stretch", "Child's pose", "Lats foam rolling"],
        },
        {
          day_number: 3,
          day_title: "Full Body C (Hypertrophy & Pump)",
          focus: "Volume & Accessories",
          warmup: ["Light stationary bike 5 mins", "Dynamic lunges"],
          exercises: [
            {
              exercise_name: "Incline Dumbbell Press",
              target_muscle: "Upper Chest",
              sets: 3,
              reps: "10-12",
              rest_seconds: 75,
              notes: "30-degree incline, 3 second lowering tempo.",
              alternatives: ["Incline Barbell Press"],
            },
            {
              exercise_name: "Bulgarian Split Squat",
              target_muscle: "Quads & Glutes",
              sets: 3,
              reps: "10-12 / leg",
              rest_seconds: 90,
              notes: "Front foot planted firmly, descend vertically.",
              alternatives: ["Walking Lunges"],
            },
            {
              exercise_name: "Dumbbell Lateral Raise",
              target_muscle: "Side Delts",
              sets: 4,
              reps: "12-15",
              rest_seconds: 60,
              notes: "Lead with elbows, pause 1s at top.",
              alternatives: ["Cable Lateral Raise"],
            },
            {
              exercise_name: "Barbell Bicep Curl",
              target_muscle: "Biceps",
              sets: 3,
              reps: "10-12",
              rest_seconds: 60,
              notes: "Keep elbows fixed at sides.",
              alternatives: ["Dumbbell Hammer Curl"],
            },
            {
              exercise_name: "Tricep Rope Pushdown",
              target_muscle: "Triceps",
              sets: 3,
              reps: "12-15",
              rest_seconds: 60,
              notes: "Flare rope at bottom contraction.",
              alternatives: ["Dips"],
            },
          ],
          cooldown: ["Upper body stretches", "Quad stretch"],
        },
      ],
      progressive_overload_rules: [
        "Increase load by 2.5kg whenever you hit the maximum prescribed reps on all working sets with clean form.",
        "If you fall 2 reps short of the target, keep the same load for the next session and focus on rep recovery.",
      ],
    };
  }

  // 4-6 Days: Upper / Lower or Push Pull Legs
  return {
    split_name: "4-Day Upper / Lower Hypertrophy Split",
    split_type: "Upper / Lower",
    rationale:
      "The 4-Day Upper/Lower split provides the premier balance between progressive overload frequency (each muscle group hit 2x/week) and systemic recovery (3 full rest days).",
    weekly_schedule: [
      {
        day_number: 1,
        day_title: "Upper Day 1: Heavy Push & Pull",
        focus: "Chest, Back, Shoulders Power",
        warmup: ["Band pull-aparts", "Shoulder circles", "Warm-up bench sets"],
        exercises: [
          {
            exercise_name: "Barbell Bench Press",
            target_muscle: "Chest",
            sets: 4,
            reps: "6-8",
            rest_seconds: 120,
            recommended_weight_kg: "75-80% 1RM",
            notes: "Keep shoulder blades pinned to bench.",
            alternatives: ["Dumbbell Bench Press"],
          },
          {
            exercise_name: "Barbell Bent-Over Row",
            target_muscle: "Lats & Upper Back",
            sets: 4,
            reps: "6-8",
            rest_seconds: 90,
            recommended_weight_kg: "70% 1RM",
            notes: "Hinge at 45 degrees, pull through elbows.",
            alternatives: ["Single-Arm Dumbbell Row"],
          },
          {
            exercise_name: "Overhead Barbell Press",
            target_muscle: "Shoulders",
            sets: 3,
            reps: "8-10",
            rest_seconds: 90,
            notes: "Strict form, no leg drive.",
            alternatives: ["Dumbbell Arnold Press"],
          },
          {
            exercise_name: "Lat Pulldown",
            target_muscle: "Lats",
            sets: 3,
            reps: "10-12",
            rest_seconds: 75,
            notes: "Control the eccentric return.",
            alternatives: ["Pull-ups"],
          },
          {
            exercise_name: "Tricep Rope Pushdown",
            target_muscle: "Triceps",
            sets: 3,
            reps: "12-15",
            rest_seconds: 60,
            notes: "Lock out elbows at bottom.",
            alternatives: ["Skull Crushers"],
          },
        ],
        cooldown: ["Doorway chest stretch", "Lats hang"],
      },
      {
        day_number: 2,
        day_title: "Lower Day 1: Quad Dominant & Core",
        focus: "Squat, Quads, Calves & Abs",
        warmup: ["Leg swings", "Bodyweight squats", "Hip openers"],
        exercises: [
          {
            exercise_name: "Barbell Back Squat",
            target_muscle: "Quadriceps",
            sets: 4,
            reps: "6-8",
            rest_seconds: 150,
            recommended_weight_kg: "75-80% 1RM",
            notes: "Hit parallel depth, push through whole foot.",
            alternatives: ["Goblet Squat", "Leg Press"],
          },
          {
            exercise_name: "Romanian Deadlift (RDL)",
            target_muscle: "Hamstrings",
            sets: 3,
            reps: "8-10",
            rest_seconds: 90,
            notes: "Feel the hamstring stretch at bottom.",
            alternatives: ["Lying Leg Curl"],
          },
          {
            exercise_name: "Bulgarian Split Squat",
            target_muscle: "Quadriceps & Glutes",
            sets: 3,
            reps: "10-12",
            rest_seconds: 90,
            notes: "Torso slightly leaned forward.",
            alternatives: ["Walking Lunges"],
          },
          {
            exercise_name: "Standing Calf Raise",
            target_muscle: "Calves",
            sets: 4,
            reps: "15",
            rest_seconds: 60,
            notes: "2 second pause at the bottom stretch.",
            alternatives: ["Seated Calf Raise"],
          },
          {
            exercise_name: "Hanging Leg Raise",
            target_muscle: "Abs",
            sets: 3,
            reps: "12-15",
            rest_seconds: 60,
            notes: "Avoid swinging, curl pelvis upward.",
            alternatives: ["Plank Hold"],
          },
        ],
        cooldown: ["Hamstring stretch", "Quad foam rolling"],
      },
      {
        day_number: 3,
        day_title: "Upper Day 2: Hypertrophy & Volume",
        focus: "Chest, Back & Arm Hypertrophy",
        warmup: ["Arm circles", "Push-ups 10 reps"],
        exercises: [
          {
            exercise_name: "Incline Dumbbell Press",
            target_muscle: "Upper Chest",
            sets: 4,
            reps: "8-12",
            rest_seconds: 90,
            notes: "Controlled 3-second descent.",
            alternatives: ["Incline Barbell Press"],
          },
          {
            exercise_name: "Seated Cable Row",
            target_muscle: "Rhomboids & Lats",
            sets: 3,
            reps: "10-12",
            rest_seconds: 75,
            notes: "Squeeze shoulder blades together.",
            alternatives: ["Chest-Supported Row"],
          },
          {
            exercise_name: "Dumbbell Lateral Raise",
            target_muscle: "Lateral Deltoids",
            sets: 4,
            reps: "12-15",
            rest_seconds: 60,
            notes: "Lead with elbows.",
            alternatives: ["Cable Lateral Raise"],
          },
          {
            exercise_name: "Cable Chest Flye",
            target_muscle: "Chest",
            sets: 3,
            reps: "12-15",
            rest_seconds: 60,
            notes: "Hug an imaginary tree, 1s peak squeeze.",
            alternatives: ["Pec Deck"],
          },
          {
            exercise_name: "Barbell Bicep Curl",
            target_muscle: "Biceps",
            sets: 3,
            reps: "10-12",
            rest_seconds: 60,
            notes: "No hip swing.",
            alternatives: ["Incline Dumbbell Curl"],
          },
        ],
        cooldown: ["Chest & Bicep wall stretch"],
      },
      {
        day_number: 4,
        day_title: "Lower Day 2: Posterior Chain & Hamstrings",
        focus: "Deadlift & Glute Focus",
        warmup: ["Glute bridges", "Good mornings with band"],
        exercises: [
          {
            exercise_name: "Conventional Deadlift",
            target_muscle: "Posterior Chain",
            sets: 4,
            reps: "5",
            rest_seconds: 180,
            recommended_weight_kg: "80% 1RM",
            notes: "Tight lats, drive floor away.",
            alternatives: ["Trap Bar Deadlift"],
          },
          {
            exercise_name: "Barbell Hip Thrust",
            target_muscle: "Glutes",
            sets: 4,
            reps: "10-12",
            rest_seconds: 90,
            notes: "Full lockout at top, 2s pause.",
            alternatives: ["Dumbbell Hip Thrust"],
          },
          {
            exercise_name: "Leg Extension",
            target_muscle: "Quads",
            sets: 3,
            reps: "12-15",
            rest_seconds: 60,
            notes: "Squeeze quads hard at the top.",
            alternatives: ["Sissy Squats"],
          },
          {
            exercise_name: "Lying Leg Curl",
            target_muscle: "Hamstrings",
            sets: 3,
            reps: "12-15",
            rest_seconds: 60,
            notes: "Don't let hips rise off pad.",
            alternatives: ["Seated Leg Curl"],
          },
          {
            exercise_name: "Cable Woodchoppers",
            target_muscle: "Obliques",
            sets: 3,
            reps: "12 / side",
            rest_seconds: 60,
            notes: "Controlled rotational power.",
            alternatives: ["Russian Twists"],
          },
        ],
        cooldown: ["Glute pigeon stretch", "Hamstring towel stretch"],
      },
    ],
    progressive_overload_rules: [
      "Add +2.5kg to upper body compounds and +5kg to lower body compounds once you hit the top rep ceiling on all working sets.",
      "Track RPE: If RPE is 9-10 on set 1, keep the weight static until all sets stay <= RPE 8.",
    ],
  };
}
