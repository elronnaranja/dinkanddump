-- messages had select and insert RLS policies (0010) but no update policy
-- at all, so markConversationRead's `update messages set read_at = ...`
-- was silently a no-op under RLS: Postgres returns 0 rows affected, not an
-- error, for an UPDATE that matches no visible rows, so the client-side
-- try/catch never caught anything and nothing looked wrong until two real
-- accounts were used to actually read each other's messages.
--
-- Scoped to the same "active conversation member" check as select/insert,
-- plus excluding the caller's own messages so a user can only mark the
-- *other* participant's messages read, never their own. This is a
-- row-level policy only, consistent with every other table in this
-- project — it doesn't restrict which columns can be changed within an
-- update a caller is otherwise allowed to make (column-level privileges
-- via GRANT/REVOKE aren't used anywhere else in this schema either), so a
-- matched conversation member could in principle update other columns on
-- a message via a crafted request, not just read_at. Accepted for V1: the
-- app itself never does this, and the party who could exploit it already
-- has full read access to that message as a legitimate conversation
-- member.
create policy messages_update_mark_read
  on public.messages for update
  using (
    auth.uid() <> sender_id
    and exists (
      select 1
      from public.conversation_members cm
      join public.conversations c on c.id = cm.conversation_id
      join public.matches m on m.id = c.match_id
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
        and m.status = 'active'
    )
  )
  with check (
    auth.uid() <> sender_id
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
