-- Reduces the gender enum to exactly male/female/other, per product
-- decision — non_binary and prefer_not_to_say are dropped, with existing
-- rows in either bucket remapped to 'other'.
--
-- get_discovery_candidates (0018) casts p_gender_pref::gender, which
-- registers a hard dependency on the gender type — same situation as
-- skill_level in 0015, so this requires dropping and recreating that
-- function around the type swap rather than a plain ALTER.
drop function if exists public.get_discovery_candidates(integer, text, text, text, text, text, integer);

create type gender_new as enum ('male', 'female', 'other');

alter table public.profiles
  alter column gender type gender_new
  using (
    case gender::text
      when 'male' then 'male'
      when 'female' then 'female'
      when 'non_binary' then 'other'
      when 'other' then 'other'
      when 'prefer_not_to_say' then 'other'
      else null
    end
  )::gender_new;

drop type gender;
alter type gender_new rename to gender;

-- Recreate get_discovery_candidates exactly as defined in 0018, now
-- resolving p_gender_pref::gender against the reduced type.
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
