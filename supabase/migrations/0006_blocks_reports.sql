-- Blocks and reports.

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint unique_block unique (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index blocks_blocker_id_idx on public.blocks (blocker_id);
create index blocks_blocked_id_idx on public.blocks (blocked_id);

create type report_target_type as enum ('profile', 'photo', 'video', 'message');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

create index reports_reporter_id_idx on public.reports (reporter_id);
