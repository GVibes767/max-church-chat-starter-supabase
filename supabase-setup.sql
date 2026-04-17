create extension if not exists pgcrypto;

create table if not exists public.media_chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  author_name text not null,
  text text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.media_chat_messages enable row level security;

create policy if not exists "media chat select anon"
on public.media_chat_messages
for select
to anon
using (true);

create policy if not exists "media chat insert anon"
on public.media_chat_messages
for insert
to anon
with check (true);

create policy if not exists "media chat update anon"
on public.media_chat_messages
for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.media_chat_messages;

insert into public.media_chat_messages (author_id, author_name, text)
select 'system', 'Media Bot', 'Добро пожаловать в общий чат медиа-служения.'
where not exists (
  select 1 from public.media_chat_messages where author_id = 'system'
);

insert into storage.buckets (id, name, public)
values ('media-chat', 'media-chat', true)
on conflict (id) do nothing;

create policy if not exists "media chat storage read"
on storage.objects
for select
to public
using (bucket_id = 'media-chat');

create policy if not exists "media chat storage insert anon"
on storage.objects
for insert
to anon
with check (bucket_id = 'media-chat');
