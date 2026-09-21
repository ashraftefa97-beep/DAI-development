-- DAI per-user conversation storage
create extension if not exists pgcrypto;

create table if not exists public.dai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'محادثة جديدة',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists dai_conversations_user_updated_idx
  on public.dai_conversations(user_id, updated_at desc);

create index if not exists dai_messages_conversation_created_idx
  on public.dai_messages(conversation_id, created_at asc);

alter table public.dai_conversations enable row level security;
alter table public.dai_messages enable row level security;

drop policy if exists "Users manage own DAI conversations" on public.dai_conversations;
create policy "Users manage own DAI conversations"
on public.dai_conversations
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own DAI messages" on public.dai_messages;
create policy "Users manage own DAI messages"
on public.dai_messages
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
