-- Aligns skill_level, play_preference, playing_frequency, and years_playing
-- with the original product spec's exact wording/buckets. These drifted
-- from spec back in migration 0002 and were only caught by walking through
-- onboarding manually — see the app-side commit that accompanies this
-- migration for the full before/after.
--
-- play_preference and playing_frequency are simple label renames: Postgres
-- enum values carry a stable identity separate from their label, so
-- `ALTER TYPE ... RENAME VALUE` transparently updates every existing row,
-- column default, and dependent view/function with no data migration and
-- no dependency-drop dance required.

alter type play_preference rename value 'social' to 'casual';

alter type playing_frequency rename value 'rarely' to 'occasionally';
alter type playing_frequency rename value 'weekly' to 'once_per_week';
alter type playing_frequency rename value 'few_times_week' to 'two_to_three_per_week';
alter type playing_frequency rename value 'daily' to 'four_plus_per_week';

-- skill_level needs values removed (1.0, 1.5, 5.0, 5.5+) and one added
-- (beginner) — Postgres has no DROP VALUE for enums, so this requires a
-- full type swap rather than a rename. That means dropping every object
-- that has a hard dependency on the `skill_level` type first:
--   - get_discovery_candidates (0014) casts p_skill_min/p_skill_max to
--     ::skill_level, which registers a dependency on the type itself, not
--     just the column — DROP TYPE would fail without dropping this first.
--   - public_profiles (0012) selects profiles.skill_level directly, and
--     Postgres blocks ALTER COLUMN ... TYPE on a column any view depends
--     on ("cannot alter type of a column used by a view or rule").
-- Both are recreated verbatim (same bodies as 0014/0012) at the end of
-- this migration once the new type is in place under the original name.

drop function if exists public.get_discovery_candidates(integer, text, text, text, text, integer);
drop view if exists public.public_profiles;

create type skill_level_new as enum ('beginner','2.0','2.5','3.0','3.5','4.0','4.5','5.0+');

alter table public.profiles
  alter column skill_level type skill_level_new
  using (
    case skill_level::text
      when '1.0' then 'beginner'
      when '1.5' then 'beginner'
      when '2.0' then '2.0'
      when '2.5' then '2.5'
      when '3.0' then '3.0'
      when '3.5' then '3.5'
      when '4.0' then '4.0'
      when '4.5' then '4.5'
      when '5.0' then '5.0+'
      when '5.5+' then '5.0+'
    end
  )::skill_level_new;

drop type skill_level;
alter type skill_level_new rename to skill_level;

-- years_playing moves from a raw smallint to a bucketed enum matching the
-- spec's "Less than 1 year / 1-2 years / 3-5 years / 5+ years" choice —
-- it was built as a free-entry number, not a selector, which also doesn't
-- match spec. The existing range check constraint and numeric default no
-- longer apply to the new type and must be dropped before the column type
-- change, not after (an enum default can't be validated against a
-- still-numeric default expression).

alter table public.profiles alter column years_playing drop default;
alter table public.profiles drop constraint years_playing_range;

create type years_playing as enum ('less_than_1', 'one_to_two', 'three_to_five', 'five_plus');

alter table public.profiles
  alter column years_playing type years_playing
  using (
    case
      when years_playing < 1 then 'less_than_1'
      when years_playing between 1 and 2 then 'one_to_two'
      when years_playing between 3 and 5 then 'three_to_five'
      else 'five_plus'
    end
  )::years_playing;

alter table public.profiles alter column years_playing set default 'less_than_1';

-- Recreate public_profiles exactly as defined in 0012, now resolving
-- against the new skill_level/years_playing types.
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
  date_part('year', age(p.date_of_birth))::integer as age
from public.profiles p;

grant select on public.public_profiles to authenticated;

-- Recreate get_discovery_candidates exactly as defined in 0014, now
-- resolving p_skill_min/p_skill_max casts against the new skill_level.
create function public.get_discovery_candidates(
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
  cross join (select location from public.profiles where id = auth.uid()) as me
  where p.id <> auth.uid()
    and p.location is not null
    and me.location is not null
    and st_dwithin(p.location, me.location, p_max_distance_km * 1000)
    and p.skill_level between p_skill_min::skill_level and p_skill_max::skill_level
    and (p_game_pref is null or p.game_preference = p_game_pref::game_preference)
    and (p_play_pref is null or p.play_preference = p_play_pref::play_preference)
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

grant execute on function public.get_discovery_candidates(integer, text, text, text, text, integer)
  to authenticated;
