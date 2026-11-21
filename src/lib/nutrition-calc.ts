export type FitnessGoalType =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'maintenance'
  | 'strength'
  | 'general_fitness'
  | 'endurance';

export type TrainingStyleType = 'powerlifting' | 'muscle_building';

export interface NutritionTargetInput {
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  weekly_workout_days?: number | null;
  experience_level?: string | null;
  primary_goal?: string | null;
  training_style?: string | null;
  custom_overrides?: Partial<{
    target_calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    fiber_g: number;
    water_ml: number;
  }> | null;
}

export interface CalculatedNutritionTargets {
  bmr: number;
  tdee: number;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  water_ml: number;
  water_liters: number;
  calorie_delta: number;
  goal_label: string;
  explanation: string;
  disclaimer: string;
}

const GOAL_LABELS: Record<string, string> = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  recomposition: 'Body Recomposition',
  maintenance: 'Weight Maintenance',
  strength: 'Strength Improvement',
  general_fitness: 'General Fitness',
  endurance: 'Athletic Endurance',
};

/**
 * Evidence-based Mifflin-St Jeor BMR, TDEE, and macronutrient target calculator.
 * Never returns identical hardcoded values across different user profiles.
 */
export function calculateNutritionTargets(input: NutritionTargetInput = {}): CalculatedNutritionTargets {
  const age = Math.min(100, Math.max(13, Number(input.age) || 26));
  const heightCm = Math.min(250, Math.max(90, Number(input.height_cm) || 175));
  const weightKg = Math.min(350, Math.max(25, Number(input.weight_kg) || 72));
  const gender = (input.gender || 'male').toLowerCase();
  const activity = (input.activity_level || 'moderately_active').toLowerCase();
  const workoutDays = Math.min(7, Math.max(1, Number(input.weekly_workout_days) || 4));
  const goal = (input.primary_goal || 'muscle_gain').toLowerCase();
  const style = (input.training_style || 'muscle_building').toLowerCase();

  // 1. Mifflin-St Jeor BMR
  const genderOffset = gender === 'female' ? -161 : gender === 'male' ? 5 : -78;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + genderOffset);

  // 2. Activity multiplier calibrated with weekly training frequency
  const baseMult: Record<string, number> = {
    sedentary: 1.25,
    lightly_active: 1.375,
    moderately_active: 1.52,
    very_active: 1.7,
  };
  const freqAdjust = (workoutDays - 4) * 0.035;
  const multiplier = Math.min(1.95, Math.max(1.2, (baseMult[activity] || 1.52) + freqAdjust));
  const tdee = Math.round(bmr * multiplier);

  // 3. Goal-calibrated caloric target
  let calorieDelta = 0;
  let proteinPerKg = 2.0;
  let fatRatio = 0.25;

  switch (goal) {
    case 'fat_loss':
      calorieDelta = -Math.min(550, Math.round(tdee * 0.2));
      proteinPerKg = 2.2;
      fatRatio = 0.25;
      break;
    case 'muscle_gain':
      calorieDelta = Math.round(tdee * 0.11); // ~250-320 kcal lean surplus
      proteinPerKg = 2.0;
      fatRatio = 0.25;
      break;
    case 'recomposition':
      calorieDelta = -Math.round(tdee * 0.05); // slight ~100-150 kcal deficit with high protein
      proteinPerKg = 2.25;
      fatRatio = 0.25;
      break;
    case 'strength':
      calorieDelta = Math.round(tdee * 0.08);
      proteinPerKg = 2.1;
      fatRatio = 0.27;
      break;
    case 'maintenance':
    case 'general_fitness':
    default:
      calorieDelta = 0;
      proteinPerKg = 1.8;
      fatRatio = 0.26;
      break;
  }

  if (style === 'powerlifting' && proteinPerKg < 2.0) {
    proteinPerKg = 2.0;
  }

  const rawTargetCalories = Math.max(1200, tdee + calorieDelta);
  const target_calories =
    Number(input.custom_overrides?.target_calories) > 800
      ? Math.round(Number(input.custom_overrides!.target_calories))
      : rawTargetCalories;

  const rawProtein = Math.round(weightKg * proteinPerKg);
  const protein_g =
    Number(input.custom_overrides?.protein_g) > 20
      ? Math.round(Number(input.custom_overrides!.protein_g))
      : rawProtein;

  const rawFats = Math.max(40, Math.round((target_calories * fatRatio) / 9));
  const fats_g =
    Number(input.custom_overrides?.fats_g) > 15
      ? Math.round(Number(input.custom_overrides!.fats_g))
      : rawFats;

  const remainingCals = Math.max(160, target_calories - protein_g * 4 - fats_g * 9);
  const rawCarbs = Math.round(remainingCals / 4);
  const carbs_g =
    Number(input.custom_overrides?.carbs_g) >= 20
      ? Math.round(Number(input.custom_overrides!.carbs_g))
      : rawCarbs;

  const fiber_g =
    Number(input.custom_overrides?.fiber_g) > 5
      ? Math.round(Number(input.custom_overrides!.fiber_g))
      : Math.max(22, Math.round((target_calories / 1000) * 14));

  const water_ml =
    Number(input.custom_overrides?.water_ml) >= 1000
      ? Math.round(Number(input.custom_overrides!.water_ml))
      : Math.round(weightKg * 38 + workoutDays * 110);

  const water_liters = Math.round((water_ml / 1000) * 10) / 10;
  const goal_label = GOAL_LABELS[goal] || 'General Fitness';
  const actualDelta = target_calories - tdee;

  const explanation = `Calibrated using the Mifflin-St Jeor equation for ${weightKg} kg, ${heightCm} cm, age ${age} (${workoutDays} training days/week). BMR: ${bmr} kcal/day • TDEE: ${tdee} kcal/day • Target: ${target_calories} kcal/day (${actualDelta > 0 ? `+${actualDelta} kcal surplus` : actualDelta < 0 ? `${actualDelta} kcal deficit` : 'maintenance balance'}) for ${goal_label}.`;

  const disclaimer =
    'Calculated calorie, macronutrient, and hydration values are evidence-based starting estimates for athletic training and education, not medical or clinical prescriptions.';

  return {
    bmr,
    tdee,
    target_calories,
    protein_g,
    carbs_g,
    fats_g,
    fiber_g,
    water_ml,
    water_liters,
    calorie_delta: actualDelta,
    goal_label,
    explanation,
    disclaimer,
  };
}
