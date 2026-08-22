-- public_profiles: a safe, read-only projection of profiles exposing only
-- non-sensitive columns (no date_of_birth, no lat/long, no bio-level PII
-- beyond what's needed for browsing).
--
-- Design tradeoff: base table `profiles` restricts SELECT via RLS to
-- `auth.uid() = id` (see 0010_rls_policies.sql), because most columns
-- (email-adjacent identity, precise location, DOB) should never be
-- broadly readable. But other users still need to browse limited profile
-- fields (e.g. for match/message display). A plain view does NOT bypass
-- the underlying table's RLS by default in Postgres (views execute with
-- the *invoking* user's permissions unless marked otherwise), so a normal
-- view here would still only return the caller's own row.
--
-- We therefore create this view owned by a privileged role (the migration
-- role / postgres), which Postgres treats as security-definer-like for
-- view row visibility purposes: the view's underlying query runs with the
-- view owner's privileges, not the querying user's, allowing it to read
-- across all profiles rows despite the base table's restrictive RLS.
-- Access to the view itself is then controlled purely by GRANT/REVOKE and
-- (optionally) row filters written directly into the view's WHERE clause,
-- NOT by the base table's RLS policies. This is the standard Postgres/
-- Supabase pattern for "safe public projection" views and is explicitly
-- documented as a security-relevant choice: anyone granted SELECT on this
-- view can read every row's exposed columns, so only include columns that
-- are genuinely safe to broadcast.
create view public.public_profiles
with (security_invoker = false)
as
select
  p.id,
  p.first_name,
  p.city,
  p.region,
  p.skill_level,
  p.game_preference,
  p.play_preference,
  date_part('year', age(p.date_of_birth))::integer as age
from public.profiles p;

grant select on public.public_profiles to authenticated;
