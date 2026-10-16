# Phase 2 migration runbook (a plan; NOT yet rehearsed, see 12)

1. The owner approves Phase 2 in writing. Read 00, 12 and 13.
2. Create the repo from tag `phase1-approved-v1.0.0` (never from `main`). Keep the Phase 1 repo untouched.
3. Create a NEW Supabase project (different URL and keys). Do not reuse Phase 1 secrets.
4. Replay `supabase/migrations/*.sql` in filename order in the new project (SQL editor or Supabase CLI `db push`). Check: 10 public tables, 9 levels, 1 settings row, cron job `finalize-expired-attempts`, security advisors clean.
   Note: Phase 1 applied migrations through an MCP tool, so the dev project's migration history has different timestamps from the file names. The files are the truth.
5. Deploy Edge Functions `admin-students` and `start-attempt` (`supabase/functions/`, including `_shared`) with JWT verification on.
6. Recreate non-SQL settings by hand: Auth (email provider on, confirmations off for students, password rules, leaked-password protection, rate limits, site URL), secrets, the pg_cron extension, backup/PITR plan. A SQL dump does not carry these.
7. Create the first admin (`docs/runbook-admin.md`).
8. Data: the default is a clean start. If real Phase 1 students must move: Auth password hashes are not portable by a public-table export; plan a password reset for every student, map old to new UUIDs, review PII, migrate in order students → exams → attempts, then check counts, sums and RLS. Rehearse on staging, then rehearse a rollback.
9. Run `supabase/tests/g2_dry_run.sql` and `g7_load_test.sql` (both roll back) on the new project. Extend the RLS tests for organizations before building any Phase 2 feature.
10. Cut over only after owner approval; keep Phase 1 read-only until verified.
