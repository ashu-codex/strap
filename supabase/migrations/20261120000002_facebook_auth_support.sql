-- =============================================================================
-- STRAP AI Fitness — Facebook OAuth Profile & Email-less Account Support
-- SAFE / IDEMPOTENT: Never drops tables or modifies/deletes existing user data.
-- =============================================================================

-- 1. Replace user_profiles_email_idx with a partial unique index so multiple
--    OAuth accounts without an email (email = '') never collide, while every
--    non-empty email remains strictly unique.
drop index if exists public.user_profiles_email_idx;
create unique index if not exists user_profiles_email_idx
  on public.user_profiles (lower(email))
  where email is not null and trim(email) <> '';

-- 2. Update handle_new_auth_user() trigger to handle Facebook metadata (nested
--    picture.data.url avatar and optional missing email) without overwriting
--    existing profiles or subscriptions.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_name text;
  v_avatar text;
begin
  v_email := lower(trim(coalesce(new.email, new.raw_user_meta_data->>'email', '')));
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(v_email, '@', 1), ''),
    'Athlete'
  );
  v_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->'picture'->'data'->>'url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );

  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (new.id, v_email, v_name, v_avatar)
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, price_inr)
  values (new.id, 'free', 'active', 0)
  on conflict (user_id) do nothing;

  return new;
end $$;
