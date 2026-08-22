-- Core profiles table.

create type gender as enum ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say');
create type skill_level as enum ('1.0','1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5+');
create type game_preference as enum ('singles', 'doubles', 'both');
create type play_preference as enum ('competitive', 'social', 'both');
create type dominant_hand as enum ('right', 'left', 'ambidextrous');
create type playing_frequency as enum ('rarely', 'weekly', 'few_times_week', 'daily');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  first_name text not null,
  date_of_birth date not null,
  gender gender,
  bio text,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  -- Maintained by trigger below from latitude/longitude. See comment there
  -- for why we use a trigger instead of a generated column.
  location geography(Point, 4326),
  skill_level skill_level not null,
  dupr_rating numeric(3, 2),
  game_preference game_preference not null default 'both',
  play_preference play_preference not null default 'both',
  dominant_hand dominant_hand not null default 'right',
  playing_frequency playing_frequency not null default 'weekly',
  years_playing smallint not null default 0,
  favorite_shot text,
  play_style text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_length check (char_length(username) between 3 and 30),
  constraint years_playing_range check (years_playing >= 0 and years_playing <= 100),
  constraint latitude_range check (latitude is null or latitude between -90 and 90),
  constraint longitude_range check (longitude is null or longitude between -180 and 180)
);

comment on column public.profiles.location is
  'Maintained by trigger profiles_set_location from latitude/longitude. '
  'A trigger is used instead of a generated column because generated '
  'columns cannot reliably invoke ST_MakePoint/geography casts across all '
  'supported Postgres/PostGIS versions, and a trigger keeps the write path '
  'explicit and testable.';

-- Maintain `location` from latitude/longitude on insert/update.
create or replace function public.profiles_set_location()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := geography(st_setsrid(st_makepoint(new.longitude, new.latitude), 4326));
  else
    new.location := null;
  end if;
  return new;
end;
$$;

create trigger profiles_set_location_trigger
  before insert or update of latitude, longitude on public.profiles
  for each row
  execute function public.profiles_set_location();

-- Maintain updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create index profiles_location_gist_idx on public.profiles using gist (location);
