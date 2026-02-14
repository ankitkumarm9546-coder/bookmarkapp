-- Smart Bookmark App schema

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.bookmarks enable row level security;

-- Users can view only their own bookmarks.
create policy "Users can read own bookmarks"
on public.bookmarks
for select
using (auth.uid() = user_id);

-- Users can insert only bookmarks tied to their own uid.
create policy "Users can insert own bookmarks"
on public.bookmarks
for insert
with check (auth.uid() = user_id);

-- Users can delete only their own bookmarks.
create policy "Users can delete own bookmarks"
on public.bookmarks
for delete
using (auth.uid() = user_id);

-- Helper trigger to force user_id from JWT and avoid spoofing.
create or replace function public.set_bookmark_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_bookmark_user_id_trigger on public.bookmarks;
create trigger set_bookmark_user_id_trigger
before insert on public.bookmarks
for each row
execute function public.set_bookmark_user_id();

-- Enable realtime updates for bookmarks table.
alter publication supabase_realtime add table public.bookmarks;
