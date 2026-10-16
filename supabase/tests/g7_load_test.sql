-- G7 database load test: 500 students, 30 questions each, all taking one exam at once.
-- Everything is rolled back at the end (the final exception carries the timings).
-- Measures database work only (not network, Edge Function start-up or browsers).
do $t$
declare
  n constant int := 500;
  ex uuid; ids uuid[]; i int; t0 timestamptz; rep text := ''; r jsonb; c int; ans jsonb;
  att uuid;
begin
  insert into public.exams (name, mode, level, rules, duration_minutes, starts_at, ends_at, status)
    values ('LOAD', 'official', 1, '[{"operation":"add_sub"}]', 8, now() - interval '1 hour', now() + interval '1 day', 'published') returning id into ex;

  t0 := clock_timestamp();
  select array_agg(gen_random_uuid()) into ids from generate_series(1, n);
  insert into auth.users (id, email) select u, 'load' || u || '@t.local' from unnest(ids) u;
  insert into public.profiles (id, role, active_session_id) select u, 'student', 's' from unnest(ids) u;
  insert into public.students (id, full_name, father_name, dob, level)
    select u, 'Load ' || row_number() over (), 'Father', date '2015-01-01', 1 from unnest(ids) u;
  rep := rep || format('setup students: %s ms; ', round(extract(milliseconds from clock_timestamp() - t0)));

  -- each student starts the exam (as the student) and gets a 30-question paper
  t0 := clock_timestamp();
  for i in 1..n loop
    perform set_config('request.jwt.claims', json_build_object('sub', ids[i], 'role', 'authenticated', 'session_id', 's')::text, true);
    perform set_config('role', 'authenticated', true);
    att := (public.begin_attempt(ex)).id;
    perform set_config('role', 'postgres', true);
    insert into public.attempt_questions (attempt_id, position, kind, prompt, correct_answer)
      select att, p, 'add_sub', '{"layout":"vertical","rows":["12","+ 34","- 5"]}', 41 from generate_series(1, 30) p;
  end loop;
  rep := rep || format('begin+paper x%s: %s ms (%s ms each); ', n, round(extract(milliseconds from clock_timestamp() - t0)), round(extract(milliseconds from clock_timestamp() - t0) / n, 1));

  -- every student opens the paper, then saves 10 answers x 3 times (autosave), as the student
  t0 := clock_timestamp();
  select jsonb_agg(jsonb_build_object('position', p, 'answer', case when p % 3 = 0 then 40 else 41 end)) into ans from generate_series(1, 10) p;
  for i in 1..n loop
    perform set_config('request.jwt.claims', json_build_object('sub', ids[i], 'role', 'authenticated', 'session_id', 's')::text, true);
    perform set_config('role', 'authenticated', true);
    select id into att from public.attempts where student_id = ids[i] and exam_id = ex;
    r := public.get_paper(att);
    for c in 1..3 loop perform public.save_answers(att, ans); end loop;
  end loop;
  rep := rep || format('get_paper + 3 saves x%s: %s ms (%s ms per student); ', n, round(extract(milliseconds from clock_timestamp() - t0)), round(extract(milliseconds from clock_timestamp() - t0) / n, 1));

  -- everyone submits
  t0 := clock_timestamp();
  for i in 1..n loop
    perform set_config('request.jwt.claims', json_build_object('sub', ids[i], 'role', 'authenticated', 'session_id', 's')::text, true);
    select id into att from public.attempts where student_id = ids[i] and exam_id = ex;
    r := public.submit_attempt(att);
  end loop;
  rep := rep || format('submit x%s: %s ms (%s ms each); ', n, round(extract(milliseconds from clock_timestamp() - t0)), round(extract(milliseconds from clock_timestamp() - t0) / n, 1));
  rep := rep || format('sample result correct=%s total=%s; ', r->>'correct', r->>'total');

  -- admin: leaderboard + results table
  perform set_config('role', 'postgres', true);
  -- act as an admin (the dev admin account must exist; or insert one in profiles with role 'admin')
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.profiles where role = 'admin' limit 1), 'role', 'authenticated')::text, true);
  t0 := clock_timestamp();
  select count(*) into c from public.get_leaderboard(ex);
  rep := rep || format('leaderboard (%s rows, as postgres): %s ms; ', c, round(extract(milliseconds from clock_timestamp() - t0)));
  insert into public.attempts (exam_id, student_id, attempt_no, started_at, deadline_at)
    select ex, ids[k], 2, now() - interval '20 min', now() - interval '12 min' from generate_series(1, n) k;
  insert into public.attempt_questions (attempt_id, position, kind, prompt, correct_answer)
    select a.id, p, 'x', '{}', 1 from public.attempts a, generate_series(1, 30) p where a.attempt_no = 2 and a.exam_id = ex;
  t0 := clock_timestamp();
  c := public.finalize_expired();
  rep := rep || format('cron closes %s abandoned attempts: %s ms', c, round(extract(milliseconds from clock_timestamp() - t0)));
  raise exception 'REPORT: %', rep;
end $t$;
