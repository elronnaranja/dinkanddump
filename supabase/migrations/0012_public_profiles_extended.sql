-- Extends public_profiles (see 0009) with the additional non-sensitive
-- pickleball fields needed for the discovery "more info" panel (Phase 5):
-- bio, self-entered DUPR rating, play style, playing frequency, years
-- playing, favorite shot, and dominant hand. Still excludes date_of_birth,
-- lat/long, and anything email-adjacent — only genuinely browsable fields.
--
-- The column list changes (new columns are added in the middle of the
-- select list, not strictly appended), so `create or replace view` isn't
-- usable as-is (Postgres only allows CREATE OR REPLACE to append trailing
-- columns without altering/removing existing ones). Drop and recreate
-- instead; nothing else depends on this view.
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
  date_part('year', age(p.date_of_birth))::integer as age
from public.profiles p;

grant select on public.public_profiles to authenticated;
