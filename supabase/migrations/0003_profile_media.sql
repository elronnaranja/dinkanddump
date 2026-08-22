-- Profile photos and videos.

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  "position" smallint not null,
  created_at timestamptz not null default now(),

  constraint position_range check ("position" between 0 and 4),
  constraint unique_user_position unique (user_id, "position")
);

create index profile_photos_user_id_idx on public.profile_photos (user_id);

-- Enforce max 5 photos per user.
create or replace function public.enforce_max_photos()
returns trigger
language plpgsql
as $$
declare
  photo_count integer;
begin
  select count(*) into photo_count
  from public.profile_photos
  where user_id = new.user_id;

  if photo_count >= 5 then
    raise exception 'A profile may have at most 5 photos';
  end if;

  return new;
end;
$$;

create trigger profile_photos_max_5
  before insert on public.profile_photos
  for each row
  execute function public.enforce_max_photos();

create type video_status as enum ('processing', 'active', 'failed');

create table public.profile_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  duration numeric(6, 2),
  status video_status not null default 'processing',
  created_at timestamptz not null default now()
);

create index profile_videos_user_id_idx on public.profile_videos (user_id);

-- Enforce max 1 active video per user.
create or replace function public.enforce_max_active_video()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
begin
  if new.status = 'active' then
    select count(*) into active_count
    from public.profile_videos
    where user_id = new.user_id
      and status = 'active'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if active_count >= 1 then
      raise exception 'A profile may have at most 1 active video';
    end if;
  end if;

  return new;
end;
$$;

create trigger profile_videos_max_1_active
  before insert or update of status on public.profile_videos
  for each row
  execute function public.enforce_max_active_video();
