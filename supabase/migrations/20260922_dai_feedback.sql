create table if not exists public.dai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('voice','reply','animation','interface','other')),
  message text not null check (char_length(message) between 3 and 2000),
  app_version text not null default '',
  user_agent text not null default '',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.dai_feedback enable row level security;

drop policy if exists "Users can insert own feedback" on public.dai_feedback;
create policy "Users can insert own feedback"
on public.dai_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own feedback" on public.dai_feedback;
create policy "Users can read own feedback"
on public.dai_feedback
for select
to authenticated
using ((select auth.uid()) = user_id);

grant insert, select on public.dai_feedback to authenticated;
