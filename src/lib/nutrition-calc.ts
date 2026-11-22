import { calculateAgeFromDob } from '@/lib/units';

export type FitnessGoalType =
  | 'muscle_gain'
  | 'fat_loss'
  | 'weight_gain'
  | 'weight_loss'
  | 'recomposition'
  | 'maintenance'
  | 'strength'
  | 'general_fitness'
  | 'endurance';

export type TrainingStyleType = 'muscle_building' | 'powerlifting' | 'general_fitness';

export interface CustomNutritionTargets {
  enabled?: boolean;
  target_calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fats_g?: number | null;
  fiber_g?: number | null;
  water_ml?: number | null;
  updated_at?: string | null;
}

export interface NutritionTargetInput {
  age?: number | null;
  date_of_birth?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  target_weight_kg?: number | null;
  activity_level?: string | null;
  daily_steps_avg?: number | null;
  weekly_workout_days?: number | null;
  experience_level?: string | null;
  primary_goal?: string | null;
  training_style?: string | null;
  selected_calorie_option_id?: string | null;
  protein_target_preference_g?: number | null;
  custom_overrides?: CustomNutritionTargets | null;
}

export interface CalorieOption {
  id: string;
  goalGroup:
    | 'fat_loss'
    | 'muscle_gain'
    | 'weight_gain'
    | 'recomposition'
    | 'maintenance'
    | 'strength'
    | 'general_fitness';
  label: string;
  subtitle: string;
  intensity: 'Maintenance' | 'Mild' | 'Moderate' | 'Faster' | 'Aggressive' | 'Conservative';
  dailyCalories: number;
  /** Signed daily adjustment vs TDEE (negative = deficit, positive = surplus, 0 = maintenance). */
  dailyDelta: number;
  /** Estimated weekly weight change in kg/week ONLY for planning deficits (negative) or null when not promised. */
  weeklyWeightChangeKg: number | null;
  /** Percentage of estimated maintenance calories (e.g. 81 means 81% of TDEE). */
  percentOfMaintenance: number;
  /** Approximate weeks to target weight ONLY when valid target_weight_kg aligns with option direction. */
  estimatedWeeksToTarget: number | null;
  recommended: boolean;
  allowed: boolean;
  status: 'recommended' | 'suitable' | 'caution' | 'unsafe';
  warning?: string;
  guidance?: string;
}

export interface MacroTargetBreakdown {
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  water_ml: number;
  water_liters: number;
  protein_per_kg: number;
  macro_calories_sum: number;
  calorie_delta: number;
}

export interface PersonalizedNutritionPlan {
  isComplete: boolean;
  missingFields: string[];
  goal: FitnessGoalType;
  goalLabel: string;
  bmr: number | null;
  tdee: number | null;
  maintenanceCalories: number | null;
  activityMultiplier: number | null;
  bmi: number | null;
  genderAssumptionNote: string | null;
  sectionTitle: string;
  sectionSubtitle: string;
  goalGuidanceNote: string;
  options: CalorieOption[];
  selectedOptionId: string | null;
  selectedOption: CalorieOption | null;
  recommendedTargets: MacroTargetBreakdown | null;
  customTargets: CustomNutritionTargets | null;
  activeTargets: MacroTargetBreakdown | null;
  targetSource: 'calculated' | 'custom' | 'incomplete';
  disclaimer: string;
  safetyAlerts: string[];
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
  selected_option_id?: string | null;
  selected_option_label?: string | null;
  target_source?: 'calculated' | 'custom';
  explanation: string;
  disclaimer: string;
}

export const GOAL_LABELS: Record<string, string> = {
  muscle_gain: 'Muscle Gain',
  fat_loss: 'Fat Loss',
  weight_gain: 'Weight Gain',
  weight_loss: 'Weight Loss',
  recomposition: 'Body Recomposition',
  maintenance: 'Maintain Weight',
  strength: 'Strength Development',
  general_fitness: 'General Fitness',
  endurance: 'Athletic Endurance',
};

const KCAL_PER_KG_ESTIMATE = 7700;

export function normalizeGoal(raw?: string | null): FitnessGoalType {
  const g = String(raw || '').trim().toLowerCase();
  if (g in GOAL_LABELS) return g as FitnessGoalType;
  return 'general_fitness';
}

export function resolveEffectiveAge(age?: number | null, dob?: string | null): number | null {
  const fromDob = calculateAgeFromDob(dob);
  if (fromDob !== null) return fromDob;
  if (age != null && Number.isFinite(Number(age)) && Number(age) >= 10 && Number(age) <= 100) {
    return Math.round(Number(age));
  }
  return null;
}

/**
 * Calculate macros strictly matching calorie math:
 *  Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g.
 * Uses configurable evidence-based protein ranges rather than one universal value.
 */
export function calculateMacrosForCalories(params: {
  targetCalories: number;
  tdee: number;
  weightKg: number;
  heightCm?: number | null;
  goal: FitnessGoalType;
  weeklyWorkoutDays?: number | null;
  trainingStyle?: string | null;
  proteinTargetPreferenceG?: number | null;
}): MacroTargetBreakdown {
  const targetCalories = Math.max(800, Math.round(params.targetCalories));
  const weightKg = Math.max(25, Number(params.weightKg));
  const workoutDays =
    params.weeklyWorkoutDays != null && Number.isFinite(Number(params.weeklyWorkoutDays))
      ? Math.min(7, Math.max(1, Number(params.weeklyWorkoutDays)))
      : 4;
  const style = String(params.trainingStyle || 'muscle_building').toLowerCase();

  // Compute reference weight for protein so high-BMI users aren't assigned extreme protein grams
  let proteinReferenceKg = weightKg;
  if (params.heightCm && Number(params.heightCm) > 90) {
    const heightM = Number(params.heightCm) / 100;
    const bmi = weightKg / (heightM * heightM);
    if (bmi > 30) {
      // Blend toward reference BMI-25 weight + 25% of excess body weight (evidence-based lean adjustment)
      const refWeight = 25 * heightM * heightM;
      proteinReferenceKg = refWeight + (weightKg - refWeight) * 0.25;
    }
  }

  // Evidence-based protein ranges (g/kg) calibrated by goal & training volume
  let proteinPerKg = 1.8;
  let fatShare = 0.26;

  switch (params.goal) {
    case 'fat_loss':
    case 'weight_loss':
      proteinPerKg = workoutDays >= 5 ? 2.2 : 2.05;
      fatShare = 0.26;
      break;
    case 'recomposition':
      proteinPerKg = workoutDays >= 5 ? 2.25 : 2.1;
      fatShare = 0.26;
      break;
    case 'muscle_gain':
      proteinPerKg = workoutDays >= 5 ? 2.0 : 1.9;
      fatShare = 0.25;
      break;
    case 'strength':
      proteinPerKg = style === 'powerlifting' ? 2.05 : 1.95;
      fatShare = 0.27;
      break;
    case 'weight_gain':
      proteinPerKg = 1.8;
      fatShare = 0.26;
      break;
    case 'maintenance':
    case 'general_fitness':
    case 'endurance':
    default:
      proteinPerKg = workoutDays >= 5 ? 1.85 : 1.7;
      fatShare = 0.27;
      break;
  }

  if (style === 'powerlifting' && proteinPerKg < 1.95) {
    proteinPerKg = 1.95;
  }

  let protein_g = Math.round(proteinReferenceKg * proteinPerKg);
  if (
    params.proteinTargetPreferenceG != null &&
    Number.isFinite(Number(params.proteinTargetPreferenceG)) &&
    Number(params.proteinTargetPreferenceG) >= 40 &&
    Number(params.proteinTargetPreferenceG) <= 450
  ) {
    // Respect explicit nutrition protein preference if it fits cleanly within calories
    const prefG = Math.round(Number(params.proteinTargetPreferenceG));
    if (prefG * 4 <= targetCalories * 0.5) {
      protein_g = prefG;
    }
  }

  // Ensure protein stays within physiologically sane bounds (<= 45% of calories)
  const maxProteinG = Math.floor((targetCalories * 0.45) / 4);
  protein_g = Math.max(45, Math.min(maxProteinG, protein_g));

  // Fat: minimum 0.65 g/kg (or 40g) for hormonal health, capped at 35% of calories
  const minFatG = Math.max(40, Math.round(proteinReferenceKg * 0.65));
  const desiredFatG = Math.round((targetCalories * fatShare) / 9);
  const maxFatG = Math.floor((targetCalories * 0.38) / 9);
  let fats_g = Math.min(maxFatG, Math.max(minFatG, desiredFatG));

  // Carbs absorb remaining calories so macro sum closely matches targetCalories
  let remainingCals = targetCalories - protein_g * 4 - fats_g * 9;
  if (remainingCals < 120) {
    // Rebalance fat slightly if calories are very tight
    const availableForFat = Math.max(30, Math.floor((targetCalories - protein_g * 4 - 120) / 9));
    fats_g = Math.min(fats_g, availableForFat);
    remainingCals = Math.max(80, targetCalories - protein_g * 4 - fats_g * 9);
  }
  const carbs_g = Math.max(20, Math.round(remainingCals / 4));

  const fiber_g = Math.max(22, Math.min(50, Math.round((targetCalories / 1000) * 14)));
  const water_ml = Math.round(weightKg * 35 + workoutDays * 100);
  const water_liters = Math.round((water_ml / 1000) * 10) / 10;
  const macro_calories_sum = protein_g * 4 + carbs_g * 4 + fats_g * 9;

  return {
    target_calories: targetCalories,
    protein_g,
    carbs_g,
    fats_g,
    fiber_g,
    water_ml,
    water_liters,
    protein_per_kg: Math.round((protein_g / weightKg) * 100) / 100,
    macro_calories_sum,
    calorie_delta: targetCalories - params.tdee,
  };
}

/**
 * Full Personalized Calorie, Goal Pace & Macro Engine (Mifflin-St Jeor).
 * - Never invents missing biometrics: returns `isComplete: false` with `missingFields` when required inputs are absent.
 * - Generates goal-specific calorie options with individualized safety evaluation (no blind universal floor).
 * - Preserves manual/custom user targets separately from calculated recommendations.
 */
export function calculatePersonalizedNutritionPlan(
  input: NutritionTargetInput = {}
): PersonalizedNutritionPlan {
  const goal = normalizeGoal(input.primary_goal);
  const goalLabel = GOAL_LABELS[goal] || 'General Fitness';

  const age = resolveEffectiveAge(input.age, input.date_of_birth);
  const heightCm =
    input.height_cm != null && Number.isFinite(Number(input.height_cm)) && Number(input.height_cm) >= 90 && Number(input.height_cm) <= 250
      ? Number(input.height_cm)
      : null;
  const weightKg =
    input.weight_kg != null && Number.isFinite(Number(input.weight_kg)) && Number(input.weight_kg) >= 20 && Number(input.weight_kg) <= 500
      ? Number(input.weight_kg)
      : null;
  const targetWeightKg =
    input.target_weight_kg != null && Number.isFinite(Number(input.target_weight_kg)) && Number(input.target_weight_kg) >= 20 && Number(input.target_weight_kg) <= 500
      ? Number(input.target_weight_kg)
      : null;

  const missingFields: string[] = [];
  if (age === null) missingFields.push('Age or Date of Birth');
  if (heightCm === null) missingFields.push('Height');
  if (weightKg === null) missingFields.push('Current Body Weight');

  const rawCustom = input.custom_overrides || null;
  const hasActiveCustom = Boolean(
    rawCustom &&
      (rawCustom.enabled !== false) &&
      Number(rawCustom.target_calories) >= 800
  );

  const disclaimer =
    'All BMR, TDEE, calorie, and macronutrient figures are planning estimates based on the Mifflin-St Jeor equation—not guaranteed outcomes or medical prescriptions. Individual metabolism varies; monitor real multi-week trends and consult a qualified healthcare or nutrition professional when needed.';

  if (missingFields.length > 0) {
    let customActive: MacroTargetBreakdown | null = null;
    if (hasActiveCustom && rawCustom) {
      const cals = Math.round(Number(rawCustom.target_calories));
      const p = Math.round(Number(rawCustom.protein_g) || Math.round((cals * 0.3) / 4));
      const f = Math.round(Number(rawCustom.fats_g) || Math.round((cals * 0.25) / 9));
      const c = Math.round(Number(rawCustom.carbs_g) || Math.max(20, Math.round((cals - p * 4 - f * 9) / 4)));
      const fib = Math.round(Number(rawCustom.fiber_g) || Math.max(22, Math.round((cals / 1000) * 14)));
      const wml = Math.round(Number(rawCustom.water_ml) || 2500);
      customActive = {
        target_calories: cals,
        protein_g: p,
        carbs_g: c,
        fats_g: f,
        fiber_g: fib,
        water_ml: wml,
        water_liters: Math.round((wml / 1000) * 10) / 10,
        protein_per_kg: 0,
        macro_calories_sum: p * 4 + c * 4 + f * 9,
        calorie_delta: 0,
      };
    }

    return {
      isComplete: false,
      missingFields,
      goal,
      goalLabel,
      bmr: null,
      tdee: null,
      maintenanceCalories: null,
      activityMultiplier: null,
      bmi: null,
      genderAssumptionNote: null,
      sectionTitle: 'Complete Your Profile to Calculate Personalized Calories',
      sectionSubtitle: `Add ${missingFields.join(', ')} to estimate your BMR, TDEE, and personalized ${goalLabel} calorie targets.`,
      goalGuidanceNote: 'STRAP never invents fake biometrics. Once your required details are saved, your personalized options appear immediately.',
      options: [],
      selectedOptionId: null,
      selectedOption: null,
      recommendedTargets: null,
      customTargets: hasActiveCustom ? rawCustom : null,
      activeTargets: customActive,
      targetSource: customActive ? 'custom' : 'incomplete',
      disclaimer,
      safetyAlerts: [],
    };
  }

  // All required biometrics are present
  const gender = String(input.gender || '').trim().toLowerCase();
  let genderOffset = -78;
  let genderAssumptionNote: string | null = null;
  if (gender === 'male') {
    genderOffset = 5;
  } else if (gender === 'female') {
    genderOffset = -161;
  } else {
    genderOffset = -78;
    genderAssumptionNote =
      'Using the midpoint Mifflin-St Jeor offset because male/female was not specified. You can refine this in Personal Details if desired.';
  }

  const bmr = Math.round(10 * weightKg! + 6.25 * heightCm! - 5 * age! + genderOffset);
  const heightM = heightCm! / 100;
  const bmi = Math.round((weightKg! / (heightM * heightM)) * 10) / 10;

  // Activity multiplier (recognized tiers + subtle workout frequency calibration)
  const activity = String(input.activity_level || 'moderately_active').toLowerCase();
  const baseMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.85,
  };
  const baseMult = baseMultipliers[activity] ?? 1.55;
  const workoutDays =
    input.weekly_workout_days != null && Number.isFinite(Number(input.weekly_workout_days))
      ? Math.min(7, Math.max(1, Number(input.weekly_workout_days)))
      : null;
  const workoutAdjustment = workoutDays !== null ? (workoutDays - 4) * 0.03 : 0;
  const stepsAdjustment =
    input.daily_steps_avg != null && Number(input.daily_steps_avg) >= 10000
      ? 0.04
      : input.daily_steps_avg != null && Number(input.daily_steps_avg) > 0 && Number(input.daily_steps_avg) < 4000
      ? -0.03
      : 0;

  const activityMultiplier =
    Math.round(Math.min(1.95, Math.max(1.2, baseMult + workoutAdjustment + stepsAdjustment)) * 1000) / 1000;
  const tdee = Math.round(bmr * activityMultiplier);

  const safetyAlerts: string[] = [];
  if (age! < 18) {
    safetyAlerts.push(
      'Because you are under 18, growing bodies have higher energy needs. Avoid aggressive calorie deficits and consult a physician or sports dietitian before restricting calories.'
    );
  } else if (age! >= 65) {
    safetyAlerts.push(
      'For adults 65+, preserving lean muscle and bone density is essential. Avoid steep calorie deficits and consider professional nutrition guidance.'
    );
  }
  if (bmi < 18.5) {
    safetyAlerts.push(
      `Your estimated BMI (${bmi}) is below 18.5. Weight-loss deficits are not recommended without medical supervision.`
    );
  }

  let sectionTitle = 'Daily Calorie Estimate';
  let sectionSubtitle = 'Calculated dynamically from your Mifflin-St Jeor BMR and activity profile.';
  let goalGuidanceNote = '';
  const options: CalorieOption[] = [];

  if (goal === 'fat_loss' || goal === 'weight_loss') {
    sectionTitle = 'Choose Your Weight Loss Pace';
    sectionSubtitle =
      'Four personalized calorie planning options derived from your estimated maintenance calories (~7,700 kcal/kg estimate).';
    goalGuidanceNote =
      'Moderate Fat Loss (~0.5 kg/week) balances sustainable fat reduction, training performance, and lean muscle preservation for most adults when safe.';

    // Individualized safe floor — considers BMR, body weight, sex, age, and BMI (never one blind number!)
    const sexRefFloor = gender === 'male' ? 1400 : gender === 'female' ? 1200 : 1300;
    const bmrFloor = Math.round(bmr * 0.92);
    const weightFloor = Math.round(weightKg! * 20);
    const individualizedSafeFloor = Math.max(sexRefFloor, bmrFloor, weightFloor);

    const isYouthOrSenior = age! < 18 || age! >= 65;
    const isLowWeightOrBmi = bmi < 19.5;
    const weightToLoseKg =
      targetWeightKg !== null && targetWeightKg < weightKg! ? weightKg! - targetWeightKg : null;

    const paceSpecs: {
      id: string;
      label: string;
      subtitle: string;
      intensity: CalorieOption['intensity'];
      weeklyLossKg: number;
      deficitKcal: number;
    }[] = [
      {
        id: 'fat_loss_mild',
        label: 'Mild Fat Loss',
        subtitle: '~0.25 kg / week',
        intensity: 'Mild',
        weeklyLossKg: 0.25,
        deficitKcal: Math.round((0.25 * KCAL_PER_KG_ESTIMATE) / 7), // 275 kcal
      },
      {
        id: 'fat_loss_moderate',
        label: 'Moderate Fat Loss',
        subtitle: '~0.5 kg / week',
        intensity: 'Moderate',
        weeklyLossKg: 0.5,
        deficitKcal: Math.round((0.5 * KCAL_PER_KG_ESTIMATE) / 7), // 550 kcal
      },
      {
        id: 'fat_loss_faster',
        label: 'Faster Fat Loss',
        subtitle: '~0.75 kg / week',
        intensity: 'Faster',
        weeklyLossKg: 0.75,
        deficitKcal: Math.round((0.75 * KCAL_PER_KG_ESTIMATE) / 7), // 825 kcal
      },
      {
        id: 'fat_loss_aggressive',
        label: 'Aggressive Fat Loss',
        subtitle: '~1 kg / week',
        intensity: 'Aggressive',
        weeklyLossKg: 1.0,
        deficitKcal: Math.round((1.0 * KCAL_PER_KG_ESTIMATE) / 7), // 1100 kcal
      },
    ];

    for (const spec of paceSpecs) {
      const dailyCalories = Math.max(0, tdee - spec.deficitKcal);
      const pctMaint = Math.round((dailyCalories / Math.max(1, tdee)) * 100);
      const weeklyPctBodyWeight = (spec.weeklyLossKg / weightKg!) * 100;
      const deficitPct = (spec.deficitKcal / Math.max(1, tdee)) * 100;
      const estimatedWeeksToTarget =
        weightToLoseKg !== null && weightToLoseKg >= 0.2
          ? Math.max(1, Math.round((weightToLoseKg / spec.weeklyLossKg) * 10) / 10)
          : null;

      let allowed = true;
      let status: CalorieOption['status'] = 'suitable';
      let warning: string | undefined;
      let guidance: string | undefined;

      // Safety evaluations
      const belowSafeFloor = dailyCalories < individualizedSafeFloor;
      const extremeDeficitPct = deficitPct > 35;
      const extremeBodyWeightRate = weeklyPctBodyWeight > 1.25;
      const underageBlocked = age! < 18 && spec.weeklyLossKg >= 0.5;
      const underweightBlocked = bmi < 18.5;
      const lowBmiStrictBlock = isLowWeightOrBmi && spec.weeklyLossKg >= 0.75;

      if (
        underweightBlocked ||
        underageBlocked ||
        lowBmiStrictBlock ||
        belowSafeFloor ||
        extremeDeficitPct ||
        extremeBodyWeightRate
      ) {
        allowed = false;
        status = 'unsafe';
        const reasons: string[] = [];
        if (underweightBlocked) {
          reasons.push(`BMI (${bmi}) is already below 18.5`);
        } else if (underageBlocked) {
          reasons.push('not appropriate for users under 18');
        } else {
          if (belowSafeFloor) {
            reasons.push(
              `${dailyCalories.toLocaleString()} kcal falls below your estimated safe energy floor (~${individualizedSafeFloor.toLocaleString()} kcal based on your BMR and body weight)`
            );
          }
          if (extremeBodyWeightRate) {
            reasons.push(
              `${spec.weeklyLossKg} kg/week equals ${weeklyPctBodyWeight.toFixed(2)}% of your body weight/week (above ~1.25%/week safe planning threshold)`
            );
          }
          if (extremeDeficitPct) {
            reasons.push(`a ${Math.round(deficitPct)}% calorie cut exceeds sustainable energy availability`);
          }
        }
        warning = `Unavailable for your profile: ${reasons.join('; ')}.`;
        guidance = 'Choose a milder pace or consult a registered dietitian/physician for supervised fat loss.';
      } else if (
        spec.intensity === 'Aggressive' ||
        deficitPct > 27 ||
        weeklyPctBodyWeight > 1.0 ||
        (isYouthOrSenior && spec.weeklyLossKg >= 0.5) ||
        (isLowWeightOrBmi && spec.weeklyLossKg >= 0.5)
      ) {
        allowed = true;
        status = 'caution';
        warning =
          spec.intensity === 'Aggressive'
            ? `Steep ~${Math.round(deficitPct)}% deficit (${weeklyPctBodyWeight.toFixed(2)}% body weight/week). Higher risk of muscle loss, fatigue, and hunger—professional guidance is recommended.`
            : `Higher-intensity deficit (~${Math.round(deficitPct)}% below maintenance). Prioritize high protein, resistance training, and recovery.`;
        guidance = 'Monitor energy, strength, and weekly weight trends closely.';
      } else if (spec.intensity === 'Mild') {
        guidance = 'Gentle, highly sustainable deficit with minimal impact on gym performance.';
      } else if (spec.intensity === 'Moderate') {
        guidance = 'Balanced, evidence-based starting pace for steady fat loss while protecting muscle.';
      } else {
        guidance = 'Noticeable deficit—best paired with high protein intake and structured lifting.';
      }

      options.push({
        id: spec.id,
        goalGroup: 'fat_loss',
        label: spec.label,
        subtitle: spec.subtitle,
        intensity: spec.intensity,
        dailyCalories,
        dailyDelta: -spec.deficitKcal,
        weeklyWeightChangeKg: -spec.weeklyLossKg,
        percentOfMaintenance: pctMaint,
        estimatedWeeksToTarget,
        recommended: false,
        allowed,
        status,
        warning,
        guidance,
      });
    }

    // Highlight Moderate Fat Loss as default recommended when safe; otherwise fall back to Mild
    const moderateOpt = options.find((o) => o.id === 'fat_loss_moderate' && o.allowed && o.status !== 'caution');
    const mildOpt = options.find((o) => o.id === 'fat_loss_mild' && o.allowed);
    if (moderateOpt) {
      moderateOpt.recommended = true;
      moderateOpt.status = 'recommended';
    } else if (mildOpt) {
      mildOpt.recommended = true;
      mildOpt.status = 'recommended';
    } else {
      safetyAlerts.push(
        'None of the standard weight-loss deficits are safe for your current biometrics. Consider Maintain Weight or consult a healthcare professional.'
      );
    }
  } else if (goal === 'muscle_gain') {
    sectionTitle = 'Choose Your Muscle Gain Approach';
    sectionSubtitle =
      'Modest calorie surplus options built from your estimated maintenance calories (TDEE).';
    goalGuidanceNote =
      'Important distinction: Calorie surpluses estimate total body-weight change, not pure muscle gain. Actual muscle growth depends on training experience, progressive overload, recovery, protein intake, and genetics—higher surpluses also increase body fat.';

    // Scale lean surplus smoothly within 150–250 kcal/day and moderate within 250–350 kcal/day
    const leanSurplus = Math.min(250, Math.max(150, Math.round((tdee * 0.08) / 10) * 10));
    const modSurplus = Math.min(350, Math.max(250, Math.round((tdee * 0.12) / 10) * 10));

    options.push(
      {
        id: 'muscle_maintenance',
        goalGroup: 'muscle_gain',
        label: 'Maintenance Calories',
        subtitle: '0 kcal surplus • Performance & body-composition stability',
        intensity: 'Maintenance',
        dailyCalories: tdee,
        dailyDelta: 0,
        weeklyWeightChangeKg: null,
        percentOfMaintenance: 100,
        estimatedWeeksToTarget: null,
        recommended: false,
        allowed: true,
        status: 'suitable',
        guidance:
          'Ideal if you prefer building strength and skill without adding body fat, especially for newer lifters or returning athletes.',
      },
      {
        id: 'muscle_lean_bulk',
        goalGroup: 'muscle_gain',
        label: 'Lean Bulk',
        subtitle: `+${leanSurplus} kcal/day modest surplus`,
        intensity: 'Mild',
        dailyCalories: tdee + leanSurplus,
        dailyDelta: leanSurplus,
        weeklyWeightChangeKg: null,
        percentOfMaintenance: Math.round(((tdee + leanSurplus) / Math.max(1, tdee)) * 100),
        estimatedWeeksToTarget: null,
        recommended: true,
        allowed: true,
        status: 'recommended',
        guidance:
          'Recommended starting surplus (150–250 kcal/day) to support hypertrophy and training recovery while limiting excess fat gain.',
      },
      {
        id: 'muscle_moderate_bulk',
        goalGroup: 'muscle_gain',
        label: 'Moderate Bulk',
        subtitle: `+${modSurplus} kcal/day higher surplus`,
        intensity: 'Moderate',
        dailyCalories: tdee + modSurplus,
        dailyDelta: modSurplus,
        weeklyWeightChangeKg: null,
        percentOfMaintenance: Math.round(((tdee + modSurplus) / Math.max(1, tdee)) * 100),
        estimatedWeeksToTarget: null,
        recommended: false,
        allowed: true,
        status: 'suitable',
        warning:
          'Higher surplus increases total weight gain faster, which typically includes a greater share of body fat alongside muscle.',
        guidance: 'Best suited for leaner lifters, high training volumes, or those struggling to gain scale weight.',
      }
    );
  } else if (goal === 'weight_gain') {
    sectionTitle = 'Choose Your Weight Gain Surplus';
    sectionSubtitle =
      'Gradual surplus options calculated from your estimated TDEE. Total weight gain includes both lean tissue and body fat.';
    goalGuidanceNote =
      'Pair your calorie surplus with progressive resistance training and adequate protein so a healthier proportion of weight gained supports lean mass. Fixed weekly muscle gain is never guaranteed.';

    const weightToGainKg =
      targetWeightKg !== null && targetWeightKg > weightKg! ? targetWeightKg - weightKg! : null;

    const gainSpecs = [
      {
        id: 'weight_gain_gradual',
        label: 'Gradual Surplus',
        subtitle: '+200 kcal / day',
        intensity: 'Mild' as const,
        surplus: 200,
        recommended: false,
        guidance: 'Slow, controlled weight gain with lower fat accumulation.',
      },
      {
        id: 'weight_gain_steady',
        label: 'Steady Weight Gain',
        subtitle: '+350 kcal / day',
        intensity: 'Moderate' as const,
        surplus: 350,
        recommended: true,
        guidance: 'Balanced surplus for consistent scale weight progression.',
      },
      {
        id: 'weight_gain_higher',
        label: 'Higher Surplus',
        subtitle: '+500 kcal / day',
        intensity: 'Faster' as const,
        surplus: 500,
        recommended: false,
        warning: 'Faster total body-weight gain typically increases body-fat gain alongside lean mass.',
        guidance: 'Useful for hardgainers or high-expenditure athletes monitoring weekly trends.',
      },
    ];

    for (const s of gainSpecs) {
      const approxWeeklyKg = Math.round(((s.surplus * 7) / KCAL_PER_KG_ESTIMATE) * 100) / 100;
      const estimatedWeeks =
        weightToGainKg !== null && weightToGainKg >= 0.2
          ? Math.max(1, Math.round((weightToGainKg / approxWeeklyKg) * 10) / 10)
          : null;
      options.push({
        id: s.id,
        goalGroup: 'weight_gain',
        label: s.label,
        subtitle: s.subtitle,
        intensity: s.intensity,
        dailyCalories: tdee + s.surplus,
        dailyDelta: s.surplus,
        weeklyWeightChangeKg: approxWeeklyKg,
        percentOfMaintenance: Math.round(((tdee + s.surplus) / Math.max(1, tdee)) * 100),
        estimatedWeeksToTarget: estimatedWeeks,
        recommended: s.recommended,
        allowed: true,
        status: s.recommended ? 'recommended' : s.warning ? 'caution' : 'suitable',
        warning: s.warning,
        guidance: s.guidance,
      });
    }
  } else if (goal === 'recomposition') {
    sectionTitle = 'Body Recomposition Calorie Options';
    sectionSubtitle =
      'Conservative calorie targets centered near maintenance with prioritized protein and resistance training.';
    goalGuidanceNote =
      'Body recomposition occurs gradually and depends on training stimulus, sleep, and protein consistency. STRAP does not promise simultaneous fixed rates of fat loss and muscle gain.';

    const mildDeficit = Math.min(200, Math.max(125, Math.round((tdee * 0.07) / 10) * 10));
    const safeMin = Math.max(gender === 'male' ? 1400 : gender === 'female' ? 1200 : 1300, Math.round(bmr * 0.95));
    const mildDeficitAllowed = tdee - mildDeficit >= safeMin && bmi >= 19.5 && age! >= 18;

    options.push(
      {
        id: 'recomp_maintenance',
        goalGroup: 'recomposition',
        label: 'Maintenance Recomp',
        subtitle: 'Estimated maintenance calories • High protein',
        intensity: 'Maintenance',
        dailyCalories: tdee,
        dailyDelta: 0,
        weeklyWeightChangeKg: null,
        percentOfMaintenance: 100,
        estimatedWeeksToTarget: null,
        recommended: true,
        allowed: true,
        status: 'recommended',
        guidance: 'Recommended starting point: fuel progressive strength sessions while keeping calories at estimated maintenance.',
      },
      {
        id: 'recomp_mild_deficit',
        goalGroup: 'recomposition',
        label: 'Conservative Deficit Recomp',
        subtitle: `−${mildDeficit} kcal/day slight deficit`,
        intensity: 'Conservative',
        dailyCalories: tdee - mildDeficit,
        dailyDelta: -mildDeficit,
        weeklyWeightChangeKg: null,
        percentOfMaintenance: Math.round(((tdee - mildDeficit) / Math.max(1, tdee)) * 100),
        estimatedWeeksToTarget: null,
        recommended: false,
        allowed: mildDeficitAllowed,
        status: mildDeficitAllowed ? 'suitable' : 'unsafe',
        warning: mildDeficitAllowed
          ? undefined
          : 'Not recommended for your current BMI/age/BMR—stay at Maintenance Recomp instead.',
        guidance: 'Gentle energy reduction for users with slightly higher body fat prioritizing lean-mass retention.',
      }
    );
  } else if (goal === 'strength') {
    sectionTitle = 'Strength Development Fueling Options';
    sectionSubtitle =
      'Prioritizes adequate calories, protein, and training recovery—never automatically imposes a fat-loss deficit.';
    goalGuidanceNote =
      'Maximal strength adaptation relies on neural recovery, glycogen availability, and consistent progressive overload.';

    const strengthSurplus = Math.min(225, Math.max(150, Math.round((tdee * 0.08) / 10) * 10));
    options.push(
      {
        id: 'strength_maintenance',
        goalGroup: 'strength',
        label: 'Performance Maintenance',
        subtitle: '100% TDEE • Stay in weight class',
        intensity: 'Maintenance',
        dailyCalories: tdee,
        dailyDelta: 0,
        weeklyWeightChangeKg: null,
        percentOfMaintenance: 100,
        estimatedWeeksToTarget: null,
        recommended: false,
        allowed: true,
        status: 'suitable',
        guidance: 'Maintain current body weight while fueling heavy compound sessions and recovery.',
      },
      {
        id: 'strength_surplus',
        goalGroup: 'strength',
        label: 'Strength Surplus',
        subtitle: `+${strengthSurplus} kcal/day recovery & output support`,
        intensity: 'Mild',
        dailyCalories: tdee + strengthSurplus,
        dailyDelta: strengthSurplus,
        weeklyWeightChangeKg: null,
        percentOfMaintenance: Math.round(((tdee + strengthSurplus) / Math.max(1, tdee)) * 100),
        estimatedWeeksToTarget: null,
        recommended: true,
        allowed: true,
        status: 'recommended',
        guidance: 'Modest surplus to support work capacity, glycogen replenishment, and heavy barbell progression.',
      }
    );
  } else if (goal === 'maintenance') {
    sectionTitle = 'Weight Maintenance Target';
    sectionSubtitle = 'Estimated daily energy balance with no unnecessary calorie surplus or deficit.';
    goalGuidanceNote =
      'Aim around your estimated maintenance calories with balanced protein, carbohydrates, and healthy fats. Adjust gradually only if multi-week averages drift.';

    options.push({
      id: 'maintenance_exact',
      goalGroup: 'maintenance',
      label: 'Maintain Current Weight',
      subtitle: '100% of estimated TDEE • Balanced macros',
      intensity: 'Maintenance',
      dailyCalories: tdee,
      dailyDelta: 0,
      weeklyWeightChangeKg: 0,
      percentOfMaintenance: 100,
      estimatedWeeksToTarget: null,
      recommended: true,
      allowed: true,
      status: 'recommended',
      guidance: 'Preserves current weight, athletic performance, and day-to-day energy.',
    });
  } else {
    sectionTitle = 'General Fitness Nutrition Target';
    sectionSubtitle =
      'Maintenance-oriented energy recommendation with balanced macronutrients unless you choose another goal.';
    goalGuidanceNote =
      'Supports consistent training, daily vitality, and sustainable eating habits without restrictive deficits.';

    options.push({
      id: 'general_maintenance',
      goalGroup: 'general_fitness',
      label: 'Balanced Maintenance',
      subtitle: '100% of estimated TDEE • Sustainable fuel',
      intensity: 'Maintenance',
      dailyCalories: tdee,
      dailyDelta: 0,
      weeklyWeightChangeKg: null,
      percentOfMaintenance: 100,
      estimatedWeeksToTarget: null,
      recommended: true,
      allowed: true,
      status: 'recommended',
      guidance: 'Balanced calorie and macro targets to fuel overall health, stamina, and regular workouts.',
    });
  }

  // Pick selected option: honor saved option if it belongs to current options & is allowed; else default recommended (or first allowed, else maintenance fallback)
  let selectedOption =
    options.find((o) => o.id === input.selected_calorie_option_id && o.allowed) ||
    options.find((o) => o.recommended && o.allowed) ||
    options.find((o) => o.allowed) ||
    null;

  const recommendedCalories = selectedOption ? selectedOption.dailyCalories : tdee;
  const recommendedTargets = calculateMacrosForCalories({
    targetCalories: recommendedCalories,
    tdee,
    weightKg: weightKg!,
    heightCm,
    goal,
    weeklyWorkoutDays: workoutDays,
    trainingStyle: input.training_style,
    proteinTargetPreferenceG: input.protein_target_preference_g,
  });

  // Never silently overwrite manual targets
  let activeTargets: MacroTargetBreakdown = recommendedTargets;
  let targetSource: 'calculated' | 'custom' = 'calculated';
  if (hasActiveCustom && rawCustom) {
    const customCals = Math.round(Number(rawCustom.target_calories));
    const customProtein =
      Number(rawCustom.protein_g) >= 20 ? Math.round(Number(rawCustom.protein_g)) : recommendedTargets.protein_g;
    const customFats =
      Number(rawCustom.fats_g) >= 15 ? Math.round(Number(rawCustom.fats_g)) : recommendedTargets.fats_g;
    const customCarbs =
      Number(rawCustom.carbs_g) >= 0 && rawCustom.carbs_g !== null && rawCustom.carbs_g !== undefined
        ? Math.round(Number(rawCustom.carbs_g))
        : Math.max(20, Math.round((customCals - customProtein * 4 - customFats * 9) / 4));
    const customFiber =
      Number(rawCustom.fiber_g) >= 5
        ? Math.round(Number(rawCustom.fiber_g))
        : Math.max(22, Math.min(50, Math.round((customCals / 1000) * 14)));
    const customWaterMl =
      Number(rawCustom.water_ml) >= 1000 ? Math.round(Number(rawCustom.water_ml)) : recommendedTargets.water_ml;

    activeTargets = {
      target_calories: customCals,
      protein_g: customProtein,
      carbs_g: customCarbs,
      fats_g: customFats,
      fiber_g: customFiber,
      water_ml: customWaterMl,
      water_liters: Math.round((customWaterMl / 1000) * 10) / 10,
      protein_per_kg: Math.round((customProtein / weightKg!) * 100) / 100,
      macro_calories_sum: customProtein * 4 + customCarbs * 4 + customFats * 9,
      calorie_delta: customCals - tdee,
    };
    targetSource = 'custom';
  }

  return {
    isComplete: true,
    missingFields: [],
    goal,
    goalLabel,
    bmr,
    tdee,
    maintenanceCalories: tdee,
    activityMultiplier,
    bmi,
    genderAssumptionNote,
    sectionTitle,
    sectionSubtitle,
    goalGuidanceNote,
    options,
    selectedOptionId: selectedOption?.id ?? null,
    selectedOption,
    recommendedTargets,
    customTargets: hasActiveCustom ? rawCustom : null,
    activeTargets,
    targetSource,
    disclaimer,
    safetyAlerts,
  };
}

/**
 * Backwards-compatible summary calculator used by existing Nutrition/AI services.
 * Powered by the exact same PersonalizedNutritionPlan engine so every page stays 100% in sync.
 */
export function calculateNutritionTargets(input: NutritionTargetInput = {}): CalculatedNutritionTargets {
  const plan = calculatePersonalizedNutritionPlan(input);

  if (plan.isComplete && plan.activeTargets && plan.bmr !== null && plan.tdee !== null) {
    const t = plan.activeTargets;
    const explanation = `Mifflin-St Jeor estimate (${plan.goalLabel}${
      plan.selectedOption ? ` • ${plan.selectedOption.label}` : ''
    }): BMR ${plan.bmr} kcal/day • Maintenance (TDEE) ${plan.tdee} kcal/day • Active Target ${
      t.target_calories
    } kcal/day (${
      t.calorie_delta > 0
        ? `+${t.calorie_delta} kcal surplus`
        : t.calorie_delta < 0
        ? `${t.calorie_delta} kcal deficit`
        : 'maintenance balance'
    }).`;

    return {
      bmr: plan.bmr,
      tdee: plan.tdee,
      target_calories: t.target_calories,
      protein_g: t.protein_g,
      carbs_g: t.carbs_g,
      fats_g: t.fats_g,
      fiber_g: t.fiber_g,
      water_ml: t.water_ml,
      water_liters: t.water_liters,
      calorie_delta: t.calorie_delta,
      goal_label: plan.goalLabel,
      selected_option_id: plan.selectedOptionId,
      selected_option_label: plan.selectedOption?.label ?? null,
      target_source: plan.targetSource === 'custom' ? 'custom' : 'calculated',
      explanation,
      disclaimer: plan.disclaimer,
    };
  }

  // If biometrics are missing but user set manual custom targets, honor them cleanly
  if (plan.activeTargets && plan.targetSource === 'custom') {
    const t = plan.activeTargets;
    return {
      bmr: 0,
      tdee: 0,
      target_calories: t.target_calories,
      protein_g: t.protein_g,
      carbs_g: t.carbs_g,
      fats_g: t.fats_g,
      fiber_g: t.fiber_g,
      water_ml: t.water_ml,
      water_liters: t.water_liters,
      calorie_delta: 0,
      goal_label: plan.goalLabel,
      selected_option_id: null,
      selected_option_label: 'Custom Target',
      target_source: 'custom',
      explanation: `Using your custom nutrition target (${t.target_calories} kcal/day). Complete your Profile biometrics to also view estimated BMR and TDEE.`,
      disclaimer: plan.disclaimer,
    };
  }

  // Incomplete profile & no custom targets: return zeroes (never fabricate fake numbers)
  return {
    bmr: 0,
    tdee: 0,
    target_calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    fiber_g: 0,
    water_ml: 0,
    water_liters: 0,
    calorie_delta: 0,
    goal_label: plan.goalLabel,
    selected_option_id: null,
    selected_option_label: null,
    target_source: 'calculated',
    explanation: `Complete your Profile (${plan.missingFields.join(', ')}) to calculate personalized daily calorie and macro estimates.`,
    disclaimer: plan.disclaimer,
  };
}
