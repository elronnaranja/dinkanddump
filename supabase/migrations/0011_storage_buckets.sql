-- Storage buckets for profile photos and gameplay videos.
-- Private by default; access is via signed URLs generated server-side,
-- never public bucket URLs, so raw storage paths alone are not enough
-- to view media.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('videos', 'videos', false, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

-- Owners can manage only their own files. Storage object paths are
-- expected to be prefixed with the owning user's id, e.g.
-- {user_id}/{photo_id}.jpg, so (storage.foldername(name))[1] gives the
-- owning user id.

create policy "Photos are insertable by owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Photos must be viewable by any authenticated user (not just the
-- owner) since discovery shows other players' photos.
create policy "Photos are viewable by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos');

create policy "Photos are updatable by owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Photos are deletable by owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Videos are insertable by owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Gameplay videos must be viewable by any authenticated user for the
-- same reason as photos above.
create policy "Videos are viewable by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'videos');

create policy "Videos are updatable by owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Videos are deletable by owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
