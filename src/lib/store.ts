import fs from 'fs';
import path from 'path';
import {
  ExerciseItem,
  MuscleCategory,
  UserProfile,
  UserGoal,
  FitnessMetrics,
  Subscription,
  PaymentRecord,
  ActiveWorkoutState,
  GeneratedWorkoutPlan,
  NutritionPlan,
  RecoveryAnalysis,
} from '@/types';

// ==============================================================================
// 1. SEED EXERCISE LIBRARY (25+ Detailed Exercises across 12 Categories)
// ==============================================================================
export const SEED_EXERCISES: ExerciseItem[] = [
  // CHEST
  {
    id: 'ex-bench-press',
    name: 'Barbell Bench Press',
    target_muscle: 'Pectoralis Major (Mid/Lower Chest)',
    secondary_muscles: ['Triceps Brachii', 'Anterior Deltoids'],
    category: 'Chest',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Lie on bench with eyes directly below bar.\n2. Retract shoulder blades and arch upper back slightly.\n3. Unrack bar and lower under control to mid-sternum with elbows tucked at 45-75 degrees.\n4. Drive feet into floor and press the bar forcefully upward until lock-out without losing scapular tension.',
    default_sets: 4,
    default_reps: '6-8',
    default_rest_sec: 120,
    alternatives: ['Dumbbell Bench Press', 'Floor Press', 'Weighted Push-ups'],
  },
  {
    id: 'ex-incline-db-press',
    name: 'Incline Dumbbell Press',
    target_muscle: 'Upper Chest (Clavicular Head)',
    secondary_muscles: ['Anterior Deltoids', 'Triceps'],
    category: 'Chest',
    equipment: 'Dumbbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Set bench to 30-45 degree incline.\n2. Kick dumbbells up to starting position over upper chest with neutral or slightly angled grip.\n3. Lower with controlled 3-second descent until dumbbells are level with chest.\n4. Press up smoothly focusing on driving elbows together at the peak.',
    default_sets: 3,
    default_reps: '8-12',
    default_rest_sec: 90,
    alternatives: ['Incline Barbell Press', 'Low-to-High Cable Flyes'],
  },
  {
    id: 'ex-cable-flye',
    name: 'Cable Chest Flye',
    target_muscle: 'Inner & Mid Pectorals',
    secondary_muscles: ['Anterior Deltoids'],
    category: 'Chest',
    equipment: 'Cable',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Set pulleys at chest height.\n2. Step forward with staggered stance, maintaining slight soft bend in elbows.\n3. Hug arms forward in a wide arc until hands meet at midline.\n4. Squeeze pecs hard for 1 full second, then stretch backwards slowly.',
    default_sets: 3,
    default_reps: '12-15',
    default_rest_sec: 60,
    alternatives: ['Pec Deck Machine', 'Dumbbell Flyes'],
  },

  // BACK
  {
    id: 'ex-deadlift',
    name: 'Conventional Barbell Deadlift',
    target_muscle: 'Posterior Chain (Erector Spinae, Glutes, Hamstrings)',
    secondary_muscles: ['Latissimus Dorsi', 'Trapezius', 'Forearms', 'Core'],
    category: 'Back',
    equipment: 'Barbell',
    difficulty: 'Advanced',
    exercise_type: 'Compound',
    instructions: '1. Stand with mid-foot directly under the bar, feet hip-width apart.\n2. Hinge at hips to grip bar just outside shins. Pull chest up, pack lats down into armpits.\n3. Take a deep diaphragmatic breath, brace core.\n4. Push the floor away through mid-foot while extending hips and knees in unison to stand tall.',
    default_sets: 4,
    default_reps: '5',
    default_rest_sec: 180,
    alternatives: ['Trap Bar Deadlift', 'Romanian Deadlift'],
  },
  {
    id: 'ex-barbell-row',
    name: 'Bent-Over Barbell Row',
    target_muscle: 'Latissimus Dorsi & Rhomboids',
    secondary_muscles: ['Biceps', 'Rear Deltoids', 'Lower Back'],
    category: 'Back',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Hinge torso to 45 degrees relative to floor, knees soft, spine rigid.\n2. Grip barbell with overhand or underhand grip.\n3. Drive elbows back toward hips, pulling bar into lower abdomen.\n4. Squeeze shoulder blades together, lower with a deep lat stretch.',
    default_sets: 4,
    default_reps: '8-10',
    default_rest_sec: 90,
    alternatives: ['Single-Arm Dumbbell Row', 'T-Bar Row', 'Seated Cable Row'],
  },
  {
    id: 'ex-lat-pulldown',
    name: 'Lat Pulldown',
    target_muscle: 'Latissimus Dorsi (Lats)',
    secondary_muscles: ['Biceps Brachii', 'Teres Major'],
    category: 'Back',
    equipment: 'Cable',
    difficulty: 'Beginner',
    exercise_type: 'Compound',
    instructions: '1. Sit down and secure thigh pads comfortably.\n2. Grip wide attachment just outside shoulder width.\n3. Lean back 10-15 degrees and pull bar down toward collarbone, driving elbows down and back.\n4. Resist the return weight for 3 seconds into full stretch overhead.',
    default_sets: 3,
    default_reps: '10-12',
    default_rest_sec: 75,
    alternatives: ['Bodyweight Pull-ups', 'Assisted Chin-ups', 'Neutral Grip Pulldown'],
  },

  // SHOULDERS
  {
    id: 'ex-ohp',
    name: 'Standing Overhead Barbell Press',
    target_muscle: 'Anterior & Lateral Deltoids',
    secondary_muscles: ['Triceps', 'Upper Traps', 'Abdominals'],
    category: 'Shoulders',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Clean or unrack barbell across anterior deltoids and clavicle.\n2. Squeeze glutes and brace abdominals.\n3. Press bar vertically in a straight path, moving head back slightly as bar passes nose.\n4. Lock out arms overhead with bar centered over mid-foot.',
    default_sets: 4,
    default_reps: '6-8',
    default_rest_sec: 120,
    alternatives: ['Seated Dumbbell Shoulder Press', 'Kettlebell Press'],
  },
  {
    id: 'ex-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    target_muscle: 'Lateral Deltoids (Side Delts)',
    secondary_muscles: ['Trapezius', 'Supraspinatus'],
    category: 'Shoulders',
    equipment: 'Dumbbell',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Stand with dumbbells at sides, slight hinge forward at hips.\n2. Raise arms out in the scapular plane (30 degrees forward of midline) leading with elbows.\n3. Stop when dumbbells reach shoulder level.\n4. Lower under control without letting weights rest on hips.',
    default_sets: 4,
    default_reps: '12-15',
    default_rest_sec: 60,
    alternatives: ['Cable Lateral Raise', 'Machine Lateral Raise'],
  },
  {
    id: 'ex-face-pull',
    name: 'Rope Face Pull',
    target_muscle: 'Rear Deltoids & Rotator Cuff',
    secondary_muscles: ['Rhomboids', 'Middle Traps'],
    category: 'Shoulders',
    equipment: 'Cable',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Set pulley at eye level with rope attachment.\n2. Hold ends with thumbs pointing back.\n3. Pull rope to bridge of nose while externally rotating shoulders, pulling elbows high and wide.\n4. Pause for 1 second contraction at peak.',
    default_sets: 3,
    default_reps: '15-20',
    default_rest_sec: 60,
    alternatives: ['Rear Delt Flyes', 'Band Pull-Aparts'],
  },

  // QUADRICEPS
  {
    id: 'ex-squat',
    name: 'Barbell Back Squat',
    target_muscle: 'Quadriceps & Gluteus Maximus',
    secondary_muscles: ['Adductors', 'Hamstrings', 'Spinal Erectors'],
    category: 'Quadriceps',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Rest barbell across upper trapezius. Set feet shoulder-width, toes turned out 15-30 degrees.\n2. Take a deep breath, brace core 360 degrees.\n3. Bend knees and hips simultaneously, lowering hips until crease is below the knee.\n4. Push forcefully through whole foot to stand back up.',
    default_sets: 4,
    default_reps: '6-8',
    default_rest_sec: 150,
    alternatives: ['Goblet Squat', 'Front Squat', 'Leg Press'],
  },
  {
    id: 'ex-bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    target_muscle: 'Quadriceps & Glutes (Unilateral)',
    secondary_muscles: ['Adductors', 'Calves', 'Core'],
    category: 'Quadriceps',
    equipment: 'Dumbbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Elevate rear foot on bench 15-18 inches behind you.\n2. Hold dumbbells in hands and lower rear knee toward ground.\n3. Front shin should stay mostly vertical with torso slightly forward.\n4. Drive through front heel to return to top.',
    default_sets: 3,
    default_reps: '10-12 / leg',
    default_rest_sec: 90,
    alternatives: ['Walking Lunges', 'Reverse Lunges', 'Step-ups'],
  },
  {
    id: 'ex-leg-extension',
    name: 'Leg Extension',
    target_muscle: 'Quadriceps (Rectus Femoris Isolation)',
    secondary_muscles: [],
    category: 'Quadriceps',
    equipment: 'Machine',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Align knee joint directly with the machine pivot point.\n2. Extend legs until completely straight, squeezing quads hard at the top.\n3. Lower with controlled 3-second descent without letting weights crash.',
    default_sets: 3,
    default_reps: '12-15',
    default_rest_sec: 60,
    alternatives: ['Sissy Squats', 'Spanish Squats'],
  },

  // HAMSTRINGS & GLUTES
  {
    id: 'ex-rdl',
    name: 'Romanian Deadlift (RDL)',
    target_muscle: 'Hamstrings & Gluteus Maximus',
    secondary_muscles: ['Erector Spinae', 'Forearms'],
    category: 'Hamstrings',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Stand holding bar at thighs with shoulder-width grip and soft knee bend.\n2. Push hips directly backward horizontally while keeping bar against thighs.\n3. Lower bar to mid-shin until a powerful stretch is felt in hamstrings.\n4. Drive hips forward and squeeze glutes to stand.',
    default_sets: 4,
    default_reps: '8-10',
    default_rest_sec: 90,
    alternatives: ['Dumbbell RDL', 'Good Mornings'],
  },
  {
    id: 'ex-lying-leg-curl',
    name: 'Lying Leg Curl',
    target_muscle: 'Hamstrings (Biceps Femoris)',
    secondary_muscles: ['Gastrocnemius'],
    category: 'Hamstrings',
    equipment: 'Machine',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Lie prone with roller pad adjusted just below calves.\n2. Keep hips glued to pad; curl heels towards glutes smoothly.\n3. Pause for 1 second peak squeeze, then lower slowly.',
    default_sets: 3,
    default_reps: '10-12',
    default_rest_sec: 60,
    alternatives: ['Seated Leg Curl', 'Nordic Hamstring Curl'],
  },
  {
    id: 'ex-hip-thrust',
    name: 'Barbell Hip Thrust',
    target_muscle: 'Gluteus Maximus',
    secondary_muscles: ['Hamstrings', 'Adductor Magnus'],
    category: 'Glutes',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    exercise_type: 'Compound',
    instructions: '1. Sit on floor with upper back against bench and padded bar across hips.\n2. Plant feet flat, shins vertical at top of movement.\n3. Drive through heels to extend hips fully until torso and thighs form a straight horizontal line.\n4. Squeeze glutes for 2 seconds before lowering.',
    default_sets: 4,
    default_reps: '10-12',
    default_rest_sec: 90,
    alternatives: ['Dumbbell Hip Thrust', 'Glute Bridge', 'Cable Pull-Through'],
  },
  {
    id: 'ex-calf-raise',
    name: 'Standing Calf Raise',
    target_muscle: 'Calves (Gastrocnemius & Soleus)',
    secondary_muscles: [],
    category: 'Calves',
    equipment: 'Machine',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Place balls of feet on edge of platform, drop heels down into full stretch.\n2. Press through balls of big toes to full ankle extension.\n3. Hold peak contraction for 1 second, then lower under 3-second tempo.',
    default_sets: 4,
    default_reps: '15-20',
    default_rest_sec: 45,
    alternatives: ['Seated Calf Raise', 'Dumbbell Single-Leg Calf Raise'],
  },

  // ARMS: BICEPS, TRICEPS, FOREARMS
  {
    id: 'ex-bicep-curl',
    name: 'Standing Barbell Bicep Curl',
    target_muscle: 'Biceps Brachii',
    secondary_muscles: ['Brachialis', 'Brachioradialis'],
    category: 'Biceps',
    equipment: 'Barbell',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Hold barbell with underhand shoulder-width grip, elbows tucked at sides.\n2. Curl bar upwards towards collarbone while keeping torso strictly still.\n3. Squeeze biceps at peak, then lower under 3-second eccentric control.',
    default_sets: 3,
    default_reps: '10-12',
    default_rest_sec: 60,
    alternatives: ['Dumbbell Curl', 'EZ-Bar Curl', 'Cable Curl'],
  },
  {
    id: 'ex-incline-curl',
    name: 'Incline Dumbbell Curl',
    target_muscle: 'Biceps Long Head (Peak)',
    secondary_muscles: ['Forearms'],
    category: 'Biceps',
    equipment: 'Dumbbell',
    difficulty: 'Intermediate',
    exercise_type: 'Isolation',
    instructions: '1. Lie back on 60-degree incline bench with arms hanging fully extended.\n2. Curl dumbbells upward while supinating wrists (turning pinky up).\n3. Emphasize deep stretch at bottom without swinging shoulders.',
    default_sets: 3,
    default_reps: '10-12',
    default_rest_sec: 60,
    alternatives: ['Preacher Curl', 'Bayesian Cable Curl'],
  },
  {
    id: 'ex-tricep-pushdown',
    name: 'Tricep Rope Pushdown',
    target_muscle: 'Triceps Lateral & Medial Head',
    secondary_muscles: [],
    category: 'Triceps',
    equipment: 'Cable',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Pin upper arms to ribs with rope attachment at chest height.\n2. Extend forearms downward, spreading rope ends apart at the bottom lockout.\n3. Return slowly until forearms reach parallel to floor.',
    default_sets: 3,
    default_reps: '12-15',
    default_rest_sec: 60,
    alternatives: ['Straight Bar Pushdown', 'Dips'],
  },
  {
    id: 'ex-skull-crusher',
    name: 'Lying Triceps Extension (Skull Crusher)',
    target_muscle: 'Triceps Long Head',
    secondary_muscles: [],
    category: 'Triceps',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    exercise_type: 'Isolation',
    instructions: '1. Lie on bench holding EZ-bar over chest with slight backward angle on upper arms.\n2. Hinge at elbows to lower bar towards crown of head.\n3. Extend elbows back to lockout, feeling deep tension in long head of triceps.',
    default_sets: 3,
    default_reps: '10-12',
    default_rest_sec: 75,
    alternatives: ['Overhead Dumbbell Tricep Extension', 'Cable Overhead Extension'],
  },
  {
    id: 'ex-wrist-curl',
    name: 'Barbell Wrist Curl',
    target_muscle: 'Forearm Flexors & Grip Strength',
    secondary_muscles: [],
    category: 'Forearms',
    equipment: 'Barbell',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Rest forearms on flat bench with wrists hanging over edge.\n2. Unroll bar down to fingertips for maximum stretch, then curl wrists and fingers all the way up.',
    default_sets: 3,
    default_reps: '15-20',
    default_rest_sec: 45,
    alternatives: ['Reverse Wrist Curl', 'Farmer Walk'],
  },

  // ABS & CORE
  {
    id: 'ex-hanging-leg-raise',
    name: 'Hanging Leg Raise',
    target_muscle: 'Rectus Abdominis (Lower Abs)',
    secondary_muscles: ['Hip Flexors', 'Obliques', 'Forearms'],
    category: 'Abs',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    exercise_type: 'Bodyweight',
    instructions: '1. Hang from pullup bar with active shoulders.\n2. Without swinging, curl pelvis upward and raise straight legs (or bent knees) toward chest.\n3. Pause for a second at the top, lower slowly.',
    default_sets: 3,
    default_reps: '12-15',
    default_rest_sec: 60,
    alternatives: ['Captain’s Chair Leg Raise', 'Reverse Crunch'],
  },
  {
    id: 'ex-woodchoppers',
    name: 'Cable Woodchoppers',
    target_muscle: 'Internal & External Obliques',
    secondary_muscles: ['Transverse Abdominis'],
    category: 'Abs',
    equipment: 'Cable',
    difficulty: 'Beginner',
    exercise_type: 'Isolation',
    instructions: '1. Attach handle high on cable tower. Stand sideways, grip handle with both hands.\n2. Pull handle diagonally across body down towards opposite hip, rotating torso and pivoting rear foot.\n3. Return smoothly under control.',
    default_sets: 3,
    default_reps: '12 / side',
    default_rest_sec: 60,
    alternatives: ['Russian Twists', 'Bicycle Crunches'],
  },
  {
    id: 'ex-plank',
    name: 'Isometric Core Plank',
    target_muscle: 'Transverse Abdominis & Deep Core',
    secondary_muscles: ['Glutes', 'Deltoids'],
    category: 'Abs',
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
    exercise_type: 'Bodyweight',
    instructions: '1. Rest on elbows and toes with body in a straight rigid line.\n2. Pull belly button toward spine, squeeze glutes, press forearms into floor.\n3. Breathe evenly and hold for prescribed time.',
    default_sets: 3,
    default_reps: '45-60 sec',
    default_rest_sec: 60,
    alternatives: ['Ab Wheel Rollout', 'Pallof Press'],
  },
  {
    id: 'ex-burpee',
    name: 'Full Body Conditioning Burpee',
    target_muscle: 'Full Body Cardiovascular & Muscular Endurance',
    secondary_muscles: ['Pectorals', 'Quadriceps', 'Core'],
    category: 'Full Body',
    equipment: 'Bodyweight',
    difficulty: 'Intermediate',
    exercise_type: 'Cardio',
    instructions: '1. Drop into squat, place hands on floor and jump feet back to plank.\n2. Perform a chest-to-floor pushup.\n3. Jump feet forward to hands and leap vertically with hands overhead.',
    default_sets: 3,
    default_reps: '15-20',
    default_rest_sec: 60,
    alternatives: ['Kettlebell Swings', 'Jumping Jacks'],
  },
];

// ==============================================================================
// 2. IN-MEMORY / HYBRID STORAGE STORE (Resilient local execution)
// ==============================================================================

export interface AdminSettingsConfig {
  price_inr: number;
  billing_period: string;
  upi_id: string;
  default_model: string;
}

class StrapStore {
  // Demo / Initial users
  users: Map<string, UserProfile> = new Map([
    [
      'user-demo-1',
      {
        id: 'user-demo-1',
        email: 'alex@strapfitness.com',
        full_name: 'Alex Mercer',
        role: 'user',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    [
      'admin-demo-1',
      {
        id: 'admin-demo-1',
        email: 'ashutosh@strapfitness.com',
        full_name: 'Ashutosh (Admin)',
        role: 'admin',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  ]);

  goals: Map<string, UserGoal> = new Map([
    [
      'user-demo-1',
      {
        id: 'goal-demo-1',
        user_id: 'user-demo-1',
        primary_goal: 'muscle_gain',
        target_weight_kg: 80,
        weekly_workout_days: 4,
        target_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  ]);

  metrics: Map<string, FitnessMetrics> = new Map([
    [
      'user-demo-1',
      {
        id: 'metrics-demo-1',
        user_id: 'user-demo-1',
        age: 26,
        gender: 'male',
        height_cm: 178,
        current_weight_kg: 74.5,
        body_fat_pct: 15.5,
        chest_cm: 102,
        waist_cm: 82,
        hips_cm: 96,
        arms_cm: 37,
        experience_level: 'intermediate',
        workout_location: 'gym',
        workout_duration_mins: 60,
        equipment: ['Barbell', 'Dumbbell', 'Cable', 'Machine'],
        strength_levels: {
          bench_press_kg: 85,
          squat_kg: 110,
          deadlift_kg: 140,
          overhead_press_kg: 55,
          pullups_reps: 12,
        },
        limitations: 'Mild lower back tightness during deep flexion',
        diet_preference: 'non_vegetarian',
        sleep_hours_avg: 7.5,
        daily_activity_level: 'moderately_active',
        daily_steps_avg: 9000,
        rest_days_preferred: 3,
        updated_at: new Date().toISOString(),
      },
    ],
  ]);

  subscriptions: Map<string, Subscription> = new Map([
    [
      'user-demo-1',
      {
        id: 'sub-demo-1',
        user_id: 'user-demo-1',
        plan: 'premium',
        status: 'active',
        price_inr: 100,
        current_period_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    [
      'admin-demo-1',
      {
        id: 'sub-admin-1',
        user_id: 'admin-demo-1',
        plan: 'premium',
        status: 'active',
        price_inr: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  ]);

  payments: PaymentRecord[] = [
    {
      id: 'pay-101',
      user_id: 'user-demo-1',
      user_email: 'alex@strapfitness.com',
      user_name: 'Alex Mercer',
      amount_inr: 100,
      currency: 'INR',
      payment_method: 'upi_manual',
      payment_status: 'approved',
      upi_id: 'ashutosh-k82@ptyes',
      utr_reference: 'UTR49281740192',
      admin_notes: 'Verified against bank passbook.',
      verified_by: 'ashutosh@strapfitness.com',
      verified_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'pay-102',
      user_id: 'user-demo-2',
      user_email: 'rohan.sharma@example.com',
      user_name: 'Rohan Sharma',
      amount_inr: 100,
      currency: 'INR',
      payment_method: 'upi_manual',
      payment_status: 'pending',
      upi_id: 'ashutosh-k82@ptyes',
      utr_reference: 'UTR99837102941',
      admin_notes: undefined,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  workouts: ActiveWorkoutState[] = [
    {
      id: 'w-1',
      name: 'Day 1: Upper Power & Hypertrophy',
      split_type: 'Upper / Lower',
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      exercises: [
        {
          exercise_id: 'ex-bench-press',
          exercise_name: 'Barbell Bench Press',
          target_muscle: 'Chest',
          rest_seconds: 120,
          sets: [
            { set_number: 1, weight_kg: 80, reps: 8, is_completed: true, rpe: 8 },
            { set_number: 2, weight_kg: 80, reps: 8, is_completed: true, rpe: 8 },
            { set_number: 3, weight_kg: 82.5, reps: 7, is_completed: true, rpe: 9 },
            { set_number: 4, weight_kg: 82.5, reps: 6, is_completed: true, rpe: 9.5 },
          ],
        },
        {
          exercise_id: 'ex-barbell-row',
          exercise_name: 'Bent-Over Barbell Row',
          target_muscle: 'Back',
          rest_seconds: 90,
          sets: [
            { set_number: 1, weight_kg: 70, reps: 10, is_completed: true, rpe: 8 },
            { set_number: 2, weight_kg: 70, reps: 10, is_completed: true, rpe: 8 },
            { set_number: 3, weight_kg: 75, reps: 8, is_completed: true, rpe: 8.5 },
          ],
        },
      ],
    },
  ];

  sleepLogs: { id: string; user_id: string; log_date: string; sleep_hours: number; sleep_quality: number; notes?: string }[] = [
    { id: 'sl-1', user_id: 'user-demo-1', log_date: '2026-11-17', sleep_hours: 8.0, sleep_quality: 5, notes: 'Felt well rested' },
    { id: 'sl-2', user_id: 'user-demo-1', log_date: '2026-11-18', sleep_hours: 7.2, sleep_quality: 4, notes: 'Slight fatigue from late meeting' },
    { id: 'sl-3', user_id: 'user-demo-1', log_date: '2026-11-19', sleep_hours: 7.8, sleep_quality: 4, notes: 'Good recovery' },
  ];

  recoveryLogs: { id: string; user_id: string; log_date: string; fatigue_level: number; muscle_soreness_score: number; recovery_score_pct: number; readiness_status: 'ready' | 'recovering' | 'rest_recommended' }[] = [
    { id: 'rl-1', user_id: 'user-demo-1', log_date: '2026-11-17', fatigue_level: 2, muscle_soreness_score: 2, recovery_score_pct: 88, readiness_status: 'ready' },
    { id: 'rl-2', user_id: 'user-demo-1', log_date: '2026-11-18', fatigue_level: 3, muscle_soreness_score: 3, recovery_score_pct: 74, readiness_status: 'ready' },
    { id: 'rl-3', user_id: 'user-demo-1', log_date: '2026-11-19', fatigue_level: 2, muscle_soreness_score: 2, recovery_score_pct: 82, readiness_status: 'ready' },
  ];

  measurements: { id: string; user_id: string; recorded_date: string; weight_kg: number; body_fat_pct?: number; chest_cm?: number; waist_cm?: number }[] = [
    { id: 'm-1', user_id: 'user-demo-1', recorded_date: '2026-10-15', weight_kg: 72.8, body_fat_pct: 16.2, chest_cm: 100, waist_cm: 83 },
    { id: 'm-2', user_id: 'user-demo-1', recorded_date: '2026-11-01', weight_kg: 73.6, body_fat_pct: 15.8, chest_cm: 101, waist_cm: 82.5 },
    { id: 'm-3', user_id: 'user-demo-1', recorded_date: '2026-11-15', weight_kg: 74.5, body_fat_pct: 15.5, chest_cm: 102, waist_cm: 82 },
  ];

  progressRecords: { id: string; user_id: string; exercise_name: string; record_type: '1rm' | 'max_reps' | 'max_volume'; value: number; achieved_at: string }[] = [
    { id: 'pr-1', user_id: 'user-demo-1', exercise_name: 'Barbell Bench Press', record_type: '1rm', value: 97.5, achieved_at: '2026-11-12' },
    { id: 'pr-2', user_id: 'user-demo-1', exercise_name: 'Barbell Back Squat', record_type: '1rm', value: 130.0, achieved_at: '2026-11-08' },
    { id: 'pr-3', user_id: 'user-demo-1', exercise_name: 'Conventional Barbell Deadlift', record_type: '1rm', value: 165.0, achieved_at: '2026-11-02' },
    { id: 'pr-4', user_id: 'user-demo-1', exercise_name: 'Pull-ups', record_type: 'max_reps', value: 14.0, achieved_at: '2026-11-14' },
  ];

  aiPlans: Map<string, { workoutPlan?: GeneratedWorkoutPlan; nutritionPlan?: NutritionPlan; recoveryAnalysis?: RecoveryAnalysis }> = new Map();

  adminSettings: AdminSettingsConfig = {
    price_inr: 100,
    billing_period: 'monthly',
    upi_id: 'ashutosh-k82@ptyes',
    default_model: 'gemini-1.5-flash',
  };
}

const STORE_FILE = path.join(process.cwd(), 'data', 'strap-store.json');

type StoreSnapshot = {
  users?: [string, UserProfile][];
  goals?: [string, UserGoal][];
  metrics?: [string, FitnessMetrics][];
  subscriptions?: [string, Subscription][];
  payments?: PaymentRecord[];
  workouts?: ActiveWorkoutState[];
  sleepLogs?: StrapStore['sleepLogs'];
  recoveryLogs?: StrapStore['recoveryLogs'];
  measurements?: StrapStore['measurements'];
  progressRecords?: StrapStore['progressRecords'];
  adminSettings?: AdminSettingsConfig;
};

function hydrateFromDisk(store: StrapStore) {
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    if (!raw.trim()) return;
    const data = JSON.parse(raw) as StoreSnapshot;

    const applyMap = <T>(target: Map<string, T>, entries?: [string, T][]) => {
      if (!entries) return;
      for (const [key, value] of entries) {
        target.set(key, value);
      }
    };

    applyMap(store.users, data.users);
    applyMap(store.goals, data.goals);
    applyMap(store.metrics, data.metrics);
    applyMap(store.subscriptions, data.subscriptions);

    if (Array.isArray(data.payments)) {
      store.payments = data.payments;
    }
    if (Array.isArray(data.workouts)) {
      store.workouts = data.workouts;
    }
    if (Array.isArray(data.sleepLogs)) {
      store.sleepLogs = data.sleepLogs;
    }
    if (Array.isArray(data.recoveryLogs)) {
      store.recoveryLogs = data.recoveryLogs;
    }
    if (Array.isArray(data.measurements)) {
      store.measurements = data.measurements;
    }
    if (Array.isArray(data.progressRecords)) {
      store.progressRecords = data.progressRecords;
    }
    if (data.adminSettings) {
      store.adminSettings = { ...store.adminSettings, ...data.adminSettings };
    }
  } catch (error) {
    console.error('[STRAP] Failed to hydrate store from disk:', error);
  }
}

export function persistStore() {
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const snapshot: StoreSnapshot = {
      users: Array.from(strapStore.users.entries()),
      goals: Array.from(strapStore.goals.entries()),
      metrics: Array.from(strapStore.metrics.entries()),
      subscriptions: Array.from(strapStore.subscriptions.entries()),
      payments: strapStore.payments,
      workouts: strapStore.workouts,
      sleepLogs: strapStore.sleepLogs,
      recoveryLogs: strapStore.recoveryLogs,
      measurements: strapStore.measurements,
      progressRecords: strapStore.progressRecords,
      adminSettings: strapStore.adminSettings,
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    console.error('[STRAP] Failed to persist store:', error);
  }
}

function isActivePremium(sub?: Subscription | null): boolean {
  if (!sub) return false;
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end) > new Date();
  return sub.plan === 'premium' && sub.status === 'active' && notExpired;
}

export function activatePremiumForUser(userId: string, priceInr: number, days = 30): Subscription {
  const now = new Date();
  const existing = strapStore.subscriptions.get(userId);
  const extendFrom =
    existing && isActivePremium(existing) && existing.current_period_end
      ? new Date(existing.current_period_end)
      : now;
  const expiresAt = new Date(extendFrom.getTime() + 1000 * 60 * 60 * 24 * days);

  const updatedSub: Subscription = {
    id: existing?.id || 'sub-' + userId,
    user_id: userId,
    plan: 'premium',
    status: 'active',
    price_inr: priceInr,
    current_period_start: existing?.current_period_start || now.toISOString(),
    current_period_end: expiresAt.toISOString(),
    created_at: existing?.created_at || now.toISOString(),
    updated_at: now.toISOString(),
  };

  strapStore.subscriptions.set(userId, updatedSub);
  persistStore();
  return updatedSub;
}

const globalForStore = globalThis as unknown as { __strapStore?: StrapStore };
export const strapStore = globalForStore.__strapStore ?? new StrapStore();
if (!globalForStore.__strapStore) {
  hydrateFromDisk(strapStore);
  globalForStore.__strapStore = strapStore;
}
