-- =============================================================================
-- STRAP AI Fitness — Auth Email Lookup RPC & Profile Uniqueness Reinforcement
-- SAFE / IDEMPOTENT: Never drops tables or modifies/deletes existing user data.
-- =============================================================================

-- 1. Reinforce unique constraints (already defined in 20261119000001_strap_core.sql;
--    kept idempotent here to guarantee zero duplicate profiles or subscriptions).
create unique index if not exists user_profiles_email_idx
  on public.user_profiles (lower(email));

-- 2. Server-only (service_role) O(1) lookup against auth.users by normalized email.
--    Returns existence, verification status, and linked providers (e.g. email, google).
--    Revoked from public, anon, and authenticated so clients can NEVER call it directly.
create or replace function public.lookup_auth_user_by_email(p_email text)
returns table (
  user_id uuid,
  email_confirmed boolean,
  providers text[]
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    u.id as user_id,
    (u.email_confirmed_at is not null) as email_confirmed,
    coalesce(
      array_agg(distinct i.provider) filter (where i.provider is not null),
      array[]::text[]
    ) as providers
  from auth.users u
  left join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
  group by u.id, u.email_confirmed_at
  limit 1;
$$;

revoke all on function public.lookup_auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.lookup_auth_user_by_email(text) to service_role;
