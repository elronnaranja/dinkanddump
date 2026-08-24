-- Email verification: a new profiles.email_verified column, kept in sync
-- from auth.users.email_confirmed_at via trigger, used for (a) a "verified"
-- badge shown to other users (public_profiles / get_discovery_candidates
-- don't have access to auth.users, only to profiles) and (b) gating photo
-- count — a new profile may only have 1 photo until verified, then up to
-- the existing max of 5.
--
-- The actual *enforcement* (enforce_max_photos below) checks
-- auth.users.email_confirmed_at directly rather than trusting
-- profiles.email_verified, so there's no window where a lagging sync could
-- under- or over-permit — Postgres re-reads auth.users fresh on every
-- insert. profiles.email_verified exists purely for display to other
-- users, who have no other way to see this.

alter table public.profiles add column email_verified boolean not null default false;

-- One-time backfill for accounts that were already confirmed before this
-- column existed (every account created via the Admin API with
-- email_confirm: true, including all seed/test data, already qualifies).
update public.profiles p
set email_verified = true
from auth.users u
where u.id = p.id and u.email_confirmed_at is not null;

create or replace function public.sync_profile_email_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  execute function public.sync_profile_email_verified();

-- Gate photo count on verification. Needs security definer (the original
-- 0003 version didn't have it) specifically to read auth.users, which the
-- `authenticated` role has no grant on — without this, a normal user's own
-- photo insert would fail with permission denied the moment this function
-- tries to check email_confirmed_at.
create or replace function public.enforce_max_photos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  photo_count integer;
  v_confirmed timestamptz;
begin
  select count(*) into photo_count
  from public.profile_photos
  where user_id = new.user_id;

  if photo_count >= 5 then
    raise exception 'A profile may have at most 5 photos';
  end if;

  select email_confirmed_at into v_confirmed
  from auth.users
  where id = new.user_id;

  if v_confirmed is null and photo_count >= 1 then
    raise exception 'Verify your email to add more than 1 photo';
  end if;

  return new;
end;
$$;

-- Recreate public_profiles (0012/0015) with email_verified added.
drop view if exists public.public_profiles;

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
  p.dominant_hand,
  p.playing_frequency,
  p.years_playing,
  p.favorite_shot,
  p.play_style,
  p.bio,
  p.dupr_rating,
  p.email_verified,
  date_part('year', age(p.date_of_birth))::integer as age
from public.profiles p;

grant select on public.public_profiles to authenticated;

-- Recreate get_discovery_candidates (0019) with email_verified added so
-- the badge can show directly on discovery cards too, not just after
-- opening a profile.
drop function if exists public.get_discovery_candidates(integer, text, text, text, text, text, integer);

create function public.get_discovery_candidates(
  p_max_distance_km integer,
  p_skill_min text,
  p_skill_max text,
  p_game_pref text,
  p_play_pref text,
  p_gender_pref text,
  p_limit integer
)
returns table (
  id uuid,
  first_name text,
  age integer,
  skill_level skill_level,
  city text,
  region text,
  distance_km numeric,
  primary_photo_path text,
  email_verified boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.first_name,
    date_part('year', age(p.date_of_birth))::integer as age,
    p.skill_level,
    p.city,
    p.region,
    round((st_distance(p.location, me.location) / 1000.0)::numeric, 2) as distance_km,
    (
      select pp.storage_path
      from public.profile_photos pp
      where pp.user_id = p.id
      order by pp.position asc
      limit 1
    ) as primary_photo_path,
    p.email_verified
  from public.profiles p
  cross join (select location from public.profiles where id = auth.uid()) as me
  where p.id <> auth.uid()
    and p.location is not null
    and me.location is not null
    and st_dwithin(p.location, me.location, p_max_distance_km * 1000)
    and p.skill_level between p_skill_min::skill_level and p_skill_max::skill_level
    and (p_game_pref is null or p.game_preference = p_game_pref::game_preference)
    and (p_play_pref is null or p.play_preference = p_play_pref::play_preference)
    and (p_gender_pref is null or p.gender = p_gender_pref::gender)
    and not exists (
      select 1 from public.swipes s
      where (s.from_user_id = auth.uid() and s.to_user_id = p.id)
         or (s.from_user_id = p.id and s.to_user_id = auth.uid())
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by distance_km asc
  limit p_limit;
$$;

grant execute on function public.get_discovery_candidates(integer, text, text, text, text, text, integer)
  to authenticated;
