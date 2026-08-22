-- record_swipe(to_user_id, p_action): upserts a swipe from the calling user
-- and, on a reciprocal "dink", atomically creates a match + conversation.
--
-- Race-safety: two simultaneous "dink" swipes from both sides will both
-- attempt the `insert ... on conflict (user_1_id, user_2_id) do nothing`.
-- The unique constraint on matches(user_1_id, user_2_id) means only one of
-- the two transactions actually inserts a row; we detect "did *this*
-- transaction create the match" by checking whether the INSERT ... RETURNING
-- produced a row. The loser of the race sees no returned row and correctly
-- reports matched=false for its own conversation-creation step (the winner
-- already created the conversation), while both callers can independently
-- re-select the match to discover it exists.
create or replace function public.record_swipe(to_user_id uuid, p_action text)
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

  if v_from_user_id = to_user_id then
    raise exception 'Cannot swipe on yourself';
  end if;

  insert into public.swipes (from_user_id, to_user_id, action)
  values (v_from_user_id, to_user_id, v_action)
  on conflict (from_user_id, to_user_id)
  do update set action = excluded.action, updated_at = now();

  if v_action <> 'dink' then
    return jsonb_build_object('matched', false, 'match_id', null);
  end if;

  select action into v_reciprocal_action
  from public.swipes
  where from_user_id = to_user_id
    and to_user_id = v_from_user_id;

  if v_reciprocal_action is distinct from 'dink' then
    return jsonb_build_object('matched', false, 'match_id', null);
  end if;

  -- Canonical ordering so the unique constraint dedupes regardless of who
  -- swiped last.
  v_user_1 := least(v_from_user_id, to_user_id);
  v_user_2 := greatest(v_from_user_id, to_user_id);

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
