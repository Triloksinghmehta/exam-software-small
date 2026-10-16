# Operations and deployment

## Run locally
```
cd web && npm ci && npm run dev        # needs web/.env.local (see ../.env.example)
cd web && npx vitest run               # tests; GEN_SAMPLES=10000 for the full generator run
cd web && npm run build && npx eslint src
```
Node 24 and npm 11 were used. Dependency lock: `web/package-lock.json`.

## Backend
- Supabase project (dev): ref `sehspievdmlwlltrbztl`, region ap-southeast-1, Postgres 17. Phase 2 uses a different project.
- Migrations: `supabase/migrations/` (7 files). Functions: `supabase/functions/`. Tests that roll back: `supabase/tests/`.
- Edge Function environment: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (provided by Supabase), optional `STUDENT_EMAIL_DOMAIN` (default `students.local`; must match `VITE_STUDENT_EMAIL_DOMAIN`).
- Cron: `finalize-expired-attempts` every minute (pg_cron).

## Deploy the website
Static build: `cd web && npm run build` produces `web/dist`. Host on Vercel, Netlify or any static host with an SPA fallback (all paths serve `index.html`). Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STUDENT_EMAIL_DOMAIN`. Add the site URL in Supabase Auth settings.

## Backups
Use Supabase backups (daily; point-in-time recovery on paid plans). A restore rehearsal has NOT been done (see 12). Export results regularly with the CSV button.

## Day to day
Create students → create exam (preview it) → publish → watch Results → toggle the leaderboard → download CSV. Student forgot the password → Students → Reset password. Wrong student level → Edit.
