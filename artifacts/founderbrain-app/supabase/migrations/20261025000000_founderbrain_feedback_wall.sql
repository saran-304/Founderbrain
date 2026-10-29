-- Feedback Wall table for public feedback and feature requests
-- Allows authenticated users to submit feedback and everyone to view published feedback

create table if not exists public.feedback_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  category text not null check (category in ('idea', 'bug_report', 'feature_request', 'general_feedback')),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index if not exists feedback_posts_status_idx
  on public.feedback_posts(status, created_at desc);

create index if not exists feedback_posts_author_idx
  on public.feedback_posts(author_id, created_at desc);

create index if not exists feedback_posts_category_idx
  on public.feedback_posts(category, created_at desc);

-- Enable RLS
alter table public.feedback_posts enable row level security;

-- Everyone can read published feedback
drop policy if exists "Public read published feedback" on public.feedback_posts;
create policy "Public read published feedback"
  on public.feedback_posts for select
  using (status = 'published');

-- Authenticated users can read their own feedback regardless of status
drop policy if exists "Users read own feedback" on public.feedback_posts;
create policy "Users read own feedback"
  on public.feedback_posts for select to authenticated
  using (author_id = auth.uid());

-- Authenticated users can insert their own feedback
drop policy if exists "Users insert own feedback" on public.feedback_posts;
create policy "Users insert own feedback"
  on public.feedback_posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending');

-- Only users can update their own feedback (status changes only, for moderation)
drop policy if exists "Users update own feedback" on public.feedback_posts;
create policy "Users update own feedback"
  on public.feedback_posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Users can delete their own feedback
drop policy if exists "Users delete own feedback" on public.feedback_posts;
create policy "Users delete own feedback"
  on public.feedback_posts for delete to authenticated
  using (author_id = auth.uid());

-- Grant permissions
revoke all on table public.feedback_posts from anon;
grant select on table public.feedback_posts to anon;
grant select, insert, update, delete on table public.feedback_posts to authenticated;

-- Function to get author display name for feedback
create or replace function public.get_feedback_author_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(display_name, 'Anonymous')
  from public.profiles
  where id = p_user_id;
$$;

-- Comment on table
comment on table public.feedback_posts is 'Public feedback wall for feature requests, bug reports, and general feedback';
