-- get_discovery_candidates: returns a page of discoverable profiles for a
-- given user, filtered by distance/skill/preferences, excluding self,
-- already-swiped (either direction/action), and blocked (either direction)
-- users. Never returns raw latitude/longitude.
--
-- Assumption: `skill_level` is a Postgres enum (public.skill_level) declared
-- in ascending skill order ('1.0', '1.5', ..., '5.5+'). Postgres enum
-- comparison operators (<, between, etc.) follow the type's declaration
-- order, not lexical/text order, so `skill_level between p_skill_min and
-- p_skill_max` (after casting the text params to skill_level) sorts
-- correctly without a separate CASE mapping.
create or replace function public.get_discovery_candidates(
  p_user_id uuid,
  p_max_distance_km integer,
  p_skill_min text,
  p_skill_max text,
  p_game_pref text,
  p_play_pref text,
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
  primary_photo_path text
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
    ) as primary_photo_path
  from public.profiles p
  cross join (select location from public.profiles where id = p_user_id) as me
  where p.id <> p_user_id
    and p.location is not null
    and me.location is not null
    and st_dwithin(p.location, me.location, p_max_distance_km * 1000)
    and p.skill_level between p_skill_min::skill_level and p_skill_max::skill_level
    and (p_game_pref is null or p.game_preference = p_game_pref::game_preference)
    and (p_play_pref is null or p.play_preference = p_play_pref::play_preference)
    and not exists (
      select 1 from public.swipes s
      where (s.from_user_id = p_user_id and s.to_user_id = p.id)
         or (s.from_user_id = p.id and s.to_user_id = p_user_id)
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_user_id and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = p_user_id)
    )
  order by distance_km asc
  limit p_limit;
$$;

grant execute on function public.get_discovery_candidates(uuid, integer, text, text, text, text, integer)
  to authenticated;
