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


## Decision records (ADRs)

---

# ADR-0001: React + Supabase stack
Status: Accepted (G2, 2026-10-16)

**Decision:** React + TypeScript + Vite for the frontend; Supabase Postgres, Auth, RLS and Edge Functions for the backend.
**Why:** the owner required this stack. Postgres row security plus server functions keep scoring and answer keys on the server.
**Rejected:** a custom Node API server (one more thing to host and secure); keeping the reference app's browser-only logic (students could cheat, see question-rules.md R1–R3).

---

# ADR-0002: Student login with ID via hidden email
Status: Accepted (G2, 2026-10-16)

**Decision:** each student gets a Supabase Auth user with the email `<studentcode>@students.local`, which the student never sees. The login screen asks only for Student ID + password.
**Why:** Supabase Auth needs an email or phone, and students have neither. Building the email from the ID needs no lookup, so the app has no endpoint that reveals which IDs exist.
**Rejected:** a custom password table (unsafe); a lookup function from ID to email (lets anyone check which IDs exist).
**Phase 2 note:** when real emails/phones are added, update the Auth user's email; the student code stays the same.

---

# ADR-0003: Generator in TypeScript on the server; answer keys only behind functions
Status: Accepted (G2, 2026-10-16)

**Decision:** the question generator is one TypeScript module. The `start-attempt` Edge Function runs it and stores the paper in `attempt_questions` in a single insert. Students read the paper only through `get_paper` (no answers) and `get_result` (after submit). The table has no student read rule.
**Why:** this fixes reference problems R1/R2 (answers and score in the browser). The same code serves the admin preview and is easy to unit-test. No seed is stored, because a known seed would let a student regenerate the answers from the public code.
**Rejected:** a generator written in SQL (hard to write and test the friend formulas and BODMAS in SQL); generating in the browser (anyone could read the answers).
**If generation fails midway:** nothing is saved (single insert). A retry generates the paper again; the start time and deadline stay unchanged.

---

# ADR-0004: Server timing
Status: Accepted (G2, 2026-10-16). The full-duration rule can be changed by the owner.

**Decision:** the deadline is start + duration, set by the server. A student who starts just before the exam closes still gets the full duration. Answers arriving up to 10 seconds late are accepted. The browser timer is only for display; it is synced to `server_now`. A cron job every minute closes expired attempts.
**Why:** a refresh or a wrong device clock can't change the time (reference problem R4). Children who start late aren't cut short unexpectedly.
**Alternative (not chosen):** cut the deadline at the exam closing time. This is a one-line change in `begin_attempt` if the owner prefers it.
