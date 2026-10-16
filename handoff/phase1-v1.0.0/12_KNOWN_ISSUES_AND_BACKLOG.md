# Known issues and backlog (honest list)

## NOT DONE / NOT VERIFIED (close or accept before tagging)
1. **Empty-project rebuild test** not run: needs a second Supabase project (costs money). Migrations were applied one by one to the dev project; a replay on a clean project is unproven.
2. **Phase 2 transition rehearsal** not run (same reason).
3. **Real devices:** not tested on a real phone, tablet or iPhone; real network-off behaviour untested (the code queues answers and retries; see 11).
4. **HTTP-level load test** not run. The database-level test passed (500 students, about 1 ms per step; see 11). Edge Function start-up and browsers under 500 simultaneous starts are untested.
5. **10,000-row CSV import** not tested (imports run 50 rows per call and each row makes an Auth user; expect minutes).
6. **CSV opened in Excel** not checked (UTF-8 BOM added; formula characters neutralised in code).
7. **Owner sign-off** (`docs/phase1-acceptance.md`) and the Git tag.

## Owner actions in the Supabase Dashboard / hosting
- Delete test accounts: admin `admin@test.local`, students SAI260001–SAI260003, test exams ("Test Level 3 Exam", "Test Practice 1-min"). Create the real admin (`docs/runbook-admin.md`).
- Authentication → enable leaked password protection (may need a paid plan); review email and rate-limit settings.
- Choose hosting for `web/` (Vercel or Netlify) and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Known limitations (by design or accepted for Phase 1)
- Anti-cheat only deters and logs; a second phone or AI cannot be stopped. iPhone Safari has no full screen.
- A blocked duplicate student still uses up an ID number (gaps in IDs).
- Open question Q02c: default question count and time per level not decided. Level defaults are starting values (Level 0/1: 20 questions; others 4 per rule); the admin edits them per exam.
- No student self-service password reset (admin resets). No data retention or deletion tools.
- A level's default rules are copied into an exam when it is created; later edits to the defaults don't change old exams.
- Admin can edit a student's name/level but cannot delete students (disable instead).
- Edge Functions allow any origin (CORS `*`); they still require a valid login.
- Security advisor notes accepted: SECURITY DEFINER functions are intentional (they check the caller); `student_code_counters` has no policy on purpose; two permissive SELECT policies on the small `exams` table.

## Backlog / Phase 2 reminders
Certificates (owner asked to be reminded at P2-G0), coupons ("couple" = coupon), organizations, payments, commissions, WhatsApp/email, student password reset by email/WhatsApp, delete/archive students, bulk exam assignment by group.
