-- Row Level Security policies. RLS is enabled on every table, no exceptions.

-- profiles ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

create policy profiles_insert_own
  on public.profiles for insert
  with check (auth.uid() = id);

create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profile_photos --------------------------------------------------------
alter table public.profile_photos enable row level security;

-- Any authenticated user may view any photo row (needed for discovery
-- cards / other users' profiles); mutation is restricted to the owner.
create policy profile_photos_select_any_authenticated
  on public.profile_photos for select
  to authenticated
  using (true);

create policy profile_photos_insert_own
  on public.profile_photos for insert
  with check (auth.uid() = user_id);

create policy profile_photos_update_own
  on public.profile_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy profile_photos_delete_own
  on public.profile_photos for delete
  using (auth.uid() = user_id);

-- profile_videos ----------------------------------------------------------
alter table public.profile_videos enable row level security;

create policy profile_videos_select_any_authenticated
  on public.profile_videos for select
  to authenticated
  using (true);

create policy profile_videos_insert_own
  on public.profile_videos for insert
  with check (auth.uid() = user_id);

create policy profile_videos_update_own
  on public.profile_videos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy profile_videos_delete_own
  on public.profile_videos for delete
  using (auth.uid() = user_id);

-- swipes ------------------------------------------------------------------
alter table public.swipes enable row level security;

create policy swipes_select_own
  on public.swipes for select
  using (auth.uid() = from_user_id);

create policy swipes_insert_own
  on public.swipes for insert
  with check (auth.uid() = from_user_id);

-- Note: updates to swipes happen only via the record_swipe() SECURITY
-- DEFINER function (which bypasses RLS internally), so no direct UPDATE
-- policy is granted to end users.

-- matches -------------------------------------------------------------
alter table public.matches enable row level security;

create policy matches_select_participant
  on public.matches for select
  using (auth.uid() in (user_1_id, user_2_id));

-- matches are created only via record_swipe(); no direct insert policy.
-- Unmatching is exposed narrowly: a participant may update status.
create policy matches_update_participant
  on public.matches for update
  using (auth.uid() in (user_1_id, user_2_id))
  with check (auth.uid() in (user_1_id, user_2_id));

-- conversations -------------------------------------------------------
alter table public.conversations enable row level security;

create policy conversations_select_member
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
        and cm.user_id = auth.uid()
    )
  );

-- conversation_members --------------------------------------------------
alter table public.conversation_members enable row level security;

create policy conversation_members_select_own
  on public.conversation_members for select
  using (auth.uid() = user_id);

-- messages ------------------------------------------------------------
alter table public.messages enable row level security;

create policy messages_select_active_conversation_member
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversation_members cm
      join public.conversations c on c.id = cm.conversation_id
      join public.matches m on m.id = c.match_id
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
        and m.status = 'active'
    )
  );

create policy messages_insert_active_conversation_member
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.conversation_members cm
      join public.conversations c on c.id = cm.conversation_id
      join public.matches m on m.id = c.match_id
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
        and m.status = 'active'
    )
  );

-- blocks ----------------------------------------------------------------
alter table public.blocks enable row level security;

create policy blocks_select_own
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy blocks_insert_own
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

-- reports -----------------------------------------------------------------
alter table public.reports enable row level security;

create policy reports_select_own
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy reports_insert_own
  on public.reports for insert
  with check (auth.uid() = reporter_id);
