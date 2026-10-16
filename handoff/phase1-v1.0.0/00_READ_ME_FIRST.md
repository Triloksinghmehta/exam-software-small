# Phase 1 handoff: Abacus Exam Software v1.0.0 (release candidate)

**Status:** release candidate. The Git tag `phase1-approved-v1.0.0` is created ONLY after the owner signs `docs/phase1-acceptance.md`. Items marked "NOT DONE" in `12_KNOWN_ISSUES_AND_BACKLOG.md` must be closed or accepted first.

## What exists
A single-organization exam system: admin and student roles; levels 0 to 8; 10 question types made on the server; CSV student import; practice and official exams (open window up to 5 days); server-side timer, autosave and scoring; results, leaderboard, CSV export; anti-cheat switches. React 19 + TypeScript + Vite + Tailwind on Supabase (Postgres, Auth, RLS, 2 Edge Functions, pg_cron).

## What does NOT exist (Phase 2)
Organizations, schools, franchises, payments, coupons, commissions, WhatsApp/email, certificates, parent portal, webcam proctoring.

## Read in this order
1. This file, then 12 (known issues), 02 (decisions), 03 (architecture), 05 and 06 (database and security), 08 (functions), 09 and 10 (questions and scoring), 13 and 14 (Phase 2).
2. Code: `web/` (React app), `supabase/migrations/` (the only source of database truth), `supabase/functions/`.
3. Progress and history: `roadmap.md` and `features.md` in the repo root; ADRs inside 03.

## Rules for the next engineer or AI
- The migration files, not a chat summary, are the truth. Do not edit applied migrations; add new ones.
- Never put secrets in git. `.env.example` lists names only.
- Student IDs become hidden login emails (`<id>@students.local`), see 07.
- Do not start Phase 2 work in this repo. Phase 2 = new repo from the tag + new Supabase project (13, 14).
