-- ==============================================================================
-- STRAP FITNESS DATABASE SCHEMA (Supabase PostgreSQL)
-- S - Start | T - Train | R - Recover | A - Adapt | P - Progress
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. USER GOALS TABLE
create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  primary_goal text not null check (primary_goal in ('fat_loss', 'muscle_gain', 'recomposition', 'strength', 'general_fitness', 'endurance', 'maintenance')),
  target_weight_kg numeric(5,2),
  weekly_workout_days integer default 4 check (weekly_workout_days between 1 and 7),
  target_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. FITNESS METRICS TABLE
create table if not exists public.fitness_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  age integer check (age between 10 and 120),
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  body_fat_pct numeric(4,1),
  chest_cm numeric(5,2),
  waist_cm numeric(5,2),
  hips_cm numeric(5,2),
  arms_cm numeric(5,2),
  experience_level text default 'beginner' check (experience_level in ('beginner', 'intermediate', 'advanced')),
  workout_location text default 'gym' check (workout_location in ('gym', 'home', 'hybrid')),
  workout_duration_mins integer default 60,
  equipment text[] default array['barbell', 'dumbbell', 'bench']::text[],
  strength_levels jsonb default '{}'::jsonb,
  limitations text,
  diet_preference text default 'non_vegetarian' check (diet_preference in ('vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'other')),
  sleep_hours_avg numeric(3,1) default 7.5,
  daily_activity_level text default 'moderately_active' check (daily_activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  daily_steps_avg integer default 8000,
  rest_days_preferred integer default 2,
  updated_at timestamptz default now()
);

-- 4. SUBSCRIPTIONS TABLE
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  plan text default 'free' check (plan in ('free', 'premium')),
  status text default 'active' check (status in ('active', 'expired', 'canceled')),
  price_inr numeric(8,2) default 0,
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. PAYMENTS TABLE
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount_inr numeric(8,2) not null default 100.00,
  currency text default 'INR',
  payment_method text default 'upi_manual' check (payment_method in ('upi_manual', 'razorpay', 'cashfree')),
  payment_status text default 'pending' check (payment_status in ('pending', 'approved', 'rejected')),
  upi_id text default 'ashutosh-k82@ptyes',
  utr_reference text,
  receipt_url text,
  admin_notes text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. EXERCISE LIBRARY
create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_muscle text not null,
  secondary_muscles text[] default array[]::text[],
  category text not null check (category in ('Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Full Body')),
  equipment text not null check (equipment in ('Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Resistance Band')),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  exercise_type text not null check (exercise_type in ('Compound', 'Isolation', 'Bodyweight', 'Cardio')),
  instructions text not null,
  default_sets integer default 3,
  default_reps text default '8-12',
  default_rest_sec integer default 90,
  alternatives text[] default array[]::text[],
  created_at timestamptz default now()
);

-- 7. WORKOUTS TABLE
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  split_type text,
  scheduled_date date not null default current_date,
  completed_at timestamptz,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'skipped')),
  duration_minutes integer default 0,
  total_volume_kg numeric(8,2) default 0,
  notes text,
  perceived_exertion integer check (perceived_exertion between 1 and 10),
  created_at timestamptz default now()
);

-- 8. WORKOUT EXERCISES TABLE
create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references public.workouts(id) on delete cascade not null,
  exercise_id uuid references public.exercise_library(id) on delete set null,
  exercise_name text not null,
  order_index integer default 0,
  target_sets integer default 3,
  target_reps text default '10-12',
  rest_seconds integer default 60,
  notes text
);

-- 9. WORKOUT SETS TABLE
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid references public.workout_exercises(id) on delete cascade not null,
  set_number integer not null,
  weight_kg numeric(6,2) default 0,
  reps_completed integer default 0,
  is_completed boolean default false,
  rpe numeric(3,1),
  created_at timestamptz default now()
);

-- 10. SLEEP LOGS TABLE
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  sleep_hours numeric(3,1) not null,
  sleep_quality integer not null default 3 check (sleep_quality between 1 and 5),
  resting_heart_rate integer,
  notes text,
  created_at timestamptz default now()
);

-- 11. RECOVERY LOGS TABLE
create table if not exists public.recovery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  fatigue_level integer not null default 3 check (fatigue_level between 1 and 5),
  muscle_soreness_score integer not null default 3 check (muscle_soreness_score between 1 and 5),
  recovery_score_pct integer not null default 75 check (recovery_score_pct between 0 and 100),
  readiness_status text not null default 'ready' check (readiness_status in ('ready', 'recovering', 'rest_recommended')),
  notes text,
  created_at timestamptz default now()
);

-- 12. BODY MEASUREMENTS TABLE
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  recorded_date date not null default current_date,
  weight_kg numeric(5,2) not null,
  body_fat_pct numeric(4,1),
  chest_cm numeric(5,2),
  waist_cm numeric(5,2),
  hips_cm numeric(5,2),
  arms_cm numeric(5,2),
  notes text,
  created_at timestamptz default now()
);

-- 13. PROGRESS RECORDS (PRs) TABLE
create table if not exists public.progress_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_name text not null,
  record_type text not null check (record_type in ('1rm', 'max_reps', 'max_volume')),
  value numeric(8,2) not null,
  achieved_at date not null default current_date
);

-- 14. AI RECOMMENDATIONS TABLE
create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  recommendation_type text not null check (recommendation_type in ('workout_plan', 'weekly_adaptation', 'nutrition_plan', 'recovery_insight', 'chat')),
  content_json jsonb not null,
  prompt_summary text,
  model_used text default 'gemini-1.5-flash',
  created_at timestamptz default now()
);

-- 15. ADMIN SETTINGS TABLE
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Insert Default Admin Settings
insert into public.admin_settings (key, value)
values 
  ('subscription_pricing', '{"price_inr": 100, "billing_period": "monthly", "upi_id": "ashutosh-k82@ptyes"}'::jsonb),
  ('gemini_config', '{"default_model": "gemini-1.5-flash", "temperature": 0.3}'::jsonb)
on conflict (key) do nothing;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.fitness_metrics enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.exercise_library enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.recovery_logs enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_records enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.admin_settings enable row level security;

-- Profiles: Users can read and update their own profile; admins can read all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Exercise library: readable by authenticated users (RLS checks plan in app level for details)
create policy "Authenticated users can read exercise library" on public.exercise_library
  for select to authenticated using (true);

-- User goals policies
create policy "Users can view own goals" on public.user_goals
  for select using (auth.uid() = user_id);
create policy "Users can modify own goals" on public.user_goals
  for all using (auth.uid() = user_id);

-- Fitness metrics policies
create policy "Users can view own fitness metrics" on public.fitness_metrics
  for select using (auth.uid() = user_id);
create policy "Users can modify own fitness metrics" on public.fitness_metrics
  for all using (auth.uid() = user_id);

-- Subscriptions policies
create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Payments policies
create policy "Users can view own payments" on public.payments
  for select using (auth.uid() = user_id);
create policy "Users can insert own payments" on public.payments
  for insert with check (auth.uid() = user_id);

-- Workouts policies
create policy "Users can access own workouts" on public.workouts
  for all using (auth.uid() = user_id);

-- Sleep and Recovery policies
create policy "Users can access own sleep logs" on public.sleep_logs
  for all using (auth.uid() = user_id);
create policy "Users can access own recovery logs" on public.recovery_logs
  for all using (auth.uid() = user_id);
create policy "Users can access own body measurements" on public.body_measurements
  for all using (auth.uid() = user_id);
create policy "Users can access own progress records" on public.progress_records
  for all using (auth.uid() = user_id);
create policy "Users can access own AI recommendations" on public.ai_recommendations
  for all using (auth.uid() = user_id);

-- ==============================================================================
-- SEED DATA: COMPLETE EXERCISE LIBRARY
-- ==============================================================================
insert into public.exercise_library (name, target_muscle, secondary_muscles, category, equipment, difficulty, exercise_type, instructions, default_sets, default_reps, default_rest_sec, alternatives)
values
  -- Chest
  ('Barbell Bench Press', 'Chest (Pectoralis Major)', array['Triceps', 'Anterior Deltoids'], 'Chest', 'Barbell', 'Intermediate', 'Compound', 'Lie flat on bench with eyes under barbell. Retract scapulae, unrack, lower barbell to mid-sternum with elbows at ~45-75 degrees. Press forcefully upward back to starting position.', 4, '6-8', 120, array['Dumbbell Bench Press', 'Floor Press', 'Push-ups']),
  ('Incline Dumbbell Press', 'Upper Chest (Clavicular Head)', array['Anterior Deltoids', 'Triceps'], 'Chest', 'Dumbbell', 'Intermediate', 'Compound', 'Set bench to 30-45 degree incline. Press dumbbells upward until arms are extended, lower under control with palms angled inward until dumbbells reach chest level.', 3, '8-12', 90, array['Incline Barbell Press', 'Low-to-High Cable Flyes']),
  ('Cable Chest Flye', 'Inner & Lower Chest', array['Anterior Deltoids'], 'Chest', 'Cable', 'Beginner', 'Isolation', 'Set pulleys at chest height. Take a step forward, maintain slight elbow bend, and bring handles together in an hugging arc across midline. Squeeze pecs for 1 second.', 3, '12-15', 60, array['Dumbbell Flyes', 'Pec Deck Machine']),
  ('Dips (Chest Focus)', 'Lower Chest', array['Triceps', 'Shoulders'], 'Chest', 'Bodyweight', 'Advanced', 'Compound', 'Lean torso forward roughly 30 degrees with elbows slightly flared. Lower body until upper arms are parallel to floor, then drive up through hands.', 3, '8-10', 90, array['Decline Bench Press', 'High-to-Low Cable Press']),
  ('Push-ups', 'Pectorals', array['Triceps', 'Core'], 'Chest', 'Bodyweight', 'Beginner', 'Bodyweight', 'Hands slightly wider than shoulder width. Maintain rigid plank line from heels to head. Lower chest within 1 inch of floor, press up.', 3, '12-20', 60, array['Knee Push-ups', 'Incline Push-ups']),

  -- Back
  ('Conventional Deadlift', 'Erector Spinae & Posterior Chain', array['Lats', 'Glutes', 'Hamstrings', 'Traps'], 'Back', 'Barbell', 'Advanced', 'Compound', 'Stand with bar over mid-foot. Hinge at hips, grip bar just outside knees. Engage lats, brace core, push the floor away while extending hips and knees simultaneously to stand tall.', 4, '5', 180, array['Trap Bar Deadlift', 'Romanian Deadlift']),
  ('Barbell Bent-Over Row', 'Latissimus Dorsi & Rhomboids', array['Biceps', 'Rear Deltoids', 'Core'], 'Back', 'Barbell', 'Intermediate', 'Compound', 'Hinge at 45 degrees with flat spine. Grip bar overhand or underhand, pull barbell toward lower ribcage pulling through the elbows. Lower slowly.', 4, '8-10', 90, array['Dumbbell Row', 'T-Bar Row', 'Seated Cable Row']),
  ('Lat Pulldown', 'Latissimus Dorsi (Lats)', array['Biceps', 'Rhomboids'], 'Back', 'Cable', 'Beginner', 'Compound', 'Sit with thighs secure under pads. Grip wide bar outside shoulder width. Pull bar down toward upper collarbone, driving elbows toward ribs while arching upper chest slightly.', 3, '10-12', 75, array['Pull-ups', 'Assisted Pull-ups', 'Straight-Arm Pulldown']),
  ('Single-Arm Dumbbell Row', 'Middle Back & Lats', array['Biceps', 'Forearms'], 'Back', 'Dumbbell', 'Beginner', 'Compound', 'Place one knee and hand on flat bench. With free hand, row dumbbell upward alongside hip, keeping elbow tucked and torso stable.', 3, '10-12', 60, array['Meadows Row', 'Chest-Supported Machine Row']),
  ('Seated Cable Row', 'Rhomboids & Mid-Traps', array['Lats', 'Biceps'], 'Back', 'Cable', 'Beginner', 'Compound', 'Sit tall with feet on platforms. Retract shoulder blades and row the V-bar into your abdomen. Squeeze back, return with controlled stretch.', 3, '10-12', 60, array['Incline Dumbbell Row', 'Barbell Row']),

  -- Shoulders
  ('Overhead Barbell Press', 'Anterior & Lateral Deltoids', array['Triceps', 'Upper Chest', 'Core'], 'Shoulders', 'Barbell', 'Intermediate', 'Compound', 'Stand with bar racked at clavicle. Brace glutes and abs. Press bar straight upward overhead, tucking head back slightly as bar passes forehead, locking out overhead.', 4, '6-8', 120, array['Dumbbell Shoulder Press', 'Machine Overhead Press']),
  ('Dumbbell Lateral Raise', 'Lateral Deltoids (Side Delts)', array['Trapezius'], 'Shoulders', 'Dumbbell', 'Beginner', 'Isolation', 'Stand with slight forward lean. Raise dumbbells out to sides until arms are parallel with floor, leading with elbows and pouring the thumb slightly downward.', 4, '12-15', 60, array['Cable Lateral Raise', 'Machine Lateral Raise']),
  ('Face Pulls', 'Rear Deltoids & Rotator Cuff', array['Upper Traps', 'Rhomboids'], 'Shoulders', 'Cable', 'Beginner', 'Isolation', 'Attach rope to high cable. Pull handles toward bridge of nose while externally rotating shoulders, pulling elbows wide and back.', 3, '15-20', 60, array['Reverse Pec Deck', 'Rear Delt Flyes']),
  ('Dumbbell Arnold Press', 'All Deltoid Heads', array['Triceps'], 'Shoulders', 'Dumbbell', 'Intermediate', 'Compound', 'Hold dumbbells in front of shoulders with palms facing you. As you press upward, rotate wrists so palms face forward at full extension.', 3, '10-12', 75, array['Seated Dumbbell Press', 'Military Press']),

  -- Legs - Quadriceps & Hamstrings & Glutes
  ('Barbell Back Squat', 'Quadriceps & Glutes', array['Adductors', 'Hamstrings', 'Spinal Erectors'], 'Quadriceps', 'Barbell', 'Intermediate', 'Compound', 'Rest bar on upper traps. Set stance shoulder-width with toes flared 15-30 degrees. Break hips and knees together, descend to hip crease below knee, push through whole foot to stand.', 4, '6-8', 150, array['Goblet Squat', 'Front Squat', 'Leg Press']),
  ('Romanian Deadlift (RDL)', 'Hamstrings & Gluteus Maximus', array['Lower Back', 'Core'], 'Hamstrings', 'Barbell', 'Intermediate', 'Compound', 'Hold bar at hips with soft knees. Push hips backward along horizontal plane, keeping bar glued to legs until reaching mid-shin stretch. Squeeze glutes to return.', 3, '8-10', 90, array['Dumbbell RDL', 'Seated Leg Curl']),
  ('Bulgarian Split Squat', 'Quadriceps & Glutes', array['Calves', 'Core Balance'], 'Quadriceps', 'Dumbbell', 'Intermediate', 'Compound', 'Place rear foot elevated on bench behind you. Lower rear knee toward floor while keeping front tibia relatively upright. Drive through front heel.', 3, '10-12', 90, array['Walking Lunges', 'Reverse Lunges']),
  ('Lying Leg Curl', 'Hamstrings', array['Calves'], 'Hamstrings', 'Machine', 'Beginner', 'Isolation', 'Lie face down with pad adjusted above ankles. Curl weight toward glutes, pause for 1 second contraction, lower under 3-second eccentric tempo.', 3, '12-15', 60, array['Seated Leg Curl', 'Nordic Hamstring Curls']),
  ('Leg Extension', 'Quadriceps (Rectus Femoris)', array[], 'Quadriceps', 'Machine', 'Beginner', 'Isolation', 'Sit back against pad with knees aligned with machine pivot. Extend legs until straight, squeezing quads at peak contraction. Lower with control.', 3, '12-15', 60, array['Sissy Squats', 'Spanish Squats']),
  ('Barbell Hip Thrust', 'Gluteus Maximus', array['Hamstrings', 'Adductors'], 'Glutes', 'Barbell', 'Intermediate', 'Compound', 'Sit against bench edge with barbell padded over hips. Drive through heels to raise hips to full extension, creating a 90-degree angle at knees. Squeeze glutes 2 seconds.', 4, '10-12', 90, array['Dumbbell Hip Thrust', 'Glute Bridge', 'Cable Pull-Through']),
  ('Standing Calf Raise', 'Gastrocnemius & Soleus', array[], 'Calves', 'Machine', 'Beginner', 'Isolation', 'Balls of feet on step with heels hanging down. Lower into deep calf stretch, push through big toes to peak plantarflexion. Hold 1 second at top.', 4, '15-20', 60, array['Seated Calf Raise', 'Dumbbell Calf Raise']),

  -- Arms - Biceps, Triceps, Forearms
  ('Barbell Bicep Curl', 'Biceps Brachii', array['Brachialis', 'Forearms'], 'Biceps', 'Barbell', 'Beginner', 'Isolation', 'Hold barbell with shoulder-width underhand grip. Keep elbows pinned to sides, curl weight up towards upper chest. Lower smoothly under control.', 3, '10-12', 60, array['Dumbbell Curl', 'EZ-Bar Curl', 'Cable Curl']),
  ('Incline Dumbbell Curl', 'Biceps Long Head (Peak)', array['Forearms'], 'Biceps', 'Dumbbell', 'Intermediate', 'Isolation', 'Lie back on 60-degree incline bench with arms hanging down. Curl dumbbells up without swinging shoulders to achieve maximum stretch on long head.', 3, '10-12', 60, array['Preacher Curl', 'Bayesian Cable Curl']),
  ('Tricep Rope Pushdown', 'Triceps (Lateral Head)', array[], 'Triceps', 'Cable', 'Beginner', 'Isolation', 'Attach rope to high pulley. Keep elbows tucked at sides. Extend arms downward, flaring ends of rope apart at bottom for peak contraction.', 3, '12-15', 60, array['Straight Bar Pushdown', 'Dips']),
  ('Skull Crushers (Lying Triceps Extension)', 'Triceps Long Head', array[], 'Triceps', 'Barbell', 'Intermediate', 'Isolation', 'Lie on flat bench holding EZ-bar. Keep upper arms angled slightly back toward head, hinge at elbows to lower bar to crown of head, extend back up.', 3, '10-12', 75, array['Overhead Dumbbell Extension', 'Cable Overhead Extension']),
  ('Barbell Wrist Curl', 'Forearm Flexors', array[], 'Forearms', 'Barbell', 'Beginner', 'Isolation', 'Rest forearms on bench or knees with wrists hanging over edge. Curl bar upward using wrists, unroll down to fingers for full stretch.', 3, '15-20', 45, array['Reverse Wrist Curl', 'Farmer Walk']),

  -- Abs & Core
  ('Hanging Leg Raise', 'Rectus Abdominis & Hip Flexors', array['Obliques', 'Grip'], 'Abs', 'Bodyweight', 'Intermediate', 'Bodyweight', 'Hang from pull-up bar. Without excessive swinging, raise straight legs or knees up toward chest, curling pelvis upward to engage lower abs.', 3, '12-15', 60, array['Captain’s Chair Leg Raise', 'Reverse Crunch']),
  ('Cable Woodchoppers', 'Internal & External Obliques', array['Transverse Abdominis'], 'Abs', 'Cable', 'Beginner', 'Isolation', 'Set pulley high. Rotate torso across body diagonally downward, pivoting back foot. Return under controlled rotational resistance.', 3, '12-15', 60, array['Russian Twists', 'Bicycle Crunches']),
  ('Plank Hold', 'Transverse Abdominis & Core Stability', array['Glutes', 'Shoulders'], 'Abs', 'Bodyweight', 'Beginner', 'Bodyweight', 'Rest on forearms and toes. Keep spine neutral, glutes tight, abs braced like preparing for a punch. Hold for target duration.', 3, '45-60 sec', 60, array['Ab Wheel Rollout', 'Pallof Press'])
on conflict do nothing;
