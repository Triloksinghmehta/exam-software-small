# Runbook: create the first admin

1. Supabase Dashboard → Authentication → Users → **Add user** → enter email + password and tick **Auto confirm**.
2. SQL editor:
   ```sql
   insert into public.profiles (id, role)
   select id, 'admin' from auth.users where email = 'owner@example.com';
   ```
3. Log in at `/admin/login`.

Dev test admin `admin@test.local` exists in the dev project (password in `web/.env.local`, not in git). **Delete it before going live:** Dashboard → Users → delete.

# Runbook: remove test data before going live
Create your real admin first (above), then in the Supabase SQL editor:
```sql
delete from public.attempts;                 -- also removes answers and anti-cheat logs
delete from public.exams;
delete from public.audit_events;
delete from auth.users where email like '%@students.local' or email = 'admin@test.local';  -- also removes profiles and students
delete from public.student_code_counters;    -- next student becomes SAI<yy>0001
```
