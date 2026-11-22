-- =============================================================================
-- STRAP — Profile, Goals & Intelligent Nutrition System (Non-Destructive)
-- SAFE / IDEMPOTENT:
--   - Only adds optional nullable/default columns with IF NOT EXISTS.
--   - Never drops tables, never deletes or alters existing user rows.
--   - Respects existing Row Level Security (RLS) policies on user_profiles,
--     fitness_metrics, fitness_goals, body_measurements, and user_preferences.
--   - Note: The application also mirrors extended profile, nutrition preferences,
--     selected calorie pace, and custom targets inside user_preferences.preferences
--     (JSONB) so existing deployments remain 100% compatible even before this
--     migration is applied.
-- =============================================================================

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg'
    CHECK (weight_unit IN ('kg', 'lb'));

-- Extend column-level update grants so authenticated users may update only safe
-- personal profile columns on their own row (role and email remain locked).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    GRANT UPDATE (date_of_birth, weight_unit) ON public.user_profiles TO authenticated;
  END IF;
END $$;
