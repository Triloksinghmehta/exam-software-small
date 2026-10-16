-- The Edge Function needs the student code BEFORE creating the Auth user (login email = code@students.local),
-- so code generation moves into a callable function. Service role only.
create function public.next_student_code() returns text
language plpgsql security definer set search_path = '' as $$
declare
  yy smallint := extract(year from now() at time zone 'Asia/Kolkata')::int % 100;
  n int;
begin
  insert into public.student_code_counters (year, last_no) values (yy, 1)
    on conflict (year) do update set last_no = public.student_code_counters.last_no + 1
    returning last_no into n;
  return (select id_prefix from public.settings where id = 1)
    || lpad(yy::text, 2, '0') || case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
end $$;
revoke all on function public.next_student_code() from public, anon, authenticated;

create or replace function public.tg_student_code() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.student_code is null then new.student_code := public.next_student_code(); end if;
  return new;
end $$;
