# Runbook: create the first admin

1. Supabase Dashboard → Authentication → Users → **Add user** → enter email + password and tick **Auto confirm**.
2. SQL editor:
   ```sql
   insert into public.profiles (id, role)
   select id, 'admin' from auth.users where email = 'owner@example.com';
   ```
3. Log in at `/admin/login`.

Dev test admin `admin@test.local` exists in the dev project (password in `web/.env.local`, not in git). **Delete it before going live:** Dashboard → Users → delete.
