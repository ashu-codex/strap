-- =============================================================================
-- STRAP AI Fitness — Preferred Height Unit Persistence
-- SAFE / IDEMPOTENT: adds height_unit column while preserving standardized
-- centimeters in height / height_cm and all existing user records.
-- =============================================================================

alter table public.user_profiles
  add column if not exists height_unit text not null default 'cm'
  check (height_unit in ('cm', 'ft_in'));

alter table public.fitness_metrics
  add column if not exists height_unit text not null default 'cm'
  check (height_unit in ('cm', 'ft_in'));

grant update (
  full_name, avatar_url, age, gender, height, height_unit, weight, body_fat_percentage,
  fitness_goal, activity_level, experience_level, dietary_preference
) on public.user_profiles to authenticated;
