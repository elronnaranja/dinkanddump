-- Enable extensions required by the schema.
create extension if not exists "postgis" with schema public;
create extension if not exists "pgcrypto" with schema public; -- gen_random_uuid()
