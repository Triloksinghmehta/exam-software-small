-- G7 security review fixes.
-- 1. A student disabled by the admin must lose exam access at once, not when their login token expires.
create or replace function public._check_session() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.students where id = auth.uid() and status <> 'active') then
    raise exception 'NOT_ALLOWED';
  end if;
  if (select ac_single_session from public.settings where id = 1)
     and (select active_session_id from public.profiles where id = auth.uid()) is distinct from (auth.jwt() ->> 'session_id') then
    raise exception 'SESSION_REPLACED';
  end if;
end $$;

-- 2. Advisor: index for the exams.created_by foreign key
create index exams_created_by_idx on public.exams (created_by);
