# Architecture (G2)

```
Browser (React + TypeScript, Vite)          Supabase (project sehspievdmlwlltrbztl)
 ├─ Student app  ──login──────────────────▶  Auth
 ├─ Admin app    ──tables (RLS)───────────▶  Postgres: tables + security rules
 │               ──rpc(get_paper, save…)──▶  Postgres functions (timing, scoring)
 └─ shared/generator.ts (admin preview)      Edge Functions (Deno):
                 ──start-attempt──────────▶   start-attempt   (makes the student's paper once with generator.ts)
                 ──admin-students─────────▶   admin-students (create single/CSV batch of 50, reset password)
                                              pg_cron: finalize_expired every minute
```

- **Stack:** React 19 + TypeScript + Vite, React Router, Tailwind CSS, Supabase JS, PapaParse (CSV). (TanStack Query dropped: plain fetch-on-load is enough.) Tests: Vitest (generator, units), Playwright (end-to-end), SQL dry-run scripts (security).
- **Question generator:** one TypeScript file used by both the start-attempt function (real papers) and the admin preview. Answers are computed with whole numbers scaled for decimals, so there are no floating-point mistakes.
- **No secrets in the browser:** only the public key goes to the browser. The service key lives in the Edge Function settings.
- **Hosting:** the frontend is a static site (Vercel or Netlify, to be decided at G7).

Decisions: `docs/decisions/`.
