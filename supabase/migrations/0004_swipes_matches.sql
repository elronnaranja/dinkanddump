-- Swipes and matches.

create type swipe_action as enum ('dink', 'dump');

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  action swipe_action not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint unique_swipe unique (from_user_id, to_user_id),
  constraint no_self_swipe check (from_user_id <> to_user_id)
);

create index swipes_from_user_id_idx on public.swipes (from_user_id);
create index swipes_to_user_id_idx on public.swipes (to_user_id);

create trigger swipes_set_updated_at
  before update on public.swipes
  for each row
  execute function public.set_updated_at();

create type match_status as enum ('active', 'unmatched', 'blocked');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_1_id uuid not null references public.profiles (id) on delete cascade,
  user_2_id uuid not null references public.profiles (id) on delete cascade,
  matched_at timestamptz not null default now(),
  status match_status not null default 'active',

  constraint canonical_user_order check (user_1_id < user_2_id),
  constraint unique_match unique (user_1_id, user_2_id)
);

create index matches_user_1_id_idx on public.matches (user_1_id);
create index matches_user_2_id_idx on public.matches (user_2_id);
