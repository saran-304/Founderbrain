-- Founderbrain core schema for the existing Supabase project.
-- Apply this file once in the Supabase SQL Editor before enabling app data.
-- All user-facing tables are protected by Row Level Security.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'on_hold', 'completed')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_date date,
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_project_workspace_fk
    foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id)
    on delete restrict
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text,
  target_value numeric check (target_value is null or target_value >= 0),
  current_value numeric check (current_value is null or current_value >= 0),
  metric_label text,
  due_date date,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_members_user_idx
  on public.workspace_members(user_id, created_at desc);
create index if not exists projects_workspace_updated_idx
  on public.projects(workspace_id, updated_at desc);
create index if not exists tasks_workspace_updated_idx
  on public.tasks(workspace_id, updated_at desc);
create index if not exists tasks_workspace_due_idx
  on public.tasks(workspace_id, due_date);
create index if not exists goals_workspace_updated_idx
  on public.goals(workspace_id, updated_at desc);

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function private.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
      and member.role in ('owner', 'admin')
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.is_workspace_admin(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;

create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  clean_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  clean_name := btrim(coalesce(p_name, ''));
  if char_length(clean_name) < 1 or char_length(clean_name) > 100 then
    raise exception 'Workspace name must be between 1 and 100 characters'
      using errcode = '22023';
  end if;

  insert into public.workspaces (name, created_by)
  values (clean_name, auth.uid())
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');

  return new_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text) from public, anon;
grant execute on function public.create_workspace(text) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.handle_new_founder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  founder_name text;
begin
  founder_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Founder'
  );

  insert into public.profiles (id, display_name)
  values (new.id, founder_name);

  insert into public.workspaces (name, created_by)
  values ('My Workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

revoke all on function public.handle_new_founder() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created_founderbrain on auth.users;
create trigger on_auth_user_created_founderbrain
  after insert on auth.users
  for each row execute function public.handle_new_founder();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.goals enable row level security;

revoke all on table
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.projects,
  public.tasks,
  public.goals
from anon;

grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.goals to authenticated;

drop policy if exists "Founders read their own profile" on public.profiles;
create policy "Founders read their own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Founders update their own profile" on public.profiles;
create policy "Founders update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Members read their workspaces" on public.workspaces;
create policy "Members read their workspaces"
  on public.workspaces for select to authenticated
  using (private.is_workspace_member(id));

drop policy if exists "Admins update their workspaces" on public.workspaces;
create policy "Admins update their workspaces"
  on public.workspaces for update to authenticated
  using (private.is_workspace_admin(id))
  with check (private.is_workspace_admin(id));

drop policy if exists "Members read workspace membership" on public.workspace_members;
create policy "Members read workspace membership"
  on public.workspace_members for select to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Members read workspace projects" on public.projects;
create policy "Members read workspace projects"
  on public.projects for select to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Members create workspace projects" on public.projects;
create policy "Members create workspace projects"
  on public.projects for insert to authenticated
  with check (private.is_workspace_member(workspace_id));

drop policy if exists "Admins update workspace projects" on public.projects;
create policy "Admins update workspace projects"
  on public.projects for update to authenticated
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));

drop policy if exists "Admins delete workspace projects" on public.projects;
create policy "Admins delete workspace projects"
  on public.projects for delete to authenticated
  using (private.is_workspace_admin(workspace_id));

drop policy if exists "Members read workspace tasks" on public.tasks;
create policy "Members read workspace tasks"
  on public.tasks for select to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Members create workspace tasks" on public.tasks;
create policy "Members create workspace tasks"
  on public.tasks for insert to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and (
      assignee_id is null
      or exists (
        select 1
        from public.workspace_members as assignee
        where assignee.workspace_id = tasks.workspace_id
          and assignee.user_id = tasks.assignee_id
      )
    )
  );

drop policy if exists "Members update workspace tasks" on public.tasks;
create policy "Members update workspace tasks"
  on public.tasks for update to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (
    private.is_workspace_member(workspace_id)
    and (
      assignee_id is null
      or exists (
        select 1
        from public.workspace_members as assignee
        where assignee.workspace_id = tasks.workspace_id
          and assignee.user_id = tasks.assignee_id
      )
    )
  );

drop policy if exists "Admins delete workspace tasks" on public.tasks;
create policy "Admins delete workspace tasks"
  on public.tasks for delete to authenticated
  using (private.is_workspace_admin(workspace_id));

drop policy if exists "Members read workspace goals" on public.goals;
create policy "Members read workspace goals"
  on public.goals for select to authenticated
  using (private.is_workspace_member(workspace_id));

drop policy if exists "Members create workspace goals" on public.goals;
create policy "Members create workspace goals"
  on public.goals for insert to authenticated
  with check (private.is_workspace_member(workspace_id));

drop policy if exists "Members update workspace goals" on public.goals;
create policy "Members update workspace goals"
  on public.goals for update to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

drop policy if exists "Admins delete workspace goals" on public.goals;
create policy "Admins delete workspace goals"
  on public.goals for delete to authenticated
  using (private.is_workspace_admin(workspace_id));
