-- Row Level Security. Matrix: docs/auth-rls-matrix.md
-- Students never write exam data directly: all exam actions go through functions in migration 0003.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;

create function public.my_level() returns smallint
language sql stable security definer set search_path = '' as $$
  select level from public.students where id = (select auth.uid()) and status = 'active'
$$;

alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.levels enable row level security;
alter table public.student_code_counters enable row level security;
alter table public.students enable row level security;
alter table public.exams enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_questions enable row level security;
alter table public.attempt_events enable row level security;
alter table public.audit_events enable row level security;

-- Nothing is readable without login
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant execute on function public.is_admin(), public.my_level() to authenticated;

-- settings: everyone logged in reads (exam screen needs anti-cheat switches); admin updates
create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_admin_update on public.settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- profiles: read own; admin reads all; no client writes (role escalation)
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- levels: everyone logged in reads; admin edits rules
create policy levels_read on public.levels for select to authenticated using (true);
create policy levels_admin_update on public.levels for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- students: read own; admin reads/edits. Creation goes through the admin Edge Function (needs an Auth user).
create policy students_read on public.students for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy students_admin_update on public.students for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- exams: admin full; student sees published/closed exams of own level
create policy exams_admin_all on public.exams for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy exams_student_read on public.exams for select to authenticated
  using (status in ('published', 'closed') and level = (select public.my_level()));

-- attempts: read own (summary only, no answer key here); admin reads all
create policy attempts_read on public.attempts for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));

-- attempt_questions: admin only (holds answer key). Students use get_paper / get_result.
create policy attempt_questions_admin_read on public.attempt_questions for select to authenticated
  using ((select public.is_admin()));

create policy attempt_events_admin_read on public.attempt_events for select to authenticated
  using ((select public.is_admin()));

create policy audit_admin_read on public.audit_events for select to authenticated
  using ((select public.is_admin()));
-- student_code_counters: no policies = no client access
