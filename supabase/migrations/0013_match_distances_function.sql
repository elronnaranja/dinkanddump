-- get_match_distances: returns the great-circle distance (km) between the
-- caller and each of their match participants, for every match the given
-- user is part of (any status — callers filter to 'active' client-side if
-- needed).
--
-- Why this exists: the Matches screen (Phase 6) wants to show "X km away"
-- next to each match, the same way discovery cards do. But
-- `profiles.location`/`latitude`/`longitude` are only selectable by the row
-- owner under RLS (see 0010_rls_policies.sql), and the `public_profiles`
-- view (0009/0012) deliberately omits location entirely. Once two users
-- match, they also drop out of get_discovery_candidates (0008) — it
-- excludes anyone already swiped — so that RPC can't be reused to recover
-- a distance either. This mirrors get_discovery_candidates' approach
-- (security definer + PostGIS st_distance) rather than exposing raw
-- lat/long to the client.
-- No p_user_id parameter: the caller's identity comes only from
-- auth.uid(), the same pattern record_swipe (0007) uses. A
-- client-suppliable p_user_id here (as get_discovery_candidates in
-- 0008 takes) would let any authenticated caller pass someone else's
-- id and, because this function is security definer, read who that
-- other person matched with and at what distance — a privilege
-- escalation past the matches RLS policy (0010), which restricts
-- select to auth.uid() in (user_1_id, user_2_id).
create or replace function public.get_match_distances()
returns table (
  match_id uuid,
  other_user_id uuid,
  distance_km numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id as match_id,
    (case when m.user_1_id = auth.uid() then m.user_2_id else m.user_1_id end) as other_user_id,
    case
      when me.location is null or other.location is null then null
      else round((st_distance(me.location, other.location) / 1000.0)::numeric, 2)
    end as distance_km
  from public.matches m
  join public.profiles me on me.id = auth.uid()
  join public.profiles other
    on other.id = (case when m.user_1_id = auth.uid() then m.user_2_id else m.user_1_id end)
  where auth.uid() in (m.user_1_id, m.user_2_id);
$$;

grant execute on function public.get_match_distances() to authenticated;
