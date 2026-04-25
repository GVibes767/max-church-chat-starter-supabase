-- GVBS Media Hub v2 required tables

create table if not exists message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  user_id text not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table message_reactions enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "message_reactions_read_all" on message_reactions;
create policy "message_reactions_read_all" on message_reactions for select using (true);

drop policy if exists "message_reactions_insert_all" on message_reactions;
create policy "message_reactions_insert_all" on message_reactions for insert with check (true);

drop policy if exists "message_reactions_update_all" on message_reactions;
create policy "message_reactions_update_all" on message_reactions for update using (true) with check (true);

drop policy if exists "message_reactions_delete_all" on message_reactions;
create policy "message_reactions_delete_all" on message_reactions for delete using (true);

drop policy if exists "push_subscriptions_read_all" on push_subscriptions;
create policy "push_subscriptions_read_all" on push_subscriptions for select using (true);

drop policy if exists "push_subscriptions_insert_all" on push_subscriptions;
create policy "push_subscriptions_insert_all" on push_subscriptions for insert with check (true);

drop policy if exists "push_subscriptions_update_all" on push_subscriptions;
create policy "push_subscriptions_update_all" on push_subscriptions for update using (true) with check (true);

drop policy if exists "push_subscriptions_delete_all" on push_subscriptions;
create policy "push_subscriptions_delete_all" on push_subscriptions for delete using (true);
