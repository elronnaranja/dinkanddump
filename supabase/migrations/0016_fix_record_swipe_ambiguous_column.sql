-- Fixes a bug in record_swipe (0007) that has been broken since it was
-- first written: the parameter `to_user_id` has the exact same name as
-- `public.swipes.to_user_id`, and the reciprocal-swipe lookup
--   select action into v_reciprocal_action
--   from public.swipes
--   where from_user_id = to_user_id and to_user_id = v_from_user_id;
-- is genuinely ambiguous inside that query's scope — Postgres cannot tell
-- whether `to_user_id` means the column or the parameter, and raises
-- "column reference \"to_user_id\" is ambiguous" (42702) on every call.
-- Nothing caught this until the app was actually run end-to-end for the
-- first time and DINK failed outright.
--
-- Fix: rename the parameter to p_to_user_id, matching the p_ prefix
-- already used for p_action in this same function (the inconsistency is
-- exactly what caused the collision). Unlike most function edits,
-- Postgres flatly refuses to rename an existing parameter via CREATE OR
-- REPLACE ("cannot change name of input parameter"), even though the
-- type signature is unchanged — it must be dropped and recreated.
drop function public.record_swipe(uuid, text);

create function public.record_swipe(p_to_user_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_user_id uuid := auth.uid();
  v_action swipe_action := p_action::swipe_action;
  v_reciprocal_action swipe_action;
  v_user_1 uuid;
  v_user_2 uuid;
  v_match_id uuid;
  v_conversation_id uuid;
begin
  if v_from_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_from_user_id = p_to_user_id then
    raise exception 'Cannot swipe on yourself';
  end if;

  insert into public.swipes (from_user_id, to_user_id, action)
  values (v_from_user_id, p_to_user_id, v_action)
  on conflict (from_user_id, to_user_id)
  do update set action = excluded.action, updated_at = now();

  if v_action <> 'dink' then
    return jsonb_build_object('matched', false, 'match_id', null);
  end if;

  select action into v_reciprocal_action
  from public.swipes
  where from_user_id = p_to_user_id
    and to_user_id = v_from_user_id;

  if v_reciprocal_action is distinct from 'dink' then
    return jsonb_build_object('matched', false, 'match_id', null);
  end if;

  -- Canonical ordering so the unique constraint dedupes regardless of who
  -- swiped last.
  v_user_1 := least(v_from_user_id, p_to_user_id);
  v_user_2 := greatest(v_from_user_id, p_to_user_id);

  insert into public.matches (user_1_id, user_2_id)
  values (v_user_1, v_user_2)
  on conflict (user_1_id, user_2_id) do nothing
  returning id into v_match_id;

  if v_match_id is null then
    -- Either the match already existed (created earlier, or lost the race
    -- to a concurrent call) — nothing new to create here.
    select id into v_match_id
    from public.matches
    where user_1_id = v_user_1 and user_2_id = v_user_2;

    return jsonb_build_object('matched', false, 'match_id', v_match_id);
  end if;

  -- This transaction won the race and created the match: create the
  -- conversation and membership rows.
  insert into public.conversations (match_id)
  values (v_match_id)
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_user_1), (v_conversation_id, v_user_2);

  return jsonb_build_object('matched', true, 'match_id', v_match_id);
end;
$$;

grant execute on function public.record_swipe(uuid, text) to authenticated;
