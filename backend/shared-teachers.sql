-- Shared, no-login edition: anyone with the site URL can read and edit both profiles.
-- Existing private account tables are not modified. Run this once in SQL Editor.
begin;
create table public.shared_teacher_books (
 teacher_id text primary key check (teacher_id in ('weize','hexin')),
 book jsonb not null check (jsonb_typeof(book) = 'object' and octet_length(book::text) <= 5000000),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.shared_teacher_books enable row level security;
revoke all on public.shared_teacher_books from anon, authenticated;
grant select on public.shared_teacher_books to anon, authenticated;
grant insert (teacher_id, book) on public.shared_teacher_books to anon, authenticated;
grant update (book) on public.shared_teacher_books to anon, authenticated;
create policy "shared teachers readable" on public.shared_teacher_books for select to anon, authenticated using (true);
create policy "shared teachers creatable" on public.shared_teacher_books for insert to anon, authenticated with check (teacher_id in ('weize','hexin'));
create policy "shared teachers editable" on public.shared_teacher_books for update to anon, authenticated using (true) with check (teacher_id in ('weize','hexin'));
create function public.bump_shared_teacher_revision() returns trigger language plpgsql set search_path=public as $$
begin
 new.revision := old.revision + 1;
 new.updated_at := now();
 return new;
end;
$$;
create trigger shared_teacher_revision before update on public.shared_teacher_books for each row execute function public.bump_shared_teacher_revision();
commit;
