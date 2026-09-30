-- Prepared schema only; has NOT been applied to any database.
-- Each signed-in teacher owns a single JSON document containing their workspaces.
begin;
-- Admin provisions exactly two slots. Clients cannot add themselves or change slots.
create table if not exists public.allowed_teachers (
  slot smallint primary key check (slot in (1, 2)),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  active boolean not null default true
);
alter table public.allowed_teachers enable row level security;
revoke all on public.allowed_teachers from anon, authenticated;
grant select on public.allowed_teachers to authenticated;
create policy "read own membership" on public.allowed_teachers
  for select to authenticated using ((select auth.uid()) = user_id);
create table if not exists public.teacher_books (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  book jsonb not null check (jsonb_typeof(book) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.teacher_books enable row level security;
revoke all on public.teacher_books from anon;
grant select, insert, update, delete on public.teacher_books to authenticated;
create policy "read own book" on public.teacher_books
  for select to authenticated using ((select auth.uid()) = owner_id
    and exists (select 1 from public.allowed_teachers where user_id = (select auth.uid()) and active));
create policy "create own book" on public.teacher_books
  for insert to authenticated with check ((select auth.uid()) = owner_id
    and exists (select 1 from public.allowed_teachers where user_id = (select auth.uid()) and active));
create policy "update own book" on public.teacher_books
  for update to authenticated using ((select auth.uid()) = owner_id
    and exists (select 1 from public.allowed_teachers where user_id = (select auth.uid()) and active))
  with check ((select auth.uid()) = owner_id
    and exists (select 1 from public.allowed_teachers where user_id = (select auth.uid()) and active));
create policy "delete own book" on public.teacher_books
  for delete to authenticated using ((select auth.uid()) = owner_id
    and exists (select 1 from public.allowed_teachers where user_id = (select auth.uid()) and active));
create function public.bump_teacher_book_revision() returns trigger
language plpgsql set search_path = public as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
create trigger teacher_book_revision before update on public.teacher_books
for each row execute function public.bump_teacher_book_revision();
commit;
-- Client update must filter by both owner_id and its last known revision.
-- Zero updated rows means conflict: do not overwrite; fetch latest and ask which to keep.
-- Before production: test with two real users and an anonymous client.
-- In Auth settings disable public signups; invite the two users via dashboard.
-- An administrator then inserts their Auth user UUIDs into slots 1 and 2.
-- Never expose service-role/secret keys in the frontend.
