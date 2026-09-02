-- Board: personal dashboard app
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- profiles
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- vision_items  (Vision tab: freeform canvas)
-- ============================================================================
create table if not exists public.vision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('image', 'text', 'note')),
  content text, -- title/body for text+note; caption for image (optional)
  image_path text, -- storage object path, for type='image'
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision not null default 240,
  height double precision not null default 200,
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vision_items enable row level security;

create policy "vision_items_select_own" on public.vision_items
  for select using (auth.uid() = user_id);
create policy "vision_items_insert_own" on public.vision_items
  for insert with check (auth.uid() = user_id);
create policy "vision_items_update_own" on public.vision_items
  for update using (auth.uid() = user_id);
create policy "vision_items_delete_own" on public.vision_items
  for delete using (auth.uid() = user_id);

create index if not exists vision_items_user_id_idx on public.vision_items (user_id);

-- ============================================================================
-- goals  (Goals tab)
-- ============================================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  target_date date,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals
  for delete using (auth.uid() = user_id);

create index if not exists goals_user_id_idx on public.goals (user_id);

-- ============================================================================
-- tasks  (Board tab: Kanban, also feeds Calendar)
-- ============================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  type text not null default 'personal' check (type in ('personal', 'business')),
  "column" text not null default 'backlog' check ("column" in ('backlog', 'this_week', 'doing', 'waiting', 'done')),
  sort_order double precision not null default 0,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_column_idx on public.tasks ("column");

-- ============================================================================
-- events  (Board tab: Calendar, manual events not backed by a task)
-- ============================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  type text not null default 'personal' check (type in ('personal', 'business')),
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events_select_own" on public.events
  for select using (auth.uid() = user_id);
create policy "events_insert_own" on public.events
  for insert with check (auth.uid() = user_id);
create policy "events_update_own" on public.events
  for update using (auth.uid() = user_id);
create policy "events_delete_own" on public.events
  for delete using (auth.uid() = user_id);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_start_at_idx on public.events (start_at);

-- ============================================================================
-- updated_at helper trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.vision_items;
create trigger set_updated_at before update on public.vision_items
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.goals;
create trigger set_updated_at before update on public.goals
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.events;
create trigger set_updated_at before update on public.events
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- Storage: vision-images bucket
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('vision-images', 'vision-images', true)
on conflict (id) do nothing;

-- Users may only manage files inside a folder named after their own user id,
-- e.g. vision-images/<user_id>/<filename>. Reads are public (bucket is public)
-- so uploaded images can be rendered directly via their public URL.
create policy "vision_images_select_public" on storage.objects
  for select using (bucket_id = 'vision-images');

create policy "vision_images_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'vision-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vision_images_update_own" on storage.objects
  for update using (
    bucket_id = 'vision-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vision_images_delete_own" on storage.objects
  for delete using (
    bucket_id = 'vision-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
