-- DAI per-user conversation storage
create extension if not exists pgcrypto;

create table if not exists public.dai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'محادثة جديدة',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='dai_conversations_id_user_key'
      and conrelid='public.dai_conversations'::regclass
  ) then
    alter table public.dai_conversations
      add constraint dai_conversations_id_user_key unique (id,user_id);
  end if;
end $$;

create table if not exists public.dai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='dai_messages_conversation_user_fkey'
      and conrelid='public.dai_messages'::regclass
  ) then
    alter table public.dai_messages
      add constraint dai_messages_conversation_user_fkey
      foreign key (conversation_id,user_id)
      references public.dai_conversations(id,user_id)
      on delete cascade;
  end if;
end $$;

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
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own DAI messages" on public.dai_messages;
create policy "Users manage own DAI messages"
on public.dai_messages
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.dai_conversations c
    where c.id = dai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.dai_conversations c
    where c.id = dai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
);

revoke all privileges on table public.dai_conversations from anon;
revoke all privileges on table public.dai_messages from anon;

revoke truncate, references, trigger on table public.dai_conversations from authenticated;
revoke truncate, references, trigger on table public.dai_messages from authenticated;

grant select, insert, update, delete on table public.dai_conversations to authenticated;
grant select, insert, update, delete on table public.dai_messages to authenticated;

create table if not exists public.dai_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.dai_rate_limits enable row level security;

drop policy if exists "Users manage own DAI rate limit" on public.dai_rate_limits;
create policy "Users manage own DAI rate limit"
on public.dai_rate_limits
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all privileges on table public.dai_rate_limits from anon;
grant select, insert, update on table public.dai_rate_limits to authenticated;

create or replace function public.dai_rate_limit_hit(
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean := false;
begin
  if v_uid is null then
    return false;
  end if;

  if p_limit < 1 or p_limit > 120 or p_window_seconds < 1 or p_window_seconds > 3600 then
    return false;
  end if;

  insert into public.dai_rate_limits(user_id, window_start, request_count)
  values (v_uid, now(), 1)
  on conflict (user_id) do update
  set
    request_count = case
      when public.dai_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.dai_rate_limits.request_count + 1
    end,
    window_start = case
      when public.dai_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.dai_rate_limits.window_start
    end
  returning request_count <= p_limit into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke execute on function public.dai_rate_limit_hit(integer, integer) from public, anon;
grant execute on function public.dai_rate_limit_hit(integer, integer) to authenticated;


-- DAI account plans. Missing row = Standard.
create table if not exists public.dai_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'standard' check (plan in ('standard','professional')),
  source text not null default 'manual' check (source in ('owner','manual','subscription','promo')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.dai_entitlements enable row level security;

drop policy if exists "Users can read own DAI entitlement" on public.dai_entitlements;
create policy "Users can read own DAI entitlement"
on public.dai_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all privileges on table public.dai_entitlements from anon;
revoke insert, update, delete, truncate, references, trigger on table public.dai_entitlements from authenticated;
grant select on table public.dai_entitlements to authenticated;


-- PayPal subscription records. Client can only read its own records; writes happen server-side.
create table if not exists public.dai_paypal_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paypal_subscription_id text not null unique,
  paypal_plan_id text not null,
  billing_period text not null check (billing_period in ('monthly','annual')),
  status text not null default 'APPROVAL_PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dai_paypal_subscriptions_user_idx
  on public.dai_paypal_subscriptions(user_id, updated_at desc);

alter table public.dai_paypal_subscriptions enable row level security;

drop policy if exists "Users can read own PayPal subscriptions" on public.dai_paypal_subscriptions;
create policy "Users can read own PayPal subscriptions"
on public.dai_paypal_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all privileges on table public.dai_paypal_subscriptions from anon;
revoke insert, update, delete, truncate, references, trigger on table public.dai_paypal_subscriptions from authenticated;
grant select on table public.dai_paypal_subscriptions to authenticated;


-- Private PayPal configuration. No client role may read or mutate it.
create table if not exists public.dai_payment_config (
  provider text primary key,
  mode text not null,
  product_id text not null,
  monthly_plan_id text not null,
  annual_plan_id text not null,
  webhook_id text not null,
  currency_code text not null default 'USD',
  monthly_value text not null,
  annual_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.dai_payment_config enable row level security;
revoke all privileges on table public.dai_payment_config from anon, authenticated;


-- Optional Professional memory controlled by the user.
create table if not exists public.dai_pro_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  content text not null default '',
  updated_at timestamptz not null default now(),
  constraint dai_pro_memory_content_len check (char_length(content) <= 4000)
);

alter table public.dai_pro_memory enable row level security;

drop policy if exists "Professional users can read own memory" on public.dai_pro_memory;
drop policy if exists "Professional users can insert own memory" on public.dai_pro_memory;
drop policy if exists "Professional users can update own memory" on public.dai_pro_memory;
drop policy if exists "Professional users can delete own memory" on public.dai_pro_memory;

create policy "Professional users can read own memory"
on public.dai_pro_memory
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.dai_entitlements e
    where e.user_id = (select auth.uid())
      and e.plan = 'professional'
      and (e.expires_at is null or e.expires_at > now())
  )
);

create policy "Professional users can insert own memory"
on public.dai_pro_memory
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.dai_entitlements e
    where e.user_id = (select auth.uid())
      and e.plan = 'professional'
      and (e.expires_at is null or e.expires_at > now())
  )
);

create policy "Professional users can update own memory"
on public.dai_pro_memory
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.dai_entitlements e
    where e.user_id = (select auth.uid())
      and e.plan = 'professional'
      and (e.expires_at is null or e.expires_at > now())
  )
);

create policy "Professional users can delete own memory"
on public.dai_pro_memory
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select,insert,update,delete on public.dai_pro_memory to authenticated;
revoke all privileges on public.dai_pro_memory from anon;
