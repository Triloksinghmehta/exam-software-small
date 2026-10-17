-- Bulk import can take student_id / password from the CSV ('custom') instead of generating them ('auto').
alter table public.settings add column import_mode text not null default 'auto' check (import_mode in ('auto', 'custom'));
-- Set when an admin chose the password: the student sees a "change your password" banner until they do.
alter table public.students add column password_shared boolean not null default false;

create or replace function public.mark_password_changed() returns void
language sql security definer set search_path = '' as $$
  update public.students set must_change_password = false, password_shared = false where id = (select auth.uid());
$$;
