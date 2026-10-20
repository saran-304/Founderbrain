-- Saved founders (bookmarks) table
-- Allows users to save founders they want to connect with later

create table if not exists public.saved_founders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  founder_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, founder_id),
  check (user_id <> founder_id)
);

-- Foreign key to profiles for easy joins
alter table public.saved_founders
  add constraint saved_founders_founder_id_fkey
    foreign key (founder_id) references public.profiles(id) on delete cascade;

-- Indexes for efficient queries
create index if not exists saved_founders_user_idx
  on public.saved_founders(user_id, created_at desc);

create index if not exists saved_founders_founder_idx
  on public.saved_founders(founder_id);

-- Enable RLS
alter table public.saved_founders enable row level security;

-- Users can only read their own saved founders
drop policy if exists "Users read their own saved founders" on public.saved_founders;
create policy "Users read their own saved founders"
  on public.saved_founders for select to authenticated
  using (user_id = auth.uid());

-- Users can only add their own saved founders
drop policy if exists "Users add their own saved founders" on public.saved_founders;
create policy "Users add their own saved founders"
  on public.saved_founders for insert to authenticated
  with check (user_id = auth.uid());

-- Users can only delete their own saved founders
drop policy if exists "Users delete their own saved founders" on public.saved_founders;
create policy "Users delete their own saved founders"
  on public.saved_founders for delete to authenticated
  using (user_id = auth.uid());

-- Grant permissions
revoke all on table public.saved_founders from anon;
grant select, insert, delete on public.saved_founders to authenticated;
