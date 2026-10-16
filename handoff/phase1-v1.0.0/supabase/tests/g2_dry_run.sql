-- G2 dry run: run right after the migrations in ONE transaction. It ends with an exception on purpose,
-- so everything (migrations + test data) is rolled back. The exception text is the report.
do $t$
declare
  adm uuid := gen_random_uuid(); stu uuid := gen_random_uuid(); stu2 uuid := gen_random_uuid();
  ex uuid; ex4 uuid; att public.attempts; r jsonb; n int; rep text := ''; code text;
begin
  insert into auth.users (id, email) values (adm, 'admin@test.local'), (stu, 'sai260001@students.local'), (stu2, 'x@students.local');
  insert into public.profiles (id, role) values (adm, 'admin'), (stu, 'student'), (stu2, 'student');
  insert into public.students (id, full_name, father_name, dob, level) values (stu, 'Riya', 'Rakesh', '2015-05-04', 3)
    returning student_code into code;
  rep := rep || 'code=' || code || '; ';
  insert into public.students (id, full_name, father_name, dob, level) values (stu2, 'Aman', 'Sunil', '2014-01-11', 3);
  begin
    insert into public.students (id, full_name, father_name, dob, level) values (adm, ' riya ', 'RAKESH', '2015-05-04', 3);
    rep := rep || 'FAIL dup allowed; ';
  exception when unique_violation then rep := rep || 'dup blocked; '; end;

  insert into public.exams (name, mode, level, rules, duration_minutes, starts_at, ends_at, status)
    values ('Oct L3', 'official', 3, '[{"operation":"add_sub"}]', 8, now() - interval '1 hour', now() + interval '1 day', 'published') returning id into ex;
  insert into public.exams (name, mode, level, rules, duration_minutes, starts_at, ends_at, status)
    values ('L4', 'official', 4, '[{"operation":"add_sub"}]', 8, now() - interval '1 hour', now() + interval '1 day', 'published') returning id into ex4;
  begin
    insert into public.exams (name, mode, level, rules, duration_minutes, starts_at, ends_at)
      values ('6 days', 'official', 3, '[{}]', 8, now(), now() + interval '6 days');
    rep := rep || 'FAIL 6-day allowed; ';
  exception when check_violation then rep := rep || '6-day blocked; '; end;

  -- act as student
  perform set_config('request.jwt.claims', json_build_object('sub', stu, 'role', 'authenticated', 'session_id', 's1')::text, true);
  perform set_config('role', 'authenticated', true);
  perform public.claim_session();
  att := public.begin_attempt(ex);
  rep := rep || 'resume same=' || ((public.begin_attempt(ex)).id = att.id)::text || '; ';
  begin perform public.begin_attempt(ex4); rep := rep || 'FAIL other level; ';
  exception when others then rep := rep || 'other level: ' || sqlerrm || '; '; end;

  perform set_config('role', 'postgres', true);
  insert into public.attempt_questions (attempt_id, position, kind, prompt, correct_answer) values
    (att.id, 1, 'add_sub', '{"rows":["47","+8","-15","+6"]}', 46), (att.id, 2, 'add_sub', '{}', 288),
    (att.id, 3, 'decimal_add_sub', '{}', 0.3), (att.id, 4, 'add_sub', '{}', 7);
  perform set_config('role', 'authenticated', true);

  r := public.get_paper(att.id);
  rep := rep || 'paper hides key=' || (r::text not like '%288%')::text || '; ';
  select count(*) into n from public.attempt_questions; rep := rep || 'student sees key rows=' || n || '; ';
  select count(*) into n from public.exams; rep := rep || 'student sees exams=' || n || '; ';
  update public.students set level = 8 where id = stu; get diagnostics n = row_count; rep := rep || 'self level change rows=' || n || '; ';
  update public.attempts set correct = 99; get diagnostics n = row_count; rep := rep || 'self score change rows=' || n || '; ';
  select count(*) into n from public.profiles; rep := rep || 'profiles visible=' || n || '; ';
  rep := rep || 'saved=' || public.save_answers(att.id, '[{"position":1,"answer":46},{"position":2,"answer":278},{"position":3,"answer":0.30}]') || '; ';
  begin perform public.get_leaderboard(ex); rep := rep || 'FAIL lb visible; ';
  exception when others then rep := rep || 'lb hidden; '; end;
  -- second login replaces first
  perform set_config('request.jwt.claims', json_build_object('sub', stu, 'role', 'authenticated', 'session_id', 's2')::text, true);
  perform public.claim_session();
  perform set_config('request.jwt.claims', json_build_object('sub', stu, 'role', 'authenticated', 'session_id', 's1')::text, true);
  begin perform public.get_paper(att.id); rep := rep || 'FAIL old session works; ';
  exception when others then rep := rep || 'old session: ' || sqlerrm || '; '; end;
  perform set_config('request.jwt.claims', json_build_object('sub', stu, 'role', 'authenticated', 'session_id', 's2')::text, true);

  r := public.submit_attempt(att.id);
  rep := rep || format('result total=%s correct=%s wrong=%s skipped=%s status=%s; ', r->>'total', r->>'correct', r->>'wrong', r->>'skipped', r->>'status');
  r := public.submit_attempt(att.id); rep := rep || 'resubmit correct=' || (r->>'correct') || '; ';
  begin perform public.begin_attempt(ex); rep := rep || 'FAIL retake; ';
  exception when others then rep := rep || 'retake: ' || sqlerrm || '; '; end;

  -- other student cannot read Riya's result
  perform set_config('request.jwt.claims', json_build_object('sub', stu2, 'role', 'authenticated', 'session_id', 'x')::text, true);
  begin perform public.get_result(att.id); rep := rep || 'FAIL peer result; ';
  exception when others then rep := rep || 'peer result: ' || sqlerrm || '; '; end;
  select count(*) into n from public.attempts; rep := rep || 'peer sees attempts=' || n || '; ';

  -- admin
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select count(*) into n from public.get_leaderboard(ex); rep := rep || 'admin lb rows=' || n || '; ';
  begin update public.exams set duration_minutes = 20 where id = ex; rep := rep || 'FAIL edit locked exam; ';
  exception when others then rep := rep || 'locked: ' || sqlerrm || '; '; end;
  update public.exams set leaderboard_public = true where id = ex;

  -- classmate can now see leaderboard
  perform set_config('request.jwt.claims', json_build_object('sub', stu2, 'role', 'authenticated', 'session_id', 'x')::text, true);
  select count(*) into n from public.get_leaderboard(ex); rep := rep || 'public lb rows=' || n || '; ';

  -- expiry: attempt left open past deadline gets auto-submitted by the cron function
  perform set_config('role', 'postgres', true);
  insert into public.attempts (exam_id, student_id, attempt_no, started_at, deadline_at)
    values (ex, stu2, 1, now() - interval '20 minutes', now() - interval '12 minutes');
  rep := rep || 'cron finalized=' || public.finalize_expired() || '; ';
  select status into code from public.attempts where student_id = stu2; rep := rep || 'stu2 status=' || code || '; ';
  perform set_config('role', 'anon', true);
  begin select count(*) into n from public.levels; rep := rep || 'FAIL anon reads levels; ';
  exception when others then rep := rep || 'anon blocked; '; end;
  perform set_config('role', 'postgres', true);
  select count(*) into n from public.levels; rep := rep || 'levels=' || n;
  raise exception 'REPORT: %', rep;
end $t$;
