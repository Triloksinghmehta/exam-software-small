-- Admin deletes an exam together with its attempts (attempts.exam_id has no cascade; answers and logs cascade from attempts).
create function public.delete_exam(p_exam uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'NOT_ALLOWED'; end if;
  delete from public.attempts where exam_id = p_exam;
  delete from public.exams where id = p_exam;
  insert into public.audit_events (actor, action, target) values (auth.uid(), 'delete_exam', p_exam::text);
end $$;

revoke all on function public.delete_exam(uuid) from public, anon, authenticated;
grant execute on function public.delete_exam(uuid) to authenticated;
