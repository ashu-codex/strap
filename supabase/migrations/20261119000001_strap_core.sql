-- =============================================================================
-- STRAP AI Fitness — core schema, RLS, owner-admin model
-- SAFE / IDEMPOTENT: uses IF NOT EXISTS and DROP POLICY IF EXISTS only on
-- objects created by this file. It NEVER drops tables or deletes rows.
-- Run in: Supabase Dashboard -> SQL Editor (or `supabase db push`).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 0. Helper: updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Owner-admin allowlist (server-controlled; NOT user editable)
--    Owner email is inserted by the trusted bootstrap script / SQL below.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_allowlist (
  email       text primary key check (email = lower(email)),
  created_at  timestamptz not null default now()
);

-- Helper used by RLS policies. SECURITY DEFINER so normal users cannot read the
-- allowlist table directly, but policies can still evaluate membership.
-- Requires a verified email in the signed JWT (auth.jwt() is server-issued, not
-- user-editable; user_metadata is intentionally NOT consulted).
create or replace function public.is_owner_admin()
returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1
    from auth.users u
    join public.admin_allowlist a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_owner_admin() from public;
grant execute on function public.is_owner_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. User profiles (id == auth.users.id)
-- -----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text not null default '',
  email                text not null default '',
  avatar_url           text,
  age                  int  check (age is null or (age between 10 and 100)),
  gender               text,
  height               numeric(5,1),            -- cm
  weight               numeric(5,1),            -- kg
  body_fat_percentage  numeric(4,1),
  fitness_goal         text,
  activity_level       text,
  experience_level     text,
  dietary_preference   text,
  role                 text not null default 'user' check (role in ('user','admin')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists user_profiles_email_idx on public.user_profiles (lower(email));
drop trigger if exists trg_user_profiles_updated on public.user_profiles;
create trigger trg_user_profiles_updated before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile for every new auth user (email, Google, anything).
-- role is ALWAYS 'user' here. Admin is decided only by admin_allowlist.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, price_inr)
  values (new.id, 'free', 'active', 0)
  on conflict (user_id) do nothing;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Subscriptions & payments
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  plan                  text not null default 'free' check (plan in ('free','premium')),
  status                text not null default 'active' check (status in ('active','expired','canceled')),
  price_inr             numeric(10,2) not null default 0,
  current_period_start  timestamptz not null default now(),
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  user_email          text,
  user_name           text,
  amount_inr          numeric(10,2) not null check (amount_inr > 0),
  currency            text not null default 'INR',
  payment_method      text not null default 'upi_manual' check (payment_method in ('upi_manual','razorpay','cashfree')),
  payment_status      text not null default 'pending' check (payment_status in ('pending','approved','rejected')),
  upi_id              text,
  utr_reference       text,
  gateway_order_id    text,
  gateway_payment_id  text,
  receipt_url         text,
  admin_notes         text,
  verified_by         text,
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists payments_user_idx   on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (payment_status);
-- Duplicate-payment protection enforced by the database itself:
create unique index if not exists payments_utr_unique
  on public.payments (upper(utr_reference))
  where utr_reference is not null and payment_status <> 'rejected';
create unique index if not exists payments_gateway_payment_unique
  on public.payments (gateway_payment_id) where gateway_payment_id is not null;
drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Fitness data
-- -----------------------------------------------------------------------------
create table if not exists public.fitness_metrics (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  age                   int,
  gender                text,
  height_cm             numeric(5,1),
  current_weight_kg     numeric(5,1),
  body_fat_pct          numeric(4,1),
  chest_cm              numeric(5,1),
  waist_cm              numeric(5,1),
  hips_cm               numeric(5,1),
  arms_cm               numeric(5,1),
  experience_level      text,
  workout_location      text,
  workout_duration_mins int,
  equipment             text[] not null default '{}',
  strength_levels       jsonb  not null default '{}'::jsonb,
  limitations           text,
  diet_preference       text,
  sleep_hours_avg       numeric(3,1),
  daily_activity_level  text,
  daily_steps_avg       int,
  rest_days_preferred   int,
  updated_at            timestamptz not null default now()
);
drop trigger if exists trg_fitness_metrics_updated on public.fitness_metrics;
create trigger trg_fitness_metrics_updated before update on public.fitness_metrics
  for each row execute function public.set_updated_at();

create table if not exists public.fitness_goals (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  primary_goal         text not null default 'general_fitness',
  target_weight_kg     numeric(5,1),
  weekly_workout_days  int not null default 4 check (weekly_workout_days between 1 and 7),
  target_date          date,
  updated_at           timestamptz not null default now()
);
drop trigger if exists trg_fitness_goals_updated on public.fitness_goals;
create trigger trg_fitness_goals_updated before update on public.fitness_goals
  for each row execute function public.set_updated_at();

create table if not exists public.body_measurements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  recorded_date  date not null default current_date,
  weight_kg      numeric(5,1) not null,
  body_fat_pct   numeric(4,1),
  chest_cm       numeric(5,1),
  waist_cm       numeric(5,1),
  hips_cm        numeric(5,1),
  arms_cm        numeric(5,1),
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists body_measurements_user_idx on public.body_measurements (user_id, recorded_date desc);

create table if not exists public.sleep_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  log_date       date not null default current_date,
  sleep_hours    numeric(3,1) not null check (sleep_hours between 0 and 24),
  sleep_quality  int check (sleep_quality between 1 and 5),
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists sleep_logs_user_idx on public.sleep_logs (user_id, log_date desc);

create table if not exists public.recovery_logs (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  log_date               date not null default current_date,
  fatigue_level          int check (fatigue_level between 1 and 5),
  muscle_soreness_score  int check (muscle_soreness_score between 1 and 5),
  recovery_score_pct     int check (recovery_score_pct between 0 and 100),
  readiness_status       text check (readiness_status in ('ready','recovering','rest_recommended')),
  created_at             timestamptz not null default now()
);
create index if not exists recovery_logs_user_idx on public.recovery_logs (user_id, log_date desc);

create table if not exists public.workout_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null default 'Workout',
  split_type       text,
  exercises        jsonb not null default '[]'::jsonb,
  total_volume_kg  numeric(10,1) not null default 0,
  completed_at     timestamptz not null default now()
);
create index if not exists workout_logs_user_idx on public.workout_logs (user_id, completed_at desc);

create table if not exists public.progress_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  exercise_name  text not null,
  record_type    text not null check (record_type in ('1rm','max_reps','max_volume')),
  value          numeric(8,1) not null,
  achieved_at    date not null default current_date,
  unique (user_id, exercise_name, record_type)
);
create index if not exists progress_records_user_idx on public.progress_records (user_id);

create table if not exists public.nutrition_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null default current_date,
  calories    int,
  protein_g   int,
  carbs_g     int,
  fats_g      int,
  water_l     numeric(3,1),
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists nutrition_records_user_idx on public.nutrition_records (user_id, log_date desc);

-- -----------------------------------------------------------------------------
-- 5. AI data
-- -----------------------------------------------------------------------------
create table if not exists public.ai_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('workout','nutrition','recovery','adaptation')),
  content     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists ai_plans_user_kind_idx on public.ai_plans (user_id, kind, created_at desc);

create table if not exists public.ai_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user','model')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ai_chat_user_idx on public.ai_chat_messages (user_id, created_at desc);

-- Server-written request log used for rate limiting / token controls.
create table if not exists public.ai_usage_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ai_usage_user_time_idx on public.ai_usage_log (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 6. Preferences, settings, audit
-- -----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  theme       text not null default 'system' check (theme in ('dark','light','system')),
  preferences jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table if not exists public.app_settings (
  id             int primary key default 1 check (id = 1),
  price_inr      numeric(10,2) not null default 100,
  billing_period text not null default 'monthly',
  upi_id         text not null default '',
  default_model  text not null default 'gemini-1.5-flash',
  updated_at     timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.admin_audit_logs (
  id           bigint generated always as identity primary key,
  admin_id     uuid,
  admin_email  text not null,
  action       text not null,
  target_type  text,
  target_id    text,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists admin_audit_time_idx on public.admin_audit_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
--    Browser code only has the publishable/anon key => everything below applies.
--    Server routes use the service-role key (bypasses RLS) AFTER verifying the
--    caller; RLS is the second wall for any direct client access.
-- -----------------------------------------------------------------------------
alter table public.admin_allowlist    enable row level security;  -- no policies => no client access
alter table public.user_profiles      enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;
alter table public.fitness_metrics    enable row level security;
alter table public.fitness_goals      enable row level security;
alter table public.body_measurements  enable row level security;
alter table public.sleep_logs         enable row level security;
alter table public.recovery_logs      enable row level security;
alter table public.workout_logs       enable row level security;
alter table public.progress_records   enable row level security;
alter table public.nutrition_records  enable row level security;
alter table public.ai_plans           enable row level security;
alter table public.ai_chat_messages   enable row level security;
alter table public.ai_usage_log       enable row level security;
alter table public.user_preferences   enable row level security;
alter table public.app_settings       enable row level security;
alter table public.admin_audit_logs   enable row level security;

-- user_profiles: read own; update ONLY safe columns (role/email locked by grants)
drop policy if exists "profiles_select_own" on public.user_profiles;
create policy "profiles_select_own" on public.user_profiles for select to authenticated
  using (id = auth.uid() or public.is_owner_admin());
drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own" on public.user_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.user_profiles from authenticated, anon;
grant  update (full_name, avatar_url, age, gender, height, weight, body_fat_percentage,
               fitness_goal, activity_level, experience_level, dietary_preference)
  on public.user_profiles to authenticated;
revoke insert, delete on public.user_profiles from authenticated, anon;

-- subscriptions: read own only. No insert/update/delete from clients.
drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_owner_admin());
revoke insert, update, delete on public.subscriptions from authenticated, anon;

-- payments: read own only. Clients can NEVER approve/modify (no write grants).
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_owner_admin());
revoke insert, update, delete on public.payments from authenticated, anon;

-- Generic "own rows" policies for user-owned data tables.
do $$
declare t text;
begin
  foreach t in array array[
    'fitness_metrics','fitness_goals','body_measurements','sleep_logs','recovery_logs',
    'workout_logs','progress_records','nutrition_records','user_preferences'
  ] loop
    execute format('drop policy if exists "%1$s_own_all" on public.%1$I', t);
    execute format(
      'create policy "%1$s_own_all" on public.%1$I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- AI tables: users may READ their own; writes happen server-side only.
drop policy if exists "ai_plans_select_own" on public.ai_plans;
create policy "ai_plans_select_own" on public.ai_plans for select to authenticated using (user_id = auth.uid());
drop policy if exists "ai_chat_select_own" on public.ai_chat_messages;
create policy "ai_chat_select_own" on public.ai_chat_messages for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.ai_plans, public.ai_chat_messages, public.ai_usage_log from authenticated, anon;

-- app_settings: price / UPI id are public-readable (needed for checkout); write = server only.
drop policy if exists "settings_read" on public.app_settings;
create policy "settings_read" on public.app_settings for select to authenticated using (true);
revoke insert, update, delete on public.app_settings from authenticated, anon;

-- audit logs: owner admin read only; no client writes.
drop policy if exists "audit_select_admin" on public.admin_audit_logs;
create policy "audit_select_admin" on public.admin_audit_logs for select to authenticated using (public.is_owner_admin());
revoke insert, update, delete on public.admin_audit_logs from authenticated, anon;

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;

-- -----------------------------------------------------------------------------
-- 8. OWNER BOOTSTRAP (controlled SQL — edit the email, run ONCE, then commit nothing)
--    The owner must still sign up/log in and VERIFY this email in Supabase Auth.
--    Until that happens is_owner_admin() is false even though the row exists.
-- -----------------------------------------------------------------------------
-- insert into public.admin_allowlist (email) values (lower('YOUR_GMAIL_ADDRESS@gmail.com'))
--   on conflict do nothing;
-- update public.user_profiles set role = 'admin'
--   where lower(email) = lower('YOUR_GMAIL_ADDRESS@gmail.com');

-- -----------------------------------------------------------------------------
-- 9. Backfill: profiles/subscriptions for auth users that pre-date the trigger.
--    (Only inserts missing rows; never touches existing data.)
-- -----------------------------------------------------------------------------
insert into public.user_profiles (id, email, full_name)
select u.id, coalesce(u.email,''), coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email,''),'@',1))
from auth.users u
on conflict (id) do nothing;

insert into public.subscriptions (user_id, plan, status, price_inr)
select u.id, 'free', 'active', 0 from auth.users u
on conflict (user_id) do nothing;
