-- Exam functions. All server-authoritative: eligibility, timing, scoring.
-- Error codes (raised as exception messages) are shown to users via docs/workflows.md wording.

-- Grace for answers in flight when the timer ends
create function public._grace() returns interval language sql immutable as $$ select interval '10 seconds' $$;

-- "One login at a time": the newest login claims the session
create function public.claim_session() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set active_session_id = (select auth.jwt() ->> 'session_id') where id = (select auth.uid());
$$;

create function public._check_session() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select ac_single_session from public.settings where id = 1)
     and (select active_session_id from public.profiles where id = auth.uid()) is distinct from (auth.jwt() ->> 'session_id') then
    raise exception 'SESSION_REPLACED';
  end if;
end $$;

create function public.mark_password_changed() returns void
language sql security definer set search_path = '' as $$
  update public.students set must_change_password = false where id = (select auth.uid());
$$;

-- Score and close an attempt exactly once (row lock + status guard)
create function public._finalize(p_attempt uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.attempts a set
    status = p_status,
    submitted_at = least(now(), a.deadline_at),
    total = q.total, answered = q.answered, correct = q.correct,
    wrong = q.answered - q.correct, skipped = q.total - q.answered
  from (
    select count(*)::int as total,
           count(student_answer)::int as answered,
           count(*) filter (where student_answer = correct_answer)::int as correct
    from public.attempt_questions where attempt_id = p_attempt
  ) q
  where a.id = p_attempt and a.status = 'in_progress';
end $$;

-- Owned attempt for the caller; finalizes it if time is over
create function public._my_open_attempt(p_attempt uuid) returns public.attempts
language plpgsql security definer set search_path = '' as $$
declare a public.attempts;
begin
  perform public._check_session();
  select * into a from public.attempts where id = p_attempt and student_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.status <> 'in_progress' then return a; end if;
  -- No exception after finalizing: an exception would roll the finalize back.
  -- Callers must check status <> 'in_progress' and return it.
  if now() > a.deadline_at + public._grace() then
    perform public._finalize(a.id, 'auto_submitted');
    select * into a from public.attempts where id = a.id;
  end if;
  return a;
end $$;

-- Start or resume. Called by the start-attempt Edge Function (with the student's JWT), which then stores the paper.
create function public.begin_attempt(p_exam uuid) returns public.attempts
language plpgsql security definer set search_path = '' as $$
declare
  s public.students; e public.exams; a public.attempts; used int;
begin
  select * into s from public.students where id = auth.uid();
  if not found or s.status <> 'active' then raise exception 'NOT_ALLOWED'; end if;
  perform public._check_session();

  select * into e from public.exams where id = p_exam;
  if not found or e.status <> 'published' or e.level <> s.level then raise exception 'NOT_ALLOWED'; end if;

  -- Resume
  select * into a from public.attempts where exam_id = p_exam and student_id = s.id and status = 'in_progress';
  if found then
    if now() > a.deadline_at + public._grace() then
      perform public._finalize(a.id, 'auto_submitted');
      select * into a from public.attempts where id = a.id;
    end if;
    return a;
  end if;

  if now() < e.starts_at then raise exception 'NOT_OPEN_YET'; end if;
  if now() > e.ends_at then raise exception 'CLOSED'; end if;
  select count(*) into used from public.attempts where exam_id = p_exam and student_id = s.id;
  if used >= e.attempts_allowed then raise exception 'NO_TRIES_LEFT'; end if;

  begin
    -- Full duration even if started just before ends_at (see ADR-0004)
    insert into public.attempts (exam_id, student_id, attempt_no, deadline_at)
      values (p_exam, s.id, used + 1, now() + make_interval(mins => e.duration_minutes))
      returning * into a;
  exception when unique_violation then
    -- Double click / two tabs: return the attempt the other request created
    select * into a from public.attempts where exam_id = p_exam and student_id = s.id and status = 'in_progress';
    if not found then raise exception 'NO_TRIES_LEFT'; end if;
  end;
  return a;
end $$;

-- Questions without answers, plus saved answers and server time for the timer
create function public.get_paper(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.attempts;
begin
  a := public._my_open_attempt(p_attempt);
  if a.status <> 'in_progress' then return jsonb_build_object('attempt_id', a.id, 'status', a.status); end if;
  if not exists (select 1 from public.attempt_questions where attempt_id = a.id) then
    raise exception 'PAPER_NOT_READY';
  end if;
  return jsonb_build_object(
    'attempt_id', a.id, 'status', a.status, 'deadline_at', a.deadline_at, 'server_now', now(),
    'questions', (select jsonb_agg(jsonb_build_object('position', position, 'kind', kind, 'prompt', prompt, 'answer', student_answer) order by position)
                  from public.attempt_questions where attempt_id = a.id));
end $$;

-- Batch save: [{"position":1,"answer":46}, {"position":2,"answer":null}]
create function public.save_answers(p_attempt uuid, p_answers jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare a public.attempts; n int;
begin
  a := public._my_open_attempt(p_attempt);
  if a.status <> 'in_progress' then return -1; end if; -- -1 = time over, attempt closed
  update public.attempt_questions q set student_answer = (x->>'answer')::numeric, answered_at = now()
    from jsonb_array_elements(p_answers) x
    where q.attempt_id = a.id and q.position = (x->>'position')::int;
  get diagnostics n = row_count;
  return n;
end $$;

-- Result: summary + per-question review. Only after the attempt is finished.
create function public.get_result(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.attempts; e public.exams;
begin
  select * into a from public.attempts where id = p_attempt and (student_id = auth.uid() or public.is_admin());
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.status = 'in_progress' then raise exception 'NOT_FINISHED'; end if;
  select * into e from public.exams where id = a.exam_id;
  return jsonb_build_object(
    'attempt_id', a.id, 'exam_name', e.name, 'mode', e.mode, 'level', e.level, 'status', a.status,
    'total', a.total, 'answered', a.answered, 'correct', a.correct, 'wrong', a.wrong, 'skipped', a.skipped,
    'percent', case when a.total > 0 then round(100.0 * a.correct / a.total, 1) else 0 end,
    'started_at', a.started_at, 'submitted_at', a.submitted_at,
    'time_taken_seconds', extract(epoch from a.submitted_at - a.started_at)::int,
    'leaderboard_available', e.leaderboard_public and e.mode = 'official',
    'questions', (select jsonb_agg(jsonb_build_object('position', position, 'prompt', prompt,
                    'answer', student_answer, 'correct_answer', correct_answer,
                    'result', case when student_answer is null then 'skipped' when student_answer = correct_answer then 'correct' else 'wrong' end)
                  order by position) from public.attempt_questions where attempt_id = a.id));
end $$;

-- Submit (idempotent: a second call just returns the result)
create function public.submit_attempt(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.attempts;
begin
  select * into a from public.attempts where id = p_attempt and student_id = auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.status = 'in_progress' then
    perform public._finalize(a.id, case when now() > a.deadline_at then 'auto_submitted' else 'submitted' end);
  end if;
  return public.get_result(p_attempt);
end $$;

-- Anti-cheat log. Returns the attempt status so the client knows if it was auto-submitted.
create function public.log_event(p_attempt uuid, p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
declare a public.attempts; st public.settings;
begin
  a := public._my_open_attempt(p_attempt);
  if a.status <> 'in_progress' then return a.status; end if;
  select * into st from public.settings where id = 1;
  if not st.ac_log_leaves then return a.status; end if;
  insert into public.attempt_events (attempt_id, kind) values (a.id, p_kind);
  if p_kind = 'left_screen' then
    update public.attempts set leave_count = leave_count + 1 where id = a.id returning * into a;
    if st.ac_auto_submit_after is not null and a.leave_count >= st.ac_auto_submit_after then
      perform public._finalize(a.id, 'auto_submitted');
      return 'auto_submitted';
    end if;
  end if;
  return a.status;
end $$;

-- Leaderboard: official exams; best attempt per student.
-- Rank: more correct -> less time -> earlier submit; full ties share a rank.
create function public.get_leaderboard(p_exam uuid) returns table (
  rank bigint, student_code text, full_name text, correct int, total int, time_taken_seconds int, submitted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin() or exists (
      select 1 from public.exams e where e.id = p_exam and e.leaderboard_public and e.mode = 'official'
        and e.level = public.my_level())) then
    raise exception 'NOT_ALLOWED';
  end if;
  return query
  with best as (
    select distinct on (a.student_id) a.student_id, a.correct, a.total, a.submitted_at,
           extract(epoch from a.submitted_at - a.started_at)::int as t
    from public.attempts a
    where a.exam_id = p_exam and a.status <> 'in_progress'
    order by a.student_id, a.correct desc, (a.submitted_at - a.started_at), a.submitted_at
  )
  select rank() over (order by b.correct desc, b.t, b.submitted_at), s.student_code, s.full_name,
         b.correct, b.total, b.t, b.submitted_at
  from best b join public.students s on s.id = b.student_id
  order by 1, s.full_name;
end $$;

-- Cron: close attempts whose time ran out while the student was away
create function public.finalize_expired() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select id from public.attempts where status = 'in_progress' and deadline_at + public._grace() < now() loop
    perform public._finalize(r.id, 'auto_submitted');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Only these are callable by logged-in users; internal helpers (_*) and finalize_expired are not.
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_admin(), public.my_level(), public.claim_session(), public.mark_password_changed(),
  public.begin_attempt(uuid), public.get_paper(uuid), public.save_answers(uuid, jsonb),
  public.submit_attempt(uuid), public.get_result(uuid), public.log_event(uuid, text),
  public.get_leaderboard(uuid)
to authenticated;
