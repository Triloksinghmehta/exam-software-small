-- Phase 1 schema. Single organization.
-- org_id columns are Phase 2 extension points: always NULL in Phase 1, no logic uses them.

-- App settings (exactly one row)
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  id_prefix text not null default 'SAI' check (id_prefix ~ '^[A-Z]{2,6}$'),
  timezone text not null default 'Asia/Kolkata',
  ac_fullscreen boolean not null default true,
  ac_log_leaves boolean not null default true,
  ac_block_copy boolean not null default true,
  ac_single_session boolean not null default true,
  ac_auto_submit_after int check (ac_auto_submit_after > 0), -- null = off
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

-- One row per login. Role is set server-side only.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin', 'student')),
  active_session_id text, -- for "one login at a time"
  created_at timestamptz not null default now()
);

create table public.levels (
  level smallint primary key check (level between 0 and 8),
  name text not null,
  description text not null default '',
  default_rules jsonb not null default '[]' check (jsonb_typeof(default_rules) = 'array'),
  active boolean not null default true
);

create table public.student_code_counters (
  year smallint primary key,
  last_no int not null default 0
);

create table public.students (
  id uuid primary key references public.profiles on delete cascade,
  student_code text not null unique,
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  father_name text not null check (length(trim(father_name)) between 1 and 100),
  dob date not null check (dob >= date '1990-01-01'),
  level smallint not null references public.levels,
  status text not null default 'active' check (status in ('active', 'disabled')),
  must_change_password boolean not null default true,
  org_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Duplicate rule (owner decision Q14): same name + father's name + DOB
create unique index students_identity_uq
  on public.students (lower(trim(full_name)), lower(trim(father_name)), dob);
create index students_level_idx on public.students (level);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  mode text not null check (mode in ('official', 'practice')),
  level smallint not null references public.levels,
  rules jsonb not null check (jsonb_typeof(rules) = 'array' and jsonb_array_length(rules) > 0),
  generator_version text not null default 'v1',
  duration_minutes int not null check (duration_minutes between 1 and 300),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  attempts_allowed int not null default 1 check (attempts_allowed between 1 and 100),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  leaderboard_public boolean not null default false,
  org_id uuid,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_validity_ck check (ends_at > starts_at and ends_at - starts_at <= interval '5 days')
);
create index exams_level_status_idx on public.exams (level, status);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams,
  student_id uuid not null references public.students,
  attempt_no int not null check (attempt_no >= 1),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'auto_submitted')),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  total int, answered int, correct int, wrong int, skipped int,
  leave_count int not null default 0,
  unique (exam_id, student_id, attempt_no),
  check ((status = 'in_progress') = (submitted_at is null))
);
-- At most one open attempt per student per exam
create unique index attempts_one_open_uq on public.attempts (exam_id, student_id) where status = 'in_progress';
create index attempts_student_idx on public.attempts (student_id);
create index attempts_open_deadline_idx on public.attempts (deadline_at) where status = 'in_progress';

-- Frozen paper per attempt. Students never read this table directly (answer key).
create table public.attempt_questions (
  attempt_id uuid not null references public.attempts on delete cascade,
  position int not null check (position >= 1),
  kind text not null,
  prompt jsonb not null,
  correct_answer numeric not null,
  student_answer numeric,
  answered_at timestamptz,
  primary key (attempt_id, position)
);

create table public.attempt_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.attempts on delete cascade,
  kind text not null check (kind in ('left_screen', 'fullscreen_exit', 'session_replaced')),
  at timestamptz not null default now()
);
create index attempt_events_attempt_idx on public.attempt_events (attempt_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target text,
  details jsonb not null default '{}',
  at timestamptz not null default now()
);

-- updated_at
create function public.tg_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger students_touch before update on public.students for each row execute function public.tg_touch();
create trigger exams_touch before update on public.exams for each row execute function public.tg_touch();
create trigger settings_touch before update on public.settings for each row execute function public.tg_touch();

-- Student code: <prefix><yy><0001>, e.g. SAI260001. Grows past 4 digits instead of truncating.
create function public.tg_student_code() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  yy smallint := extract(year from now() at time zone 'Asia/Kolkata')::int % 100;
  n int;
begin
  if new.student_code is null then
    insert into public.student_code_counters (year, last_no) values (yy, 1)
      on conflict (year) do update set last_no = public.student_code_counters.last_no + 1
      returning last_no into n;
    new.student_code := (select id_prefix from public.settings where id = 1)
      || lpad(yy::text, 2, '0') || case when n < 10000 then lpad(n::text, 4, '0') else n::text end;
  end if;
  return new;
end $$;
create trigger students_code before insert on public.students for each row execute function public.tg_student_code();

-- Once a student has started an exam, its paper rules cannot change (only name, end time extension, status, leaderboard switch).
create function public.tg_exam_lock() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.attempts where exam_id = old.id) then
    if (new.mode, new.level, new.rules, new.generator_version, new.duration_minutes, new.starts_at, new.attempts_allowed)
       is distinct from (old.mode, old.level, old.rules, old.generator_version, old.duration_minutes, old.starts_at, old.attempts_allowed)
       or new.ends_at < old.ends_at then
      raise exception 'EXAM_LOCKED' using hint = 'Students have started this exam; only name, end time (later), status and leaderboard can change.';
    end if;
  end if;
  return new;
end $$;
create trigger exams_lock before update on public.exams for each row execute function public.tg_exam_lock();
