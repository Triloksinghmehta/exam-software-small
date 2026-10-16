# Auth and credentials

- **Provider:** Supabase Auth (email + password). Passwords are hashed by Supabase; we never store or log them.
- **Students:** login = Student ID + password. The app converts the ID into the hidden email `<id in lower case>@students.local` (ADR-0002). Students have no real email in Phase 1.
- **Admins:** real email + password. Created by hand (`docs/runbook-admin.md`): create the user in the Supabase Dashboard, then insert a `profiles` row with role `admin`.
- **Creating students:** only the `admin-students` Edge Function (service role key, server side) creates Auth users. It makes an 8-character random temporary password from an alphabet without look-alike characters (no 0/O/1/l/I), shows it once in the admin screen or login-list CSV, and sets `must_change_password`.
- **First login:** the student must set a new password (minimum 6 characters) before anything else.
- **Reset:** admin → Reset password → a new temporary password is shown once; old sessions are ended.
- **One login at a time:** `profiles.active_session_id` holds the newest login's session; exam functions reject older sessions (`SESSION_REPLACED`). Switch in Admin → Settings.
- **Disabled student:** cannot start exams; exam functions reject them immediately (`NOT_ALLOWED`).
- **Roles:** only `profiles.role`, set by server code or by hand in SQL. The browser cannot change it (no write policy).
- **Secrets:** the Supabase anon/publishable key is public by design. The service role key exists only inside Supabase Edge Function settings. Never commit `web/.env.local`.
- **Known gaps:** no email password reset for students; leaked-password check is off (dashboard setting); login rate limits are Supabase defaults only.
