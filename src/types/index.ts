// ==============================================================================
// STRAP Fitness Types & Interfaces
// S - Start | T - Train | R - Recover | A - Adapt | P - Progress
// ==============================================================================

export type UserRole = 'user' | 'admin';

export type HeightUnit = 'cm' | 'ft_in';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  height_unit?: HeightUnit;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type FitnessGoalType =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'strength'
  | 'general_fitness'
  | 'endurance'
  | 'maintenance';

export interface UserGoal {
  id: string;
  user_id: string;
  primary_goal: FitnessGoalType;
  target_weight_kg?: number;
  weekly_workout_days: number;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutLocation = 'gym' | 'home' | 'hybrid';
export type DietPreference =
  | 'vegetarian'
  | 'eggetarian'
  | 'non_vegetarian'
  | 'vegan'
  | 'other';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active';

export interface FitnessMetrics {
  id: string;
  user_id: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height_cm: number;
  height_unit?: HeightUnit;
  current_weight_kg: number;
  body_fat_pct?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  arms_cm?: number;
  experience_level: ExperienceLevel;
  workout_location: WorkoutLocation;
  workout_duration_mins: number;
  equipment: string[];
  strength_levels?: {
    bench_press_kg?: number;
    squat_kg?: number;
    deadlift_kg?: number;
    overhead_press_kg?: number;
    pullups_reps?: number;
  };
  limitations?: string;
  diet_preference: DietPreference;
  sleep_hours_avg: number;
  daily_activity_level: ActivityLevel;
  daily_steps_avg: number;
  rest_days_preferred: number;
  updated_at: string;
}

export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'expired' | 'canceled';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price_inr: number;
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'upi_manual' | 'razorpay' | 'cashfree';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  amount_inr: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  upi_id: string;
  utr_reference?: string;
  receipt_url?: string;
  admin_notes?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export type MuscleCategory =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Quadriceps'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Abs'
  | 'Full Body';

export interface ExerciseItem {
  id: string;
  name: string;
  target_muscle: string;
  secondary_muscles: string[];
  category: MuscleCategory;
  equipment: 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Resistance Band';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  exercise_type: 'Compound' | 'Isolation' | 'Bodyweight' | 'Cardio';
  instructions: string;
  default_sets: number;
  default_reps: string;
  default_rest_sec: number;
  alternatives: string[];
}

export interface WorkoutPlanDay {
  day_number: number;
  day_title: string;
  focus: string;
  warmup: string[];
  exercises: {
    exercise_name: string;
    target_muscle: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    recommended_weight_kg?: number | string;
    tempo?: string;
    notes?: string;
    alternatives: string[];
  }[];
  cooldown: string[];
}

export interface GeneratedWorkoutPlan {
  split_name: string;
  split_type: 'Full Body' | 'Upper / Lower' | 'Push Pull Legs' | 'Bro Split' | 'Custom';
  rationale: string;
  weekly_schedule: WorkoutPlanDay[];
  progressive_overload_rules: string[];
}

export interface NutritionPlan {
  bmr: number;
  tdee: number;
  target_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fats_grams: number;
  water_liters: number;
  explanation: string;
  meal_timing: {
    meal_name: string;
    suggested_time: string;
    calorie_share_pct: number;
    recommendation: string;
  }[];
  sample_foods: {
    protein_sources: string[];
    carb_sources: string[];
    fat_sources: string[];
  };
}

export interface RecoveryAnalysis {
  recovery_score_pct: number;
  readiness_status: 'ready' | 'recovering' | 'rest_recommended';
  sleep_analysis: string;
  fatigue_notes: string;
  soreness_assessment: string;
  actionable_tips: string[];
}

export interface WeeklyAdaptation {
  original_plan_summary: string;
  adaptation_triggers: string[];
  why_plan_changed: string;
  updated_split_focus: string;
  adjustments: {
    exercise_name: string;
    action: 'increase_load' | 'increase_reps' | 'reduce_volume' | 'substitute' | 'maintain';
    details: string;
  }[];
  coach_message: string;
}

export interface ActiveWorkoutState {
  id: string;
  name: string;
  split_type: string;
  start_time: string;
  exercises: {
    exercise_id?: string;
    exercise_name: string;
    target_muscle: string;
    sets: {
      set_number: number;
      weight_kg: number;
      reps: number;
      is_completed: boolean;
      rpe?: number;
    }[];
    rest_seconds: number;
    notes?: string;
  }[];
}
