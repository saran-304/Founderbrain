-- Founderbrain growth modules. Apply after 20261016000000_founderbrain_core.sql.
-- This is for the app's existing Supabase project; it does not use a service role.

alter table public.profiles
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists location text,
  add column if not exists company text,
  add column if not exists stage text,
  add column if not exists website_url text,
  add column if not exists is_discoverable boolean not null default false,
  add column if not exists portfolio_is_public boolean not null default false;

alter table public.workspaces
  add column if not exists fundraising_stage text not null default 'idea'
    check (fundraising_stage in ('idea', 'bootstrapped', 'pre_seed', 'seed', 'series_a', 'series_b_plus', 'other'));

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text,
  role text not null check (role in ('admin', 'member')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_join_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, requester_id)
);

create table if not exists public.founder_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'celebrate', 'support')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text,
  category text,
  external_url text,
  issued_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentorship_questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  tags text[] not null default '{}',
  accepted_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentorship_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.mentorship_questions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table if not exists public.assistant_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('idea_validation', 'business_plan', 'product_roadmap', 'pitch_prep')),
  prompt text not null check (char_length(btrim(prompt)) between 20 and 8000),
  output text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  organization text,
  website_url text,
  pipeline_stage text not null default 'researching'
    check (pipeline_stage in ('researching', 'contacted', 'meeting', 'due_diligence', 'committed', 'passed')),
  source_type text not null default 'user_entered' check (source_type = 'user_entered'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investor_notes (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.investor_follow_ups (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.investors(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  due_date date,
  status text not null default 'open' check (status in ('open', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  community_notifications boolean not null default true,
  connection_notifications boolean not null default true,
  mentorship_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('workspace_invite', 'workspace_join_request', 'workspace_join_update', 'connection_request', 'connection_update', 'community_comment', 'mentorship_request', 'mentorship_answer')),
  title text not null,
  body text,
  resource_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_discoverable_idx
  on public.profiles(is_discoverable, updated_at desc);
create index if not exists founder_connections_recipient_idx
  on public.founder_connections(recipient_id, created_at desc);
create index if not exists community_posts_created_idx
  on public.community_posts(created_at desc);
create index if not exists community_comments_post_idx
  on public.community_comments(post_id, created_at);
create index if not exists community_reactions_post_idx
  on public.community_reactions(post_id);
create index if not exists achievements_user_idx
  on public.achievements(user_id, issued_on desc, created_at desc);
create index if not exists mentorship_questions_created_idx
  on public.mentorship_questions(created_at desc);
create index if not exists mentorship_answers_question_idx
  on public.mentorship_answers(question_id, created_at);
create index if not exists mentorship_requests_recipient_idx
  on public.mentorship_requests(recipient_id, created_at desc);
create index if not exists assistant_runs_workspace_idx
  on public.assistant_runs(workspace_id, created_at desc);
create index if not exists investors_workspace_idx
  on public.investors(workspace_id, updated_at desc);
create index if not exists investor_notes_investor_idx
  on public.investor_notes(investor_id, created_at desc);
create index if not exists investor_follow_ups_due_idx
  on public.investor_follow_ups(investor_id, due_date);
create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

create or replace function private.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = target_profile_id
    or exists (
      select 1 from public.profiles profile
      where profile.id = target_profile_id
        and (profile.is_discoverable or profile.portfolio_is_public)
    )
    or exists (
      select 1
      from public.workspace_members as viewer
      join public.workspace_members as target
        on target.workspace_id = viewer.workspace_id
      where viewer.user_id = auth.uid()
        and target.user_id = target_profile_id
    );
$$;

revoke all on function private.can_read_profile(uuid) from public, anon;
grant execute on function private.can_read_profile(uuid) to authenticated;

create or replace function public.accept_workspace_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.workspace_invitations%rowtype;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into invitation
  from public.workspace_invitations
  where token_hash = p_token_hash
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if invitation.email is not null and lower(invitation.email) <> current_email then
    raise exception 'Invitation email does not match the signed-in account' using errcode = '42501';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invitation.workspace_id, auth.uid(), invitation.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations
  set status = 'accepted'
  where id = invitation.id;

  return invitation.workspace_id;
end;
$$;

revoke all on function public.accept_workspace_invitation(text) from public, anon;
grant execute on function public.accept_workspace_invitation(text) to authenticated;

create or replace function public.respond_workspace_join_request(
  p_request_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  join_request public.workspace_join_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid join request response' using errcode = '22023';
  end if;

  select * into join_request
  from public.workspace_join_requests
  where id = p_request_id
  for update;

  if not found or not private.is_workspace_admin(join_request.workspace_id) then
    raise exception 'Workspace join request not found' using errcode = '42501';
  end if;
  if join_request.status <> 'pending' then
    raise exception 'Workspace join request has already been answered' using errcode = '22023';
  end if;

  if p_status = 'accepted' then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (join_request.workspace_id, join_request.requester_id, 'member')
    on conflict (workspace_id, user_id) do nothing;
  end if;

  update public.workspace_join_requests
  set status = p_status
  where id = join_request.id;

  return join_request.id;
end;
$$;

revoke all on function public.respond_workspace_join_request(uuid, text) from public, anon;
grant execute on function public.respond_workspace_join_request(uuid, text) to authenticated;

create or replace function public.accept_mentorship_answer(p_answer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_question_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select question_id into target_question_id
  from public.mentorship_answers
  where id = p_answer_id;

  if target_question_id is null or not exists (
    select 1 from public.mentorship_questions
    where id = target_question_id and author_id = auth.uid()
  ) then
    raise exception 'Only the question author can accept an answer' using errcode = '42501';
  end if;

  update public.mentorship_questions
  set accepted_answer_id = p_answer_id
  where id = target_question_id;

  return p_answer_id;
end;
$$;

revoke all on function public.accept_mentorship_answer(uuid) from public, anon;
grant execute on function public.accept_mentorship_answer(uuid) to authenticated;

create or replace function private.deliver_notification(
  target_user_id uuid,
  notification_kind text,
  notification_title text,
  notification_body text,
  target_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    return;
  end if;

  if notification_kind in ('connection_request', 'connection_update') and exists (
    select 1 from public.user_settings
    where user_id = target_user_id and not connection_notifications
  ) then
    return;
  end if;

  if notification_kind = 'community_comment' and exists (
    select 1 from public.user_settings
    where user_id = target_user_id and not community_notifications
  ) then
    return;
  end if;

  if notification_kind in ('mentorship_request', 'mentorship_answer') and exists (
    select 1 from public.user_settings
    where user_id = target_user_id and not mentorship_notifications
  ) then
    return;
  end if;

  insert into public.notifications (user_id, kind, title, body, resource_path)
  values (target_user_id, notification_kind, notification_title, notification_body, target_path);
end;
$$;

revoke all on function private.deliver_notification(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function private.notify_connection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  select display_name into actor_name
  from public.profiles where id = new.requester_id;

  if tg_op = 'INSERT' then
    perform private.deliver_notification(
      new.recipient_id,
      'connection_request',
      'New founder connection request',
      coalesce(nullif(actor_name, ''), 'A founder') || ' would like to connect.',
      '/founders'
    );
  elsif old.status is distinct from new.status then
    perform private.deliver_notification(
      new.requester_id,
      'connection_update',
      'Connection request updated',
      coalesce(nullif((select display_name from public.profiles where id = new.recipient_id), ''), 'A founder')
        || ' ' || new.status || ' your connection request.',
      '/founders'
    );
  end if;
  return new;
end;
$$;

create or replace function private.notify_community_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author_id uuid;
begin
  select author_id into post_author_id
  from public.community_posts where id = new.post_id;
  if post_author_id is distinct from new.author_id then
    perform private.deliver_notification(
      post_author_id,
      'community_comment',
      'New comment on your post',
      coalesce(nullif(new.author_name, ''), 'A founder') || ' commented on your post.',
      '/community'
    );
  end if;
  return new;
end;
$$;

create or replace function private.notify_workspace_join_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_user record;
begin
  if tg_op = 'INSERT' then
    for admin_user in
      select user_id
      from public.workspace_members
      where workspace_id = new.workspace_id
        and role in ('owner', 'admin')
        and user_id <> new.requester_id
    loop
      perform private.deliver_notification(
        admin_user.user_id,
        'workspace_join_request',
        'New workspace join request',
        new.requester_name || ' asked to join your workspace.',
        '/teams'
      );
    end loop;
  elsif old.status is distinct from new.status then
    perform private.deliver_notification(
      new.requester_id,
      'workspace_join_update',
      'Workspace join request updated',
      'Your request was ' || new.status || '.',
      '/teams'
    );
  end if;
  return new;
end;
$$;

create or replace function private.notify_mentorship_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  body_text text;
  title_text text;
begin
  if tg_table_name = 'mentorship_requests' then
    target_user_id := new.recipient_id;
    body_text := coalesce(nullif(new.sender_name, ''), 'A founder') || ' sent you a mentorship request.';
    title_text := 'New mentorship request';
    perform private.deliver_notification(target_user_id, 'mentorship_request', title_text, body_text, '/mentorship');
  elsif tg_table_name = 'mentorship_answers' then
    select author_id into target_user_id
    from public.mentorship_questions where id = new.question_id;
    if target_user_id is distinct from new.author_id then
      body_text := coalesce(nullif(new.author_name, ''), 'A founder') || ' answered your question.';
      title_text := 'New mentorship answer';
      perform private.deliver_notification(target_user_id, 'mentorship_answer', title_text, body_text, '/mentorship');
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.create_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.notify_connection_change() from public, anon, authenticated;
revoke all on function private.notify_community_comment() from public, anon, authenticated;
revoke all on function private.notify_workspace_join_change() from public, anon, authenticated;
revoke all on function private.notify_mentorship_activity() from public, anon, authenticated;
revoke all on function private.create_user_settings() from public, anon, authenticated;

drop trigger if exists set_connections_updated_at on public.founder_connections;
create trigger set_connections_updated_at before update on public.founder_connections
  for each row execute function public.set_updated_at();
drop trigger if exists set_community_posts_updated_at on public.community_posts;
create trigger set_community_posts_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();
drop trigger if exists set_community_comments_updated_at on public.community_comments;
create trigger set_community_comments_updated_at before update on public.community_comments
  for each row execute function public.set_updated_at();
drop trigger if exists set_achievements_updated_at on public.achievements;
create trigger set_achievements_updated_at before update on public.achievements
  for each row execute function public.set_updated_at();
drop trigger if exists set_mentorship_questions_updated_at on public.mentorship_questions;
create trigger set_mentorship_questions_updated_at before update on public.mentorship_questions
  for each row execute function public.set_updated_at();
drop trigger if exists set_mentorship_answers_updated_at on public.mentorship_answers;
create trigger set_mentorship_answers_updated_at before update on public.mentorship_answers
  for each row execute function public.set_updated_at();
drop trigger if exists set_mentorship_requests_updated_at on public.mentorship_requests;
create trigger set_mentorship_requests_updated_at before update on public.mentorship_requests
  for each row execute function public.set_updated_at();
drop trigger if exists set_investors_updated_at on public.investors;
create trigger set_investors_updated_at before update on public.investors
  for each row execute function public.set_updated_at();
drop trigger if exists set_investor_follow_ups_updated_at on public.investor_follow_ups;
create trigger set_investor_follow_ups_updated_at before update on public.investor_follow_ups
  for each row execute function public.set_updated_at();
drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists notify_connection_change on public.founder_connections;
create trigger notify_connection_change after insert or update on public.founder_connections
  for each row execute function private.notify_connection_change();
drop trigger if exists notify_community_comment on public.community_comments;
create trigger notify_community_comment after insert on public.community_comments
  for each row execute function private.notify_community_comment();
drop trigger if exists notify_workspace_join_change on public.workspace_join_requests;
create trigger notify_workspace_join_change after insert or update on public.workspace_join_requests
  for each row execute function private.notify_workspace_join_change();
drop trigger if exists notify_mentorship_request on public.mentorship_requests;
create trigger notify_mentorship_request after insert on public.mentorship_requests
  for each row execute function private.notify_mentorship_activity();
drop trigger if exists notify_mentorship_answer on public.mentorship_answers;
create trigger notify_mentorship_answer after insert on public.mentorship_answers
  for each row execute function private.notify_mentorship_activity();
drop trigger if exists create_user_settings_after_auth_user on auth.users;
create trigger create_user_settings_after_auth_user after insert on auth.users
  for each row execute function private.create_user_settings();

alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_join_requests enable row level security;
alter table public.founder_connections enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.achievements enable row level security;
alter table public.mentorship_questions enable row level security;
alter table public.mentorship_answers enable row level security;
alter table public.mentorship_requests enable row level security;
alter table public.assistant_runs enable row level security;
alter table public.investors enable row level security;
alter table public.investor_notes enable row level security;
alter table public.investor_follow_ups enable row level security;
alter table public.user_settings enable row level security;
alter table public.notifications enable row level security;

revoke all on table
  public.workspace_invitations,
  public.workspace_join_requests,
  public.founder_connections,
  public.community_posts,
  public.community_comments,
  public.community_reactions,
  public.achievements,
  public.mentorship_questions,
  public.mentorship_answers,
  public.mentorship_requests,
  public.assistant_runs,
  public.investors,
  public.investor_notes,
  public.investor_follow_ups,
  public.user_settings,
  public.notifications
from anon;

grant select, update, delete on public.workspace_members to authenticated;
grant select, insert on public.workspace_invitations to authenticated;
grant select, insert on public.workspace_join_requests to authenticated;
grant select, insert, update, delete on public.founder_connections to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_comments to authenticated;
grant select, insert, update, delete on public.community_reactions to authenticated;
grant select, insert, update, delete on public.achievements to authenticated;
grant select, insert, update, delete on public.mentorship_questions to authenticated;
grant select, insert, update, delete on public.mentorship_answers to authenticated;
grant select, insert, update on public.mentorship_requests to authenticated;
grant select, insert, delete on public.assistant_runs to authenticated;
grant select, insert, update, delete on public.investors to authenticated;
grant select, insert, update, delete on public.investor_notes to authenticated;
grant select, insert, update, delete on public.investor_follow_ups to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, update on public.notifications to authenticated;

drop policy if exists "Founders read their own profile" on public.profiles;
drop policy if exists "Founders read visible profiles" on public.profiles;
create policy "Founders read visible profiles"
  on public.profiles for select to authenticated
  using (private.can_read_profile(id));

drop policy if exists "Admins update workspace members" on public.workspace_members;
create policy "Admins update workspace members"
  on public.workspace_members for update to authenticated
  using (private.is_workspace_admin(workspace_id) and role <> 'owner')
  with check (private.is_workspace_admin(workspace_id) and role in ('admin', 'member'));
drop policy if exists "Admins remove workspace members" on public.workspace_members;
create policy "Admins remove workspace members"
  on public.workspace_members for delete to authenticated
  using (private.is_workspace_admin(workspace_id) and role <> 'owner');

create policy "Workspace admins manage invitations"
  on public.workspace_invitations for select to authenticated
  using (private.is_workspace_admin(workspace_id));
create policy "Workspace admins create invitations"
  on public.workspace_invitations for insert to authenticated
  with check (
    private.is_workspace_admin(workspace_id)
    and created_by = auth.uid()
    and role in ('admin', 'member')
  );

create policy "Requesters and workspace admins read join requests"
  on public.workspace_join_requests for select to authenticated
  using (requester_id = auth.uid() or private.is_workspace_admin(workspace_id));
create policy "Nonmembers request workspace access"
  on public.workspace_join_requests for insert to authenticated
  with check (
    requester_id = auth.uid()
    and not private.is_workspace_member(workspace_id)
  );

create policy "Founders read their connections"
  on public.founder_connections for select to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());
create policy "Founders request connections"
  on public.founder_connections for insert to authenticated
  with check (
    requester_id = auth.uid()
    and exists (select 1 from public.profiles where id = recipient_id and is_discoverable)
  );
create policy "Recipients respond to connections"
  on public.founder_connections for update to authenticated
  using (recipient_id = auth.uid() and status = 'pending')
  with check (recipient_id = auth.uid() and status in ('accepted', 'declined'));
create policy "Participants remove connections"
  on public.founder_connections for delete to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "Authenticated founders read community posts"
  on public.community_posts for select to authenticated using (true);
create policy "Founders publish their own community posts"
  on public.community_posts for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors edit their own community posts"
  on public.community_posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their own community posts"
  on public.community_posts for delete to authenticated using (author_id = auth.uid());

create policy "Authenticated founders read community comments"
  on public.community_comments for select to authenticated using (true);
create policy "Founders comment as themselves"
  on public.community_comments for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors edit their own comments"
  on public.community_comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their own comments"
  on public.community_comments for delete to authenticated using (author_id = auth.uid());

create policy "Authenticated founders read reactions"
  on public.community_reactions for select to authenticated using (true);
create policy "Founders react as themselves"
  on public.community_reactions for insert to authenticated
  with check (user_id = auth.uid());
create policy "Founders update their own reactions"
  on public.community_reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Founders remove their own reactions"
  on public.community_reactions for delete to authenticated using (user_id = auth.uid());

create policy "Founders read visible achievements"
  on public.achievements for select to authenticated
  using (private.can_read_profile(user_id) and (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles profile
      where profile.id = user_id and profile.portfolio_is_public
    )
  ));
create policy "Founders create their own achievements"
  on public.achievements for insert to authenticated
  with check (user_id = auth.uid());
create policy "Founders update their own achievements"
  on public.achievements for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Founders delete their own achievements"
  on public.achievements for delete to authenticated using (user_id = auth.uid());

create policy "Authenticated founders read mentorship questions"
  on public.mentorship_questions for select to authenticated using (true);
create policy "Founders ask questions as themselves"
  on public.mentorship_questions for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors update their questions"
  on public.mentorship_questions for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their questions"
  on public.mentorship_questions for delete to authenticated using (author_id = auth.uid());

create policy "Authenticated founders read mentorship answers"
  on public.mentorship_answers for select to authenticated using (true);
create policy "Founders answer as themselves"
  on public.mentorship_answers for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors update their answers"
  on public.mentorship_answers for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete their answers"
  on public.mentorship_answers for delete to authenticated using (author_id = auth.uid());

create policy "Participants read mentorship requests"
  on public.mentorship_requests for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "Founders send mentorship requests"
  on public.mentorship_requests for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.profiles where id = recipient_id and is_discoverable)
  );
create policy "Recipients respond to mentorship requests"
  on public.mentorship_requests for update to authenticated
  using (recipient_id = auth.uid() and status = 'pending')
  with check (recipient_id = auth.uid() and status in ('accepted', 'declined'));

create policy "Workspace members read assistant runs"
  on public.assistant_runs for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy "Workspace members save their assistant runs"
  on public.assistant_runs for insert to authenticated
  with check (private.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "Authors delete their assistant runs"
  on public.assistant_runs for delete to authenticated
  using (private.is_workspace_member(workspace_id) and created_by = auth.uid());

create policy "Workspace admins read investors"
  on public.investors for select to authenticated
  using (private.is_workspace_admin(workspace_id));
create policy "Workspace admins create investors"
  on public.investors for insert to authenticated
  with check (private.is_workspace_admin(workspace_id));
create policy "Workspace admins update investors"
  on public.investors for update to authenticated
  using (private.is_workspace_admin(workspace_id))
  with check (private.is_workspace_admin(workspace_id));
create policy "Workspace admins delete investors"
  on public.investors for delete to authenticated
  using (private.is_workspace_admin(workspace_id));

create policy "Workspace admins read investor notes"
  on public.investor_notes for select to authenticated
  using (exists (
    select 1 from public.investors investor
    where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
  ));
create policy "Workspace admins add investor notes"
  on public.investor_notes for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.investors investor
      where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
    )
  );
create policy "Authors edit investor notes"
  on public.investor_notes for update to authenticated
  using (
    author_id = auth.uid()
    and exists (
      select 1 from public.investors investor
      where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
    )
  )
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.investors investor
      where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
    )
  );
create policy "Authors delete investor notes"
  on public.investor_notes for delete to authenticated
  using (
    author_id = auth.uid()
    and exists (
      select 1 from public.investors investor
      where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
    )
  );

create policy "Workspace admins read investor follow-ups"
  on public.investor_follow_ups for select to authenticated
  using (exists (
    select 1 from public.investors investor
    where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
  ));
create policy "Workspace admins add investor follow-ups"
  on public.investor_follow_ups for insert to authenticated
  with check (exists (
    select 1 from public.investors investor
    where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
  ));
create policy "Workspace admins update investor follow-ups"
  on public.investor_follow_ups for update to authenticated
  using (exists (
    select 1 from public.investors investor
    where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
  ))
  with check (exists (
    select 1 from public.investors investor
    where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
  ));
create policy "Workspace admins delete investor follow-ups"
  on public.investor_follow_ups for delete to authenticated
  using (exists (
    select 1 from public.investors investor
    where investor.id = investor_id and private.is_workspace_admin(investor.workspace_id)
  ));

create policy "Founders read their own settings"
  on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy "Founders create their own settings"
  on public.user_settings for insert to authenticated with check (user_id = auth.uid());
create policy "Founders update their own settings"
  on public.user_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Founders read their own notifications"
  on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Founders update their own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
