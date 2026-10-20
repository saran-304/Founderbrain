-- Private messaging table for founder connections
-- Messages are only visible to participants in an accepted connection
create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 50000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

-- Foreign key relationships to profiles for display names
alter table public.private_messages
  add constraint private_messages_sender_id_fkey
    foreign key (sender_id) references public.profiles(id) on delete cascade,
  add constraint private_messages_recipient_id_fkey
    foreign key (recipient_id) references public.profiles(id) on delete cascade;

-- Indexes for efficient queries
create index if not exists private_messages_conversation_idx
  on public.private_messages(sender_id, recipient_id, created_at desc);
create index if not exists private_messages_recipient_unread_idx
  on public.private_messages(recipient_id, read_at, created_at desc);

-- Enable RLS
alter table public.private_messages enable row level security;

-- Users can only read messages they sent or received
drop policy if exists "Users read their own messages" on public.private_messages;
create policy "Users read their own messages"
  on public.private_messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Users can only insert messages they send
drop policy if exists "Users insert their own messages" on public.private_messages;
create policy "Users insert their own messages"
  on public.private_messages for insert to authenticated
  with check (sender_id = auth.uid());

-- Users can only mark their own received messages as read
drop policy if exists "Users mark their received messages as read" on public.private_messages;
create policy "Users mark their received messages as read"
  on public.private_messages for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Users can delete their own sent messages
drop policy if exists "Users delete their own messages" on public.private_messages;
create policy "Users delete their own messages"
  on public.private_messages for delete to authenticated
  using (sender_id = auth.uid());

-- Grant permissions
revoke all on table public.private_messages from anon;
grant select, insert, update, delete on public.private_messages to authenticated;
