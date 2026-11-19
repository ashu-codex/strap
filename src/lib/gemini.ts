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
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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

  if (genAI && apiKey && apiKey !== "your-gemini-api-key") {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
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

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const plan = extractJsonFromText<GeneratedWorkoutPlan>(text);
      return { plan, isAiGenerated: true };
    } catch (error) {
      console.warn("Gemini API call failed, utilizing high-precision fallback engine:", error);
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

  if (genAI && apiKey && apiKey !== "your-gemini-api-key") {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
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

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const plan = extractJsonFromText<NutritionPlan>(text);
      return { plan, isAiGenerated: true };
    } catch (err) {
      console.warn("Gemini nutrition call failed, falling back to scientific formulas:", err);
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

  if (genAI && apiKey && apiKey !== "your-gemini-api-key") {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
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

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const analysis = extractJsonFromText<RecoveryAnalysis>(text);
      return { analysis, isAiGenerated: true };
    } catch (err) {
      console.warn("Gemini recovery call failed, falling back to rule engine:", err);
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

  if (genAI && apiKey && apiKey !== "your-gemini-api-key") {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
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

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const adaptation = extractJsonFromText<WeeklyAdaptation>(text);
      return { adaptation, isAiGenerated: true };
    } catch (err) {
      console.warn("Gemini weekly adaptation failed, falling back to rule engine:", err);
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

/**
 * AI FITNESS ASSISTANT INTERACTIVE CHAT
 */
export async function chatWithAIAssistant(
  userMessage: string,
  history: { role: "user" | "model"; parts: string }[] = [],
  userContext?: { name?: string; goal?: string; weight?: number; plan?: string }
): Promise<string> {
  if (genAI && apiKey && apiKey !== "your-gemini-api-key") {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.6 },
        systemInstruction: `You are the STRAP AI Fitness Coach.
Your philosophy: Science-based, encouraging, precise, and practical.
Brand: STRAP (Start, Train, Recover, Adapt, Progress).
Tagline: Train Smart. Recover Better. Progress Faster.
Client Context:
- Name: ${userContext?.name || "Athlete"}
- Current Goal: ${userContext?.goal || "Fitness & Strength"}
- Weight: ${userContext?.weight || "75"} kg
- Membership: ${userContext?.plan || "Premium"}

Guidelines:
1. Provide concise, actionable fitness, nutrition, and recovery advice.
2. Structure answers with clean bullet points and bold highlights.
3. Recommend safe progressive overload, mobility, and recovery strategies.
4. If asked about medical diagnoses or prescription medications, remind them to consult a qualified physician.`,
      });

      const chat = model.startChat({
        history: history.map((h) => ({
          role: h.role,
          parts: [{ text: h.parts }],
        })),
      });

      const response = await chat.sendMessage(userMessage);
      return response.response.text();
    } catch (err) {
      console.warn("Gemini chat failed, fallback response:", err);
    }
  }

  // Graceful conversational response when API key is pending
  return `**STRAP AI Assistant** (Local Coach Mode)\n\nThank you for reaching out regarding: "${userMessage}".\n\n- **Training Insight**: Always prioritize movement quality over raw weight. Progressive overload can be achieved via load, reps, tempo, or reduced rest intervals.\n- **Recovery & Nutrition**: Ensure adequate daily protein (1.6 - 2.2g/kg) and target 7-8 hours of continuous sleep to maximize muscle protein synthesis.\n- **Adaptive Next Step**: Check your active workout plan in the **Workout Planner** and log your sets in the **Workout Tracker** to enable continuous AI adaptation.\n\n*(Note: To unlock live conversational Gemini reasoning, configure \`GEMINI_API_KEY\` in your \`.env.local\` file!)*`;
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
