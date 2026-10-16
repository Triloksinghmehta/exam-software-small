# Abacus Exam Software — Master Plan (Review Draft)

**Status:** G0 APPROVED 2026-10-16; G1 in progress. Consolidated open questions: `docs/open-questions.md` (supersedes D01–D14 numbering once answered). The two attached proposals were not in the workspace at G0.  
**Architecture:** React (TypeScript) + Supabase (PostgreSQL, Auth, RLS, Edge Functions)  
**Development strategy:** Project 1 = Phase 1 only; Project 2 = Phase 2 on a separate Supabase project, using a documented and tested transition.  
**Rule:** Do not write application code, provision production services, or execute migrations until this plan is explicitly approved.

## 1. Source of requirements and discrepancies

This plan combines the owner's latest requirements with two attached proposals:
- **SAI ECMAS ABACUS**: level-based generated questions, Level 1–9 (superseded: we use Levels 0–8, see D01), CSV student import, individual credentials, pre-exam confirmation, separate practice exams, results.
- **Foreign Abacus Education**: multi-institute/franchise support, commissions, paid exam enrollment, coupons, separate exam papers/time windows, CSV import/export, WhatsApp/email, browser-level anti-cheat controls.

The newer owner instructions govern the phase allocation. The attached proposals describe separate client scopes and commercial terms; their pricing/delivery promises are **not** automatically merged into this product plan.

### Decisions needed before implementation

| ID | Question | Safe provisional direction |
|---|---|---|
| D01 | Levels | **DECIDED: Levels 0–8 (9 levels).** Level 9 removed by owner 2026-10-16. |
| D02 | How does the abacus question generator work per level: operands, digit limits, rows, +/−/×/÷, carry/borrow, negative numbers, decimal rules, time/question counts? | Define a versioned rules matrix; no generic random questions until approved. |
| D03 | Is every student restricted to an assigned level, or can they practice other levels? | Official exams require assigned eligibility; practice access is configurable. |
| D04 | How are marks, skipped answers, ties, attempted counts, and ranking determined? | Document deterministic scoring and tie-breaking; do not assume speed always wins. |
| D05 | Does 'validity up to 5 days' mean exam availability window, one student's start deadline, or a 5-day entitlement? | Store start/end timestamps and an optional per-student access deadline separately. |
| D06 | Is a live exam allowed once, or are admin-authorized retakes possible? | One submitted official attempt by default, with auditable override. |
| D07 | Are students under 18, and what personal data is necessary? | Minimize data; protect student privacy; no plaintext passwords or public rankings with sensitive details. |
| D08 | Phase 2: student registration is free, but exam enrollment can be paid — is that correct? | Separate free `student_registration` from paid/waived `exam_enrollment`. |
| D09 | 'Couple support' means **coupon support**? | Treat as unresolved typo; require confirmation. |
| D10 | Will Phase 2 migrate existing Phase 1 students/results or start with a clean tenant database? | Plan reversible migration; no assumed cross-project data sharing. |
| D11 | Which institution hierarchy is intended (franchise above institutes, schools independent, etc.)? | Support an explicit hierarchy only after mapping ownership and access. |
| D12 | Exact security/proctoring rules and accessibility exceptions? | Use server-enforced timing/auth; browser controls only deter, never guarantee cheating prevention. |
| D13 | Who may view leaderboards: admin only? When should student results become visible? | Admin-only leaderboard; configurable student result release. |
| D14 | What is the payment provider, currency, commission definition, refund/reversal policy? | No provider chosen until review; ledger and payment confirmation are server-authoritative. |

## 2. Product principles

1. Mobile-first, responsive, accessible, uncluttered interface, particularly for children.
2. Server-authoritative exam timing, scoring, permissions, and enrollment.
3. Versioned question-generation rules; save the exact generated paper and answers for each official attempt.
4. Consistent lifecycle/status models; never overwrite final submissions without traceability.
5. No direct client access to service-role credentials or answer keys before result release.
6. Supabase Row Level Security (RLS) and least-privilege operations from day one.
7. Treat Phase 2 multi-tenancy as a **future architectural constraint**, not permission to build Phase 2 features early.
8. Record all important design decisions and implementation history in the repository, not only in chat.

## 3. Technology and repository design

**Proposed stack (reviewable):** React + TypeScript + Vite; React Router; TanStack Query; React Hook Form + Zod; accessible component library/Tailwind CSS if approved; Supabase Postgres/Auth/RLS/Edge Functions; Vitest + React Testing Library + Playwright; GitHub Actions for lint/typecheck/tests/build. Version-pin dependencies; avoid adding libraries without need.

**Phase 1 repository layout (example):**

```text
exam-project-phase1/
  plan.md
  README.md
  docs/
    requirements.md
    decisions/                 # ADR-0001, ADR-0002 ...
    architecture.md
    database-schema.md
    auth-rls-matrix.md
    question-rules.md
    workflows.md
    qa-test-cases.md
    change-log.md
    phase1-acceptance.md
    phase2-handoff.md
    migration-runbook.md
    open-questions.md
  src/
    app/
    features/auth/
    features/students/
    features/questions/
    features/exams/
    features/results/
    features/leaderboard/
    features/admin/
    shared/
  supabase/
    migrations/
    functions/
    seed.sql
  tests/
  .env.example
  package.json
```

Two code projects can be separate repos, or Project 2 can fork from a frozen Phase 1 tag. **Preferred:** tag `phase1-approved-v1.0.0`; make an independent Project 2 repo based on that exact tag; import reviewed SQL migrations into a separate Supabase project. Never copy deployed credentials.

## 4. Phase 1 — Core Examination System (Project 1 ONLY)

### 4.1 Users and basic access

- One organization (single-tenant application) with **admin** and **student** roles.
- Admin manages students, levels, generator configuration, exams, schedules, results and leaderboard.
- Student logs in with unique student ID and password, views eligible exams, practices and reviews allowed results.
- Supabase Auth is responsible for password verification; unique student ID maps to the authenticated account via a secure lookup flow. Never maintain a custom plaintext-password table.
- Bulk import generates secure one-time enrollment credentials or reset invitations. Do not display existing passwords later; force password change if temporary credentials are distributed.

### 4.2 Level management

- Configurable level catalog with name, number, active state and rule-set version.
- **Decided (D01):** Levels 0–8 (9 levels). The SAI proposal's "Level 1–9" is not used.
- Associate every official exam with a level and version of its generator rules.
- Student assigned level recorded independently of attempt history.

### 4.3 Automatic question generation

- Level-based **deterministic, tested arithmetic rule engine**; no LLM required for mathematical correctness.
- Admin controls question count, difficulty/rule profile, operations, number of rows, duration and whether answers are free-entry numeric or multiple choice (if applicable).
- Preview generated questions with answer key **in admin only**, regenerate and validate before publishing.
- Store generator version, random seed, question order, correct answers in protected storage, and immutable delivered paper snapshot per official attempt.
- Add unit/property-based tests for mathematically correct answers and level-specific rule constraints.
- Do not expose solution keys or generator seeds to the student's browser while an exam is in progress.

### 4.4 Student management and bulk CSV upload

- Downloadable template, sample file, drag-and-drop CSV import, encoding/header validation, duplicate detection and invalid-row reports.
- Preview rows **before import**, then atomic or chunked import with idempotency and summary: created/updated/skipped/failed.
- Clear decision on identity matching (student ID/external ID/email), duplicate handling, and rollback procedure.
- Create unique login IDs; secure temporary password/invite provisioning; optional printable/downloadable credentials with admin-only access and secure handling.
- Student list with filters, assigned level, account status, bulk export and account disable/reset.

### 4.5 Exam creation and scheduling

- Exam metadata: name, level, mode (practice/official), question count, generator rule version, duration, total marks, availability start/end, publish status.
- Lifecycle: draft → validated → scheduled/published → open → closed → archived; preserve historical exam configs after attempts start.
- Start windows up to **five days**, subject to D05 clarification; store all timestamps in UTC and display local time zones.
- Eligibility based on student/level/enrollment, attempt policy and availability window enforced server-side.
- Student sees instructions and **“Are you ready?”** confirmation; clock starts only on accepted server-side start event.
- Exam timer survives refresh; auto-submit at deadline via backend-controlled finalization, not solely browser timers.

### 4.6 Student exam-taking experience

- Large readable text, one-question or paginated layout decision, clear numeric keypad/answer input, question navigation and answer-status indicator.
- Autosave answers with clear saved/unsaved/offline state. Resume within the allowed attempt only; define reconnect and stale-session behavior.
- Practice and official modes share consistent UI but different result/attempt policies.
- Submit confirmation and clear final-state behavior; prevent accidental double submission.
- Exam status: eligible → ready → in_progress → submitted/auto_submitted/expired (plus audited exception state if approved).
- Never promise that disabling copy/paste, full-screen or tab-switch monitoring prevents cheating. If requested later, document limitations and accessibility impact.

### 4.7 Practice mode

- Practice exam matches official interface but clearly says **Practice**.
- Separate practice attempts/results; unlimited vs capped attempts is a pending product decision.
- Practice attempts never affect the official leaderboard or official result.
- Practice score and feedback shown immediately where allowed.

### 4.8 Results, scoring and leaderboard

- Student result: total questions, answered, skipped, correct, incorrect, percentage/marks, elapsed time, start/submit timestamps, status, and any review information approved for release.
- Verify invariants: `answered = correct + incorrect`; `total = answered + skipped` for simple single-answer questions; document alternative question formats if introduced.
- Official score calculated server-side from the saved paper snapshot and answer submissions.
- Admin can filter/search/export results by exam, level, date, student and status; privacy-aware exports.
- Admin-only **per-exam leaderboard** with rank, candidate, correct count/score and completion time, with explicit tie-break decision (D04). Define whether absences and invalidated attempts are excluded.
- Store result calculation version and audit rescores/corrections.

### 4.9 Phase 1 suggested data entities (not final SQL)

- `profiles`, `students`, `levels`, `question_rule_sets`, `exams`, `exam_papers`, `paper_questions`, `exam_assignments`/`enrollments`, `exam_attempts`, `attempt_answers`, `exam_results`, `csv_import_jobs`, `audit_events`.
- Use UUID primary keys plus unique human-readable student ID; created/updated metadata; explicit foreign keys and indexes.
- Reserve stable object boundaries for Phase 2 tenant IDs, but **do not invent multi-tenant access flows in Phase 1**.
- Protect answers and credentials; audited server functions for starting/submitting/finalizing attempts; transactional safeguards for retries.

### 4.10 UI screens to review before building

**Admin:** Login → Overview → Students → Import preview/report → Levels → Generator rules/preview → Exams → Create/Edit/Schedule → Exam detail → Attempts/results → Leaderboard → Settings.

**Student:** Login → Dashboard (assigned level, available exams) → Practice / Official exam → Instructions → Are you ready? → Exam workspace → Submit / Timeout → Summary → History.

For each screen define empty/loading/error states, mobile view, back navigation, permissions and success feedback. Prepare low-fidelity flows before visual design and implementation.

## 5. Phase 1 implementation milestones and approval gates

| Gate | Deliverable | Required review |
|---|---|---|
| G0 | `plan.md`, feature inventory, discrepancies, open decisions | Owner accepts phase boundaries and resolves critical decisions. |
| G1 | User journeys, wireframes, routes and permission matrix | Owner signs off all student/admin paths and edge cases. |
| G2 | ERD, SQL migrations, RLS, auth strategy and question rules | Review permissions, scoring, test cases and future migration. |
| G3 | Student management + safe import + account provisioning | Verify valid/invalid/duplicate CSVs and secure logins. |
| G4 | Generator + exam configuration + scheduling | Verify arithmetic correctness, time-window boundary cases and rule versions. |
| G5 | Practice/official attempts, timer, save/resume and scoring | Simulate refresh, network drops, expired exams and duplicate submissions. |
| G6 | Reports, leaderboard, admin QA and cross-device E2E testing | Confirm rank rules, visibility and result accuracy. |
| G7 | Security/performance review, backup, restore, docs, UAT, release | Human signs Phase 1 acceptance checklist; tag immutable release. |

**STOP after G7.** Do not start Phase 2 automatically. Any scope request belonging to Phase 2 must be logged to backlog and explicitly deferred.

## 6. Phase 1 test/acceptance matrix

- Math correctness over large generated samples; invalid generator configuration rejected.
- Level eligibility, question count and scoring across each enabled level.
- CSV import: 0 rows, 1 row, 10k rows (performance target to confirm), malformed rows, duplicates, retry/idempotency, partial failure.
- Credential uniqueness, password change, account disable, failed login, role isolation.
- Exam opens/closes correctly at UTC boundaries; five-day limit validated; student cannot start twice when not allowed.
- Timer, autosave, refresh, back navigation, multiple tabs/devices, disconnect/reconnect and deadline behavior.
- Concurrent submissions and timed-out attempts finalize exactly once.
- Correct/incorrect/skipped totals and elapsed-time calculations reconciled with server records.
- Practice never appears in official rankings.
- Leaderboard ties and exclusions test cases documented.
- Students cannot read peers' data, admin-only answer keys or protected result data.
- Accessibility keyboard testing, low-bandwidth UX, phone/tablet/desktop layouts, and documented data backup/restore rehearsal.

## 7. Phase 1 closeout — mandatory history and handoff package

Create and maintain the following **inside Project 1**, commit all files to Git, and include a frozen ZIP export for long-term portability:

```text
handoff/phase1-v1.0.0/
  00_READ_ME_FIRST.md             # What exists, works, and does not
  01_PRODUCT_REQUIREMENTS.md
  02_DECISION_LOG.md              # D01..Dn with final decisions and reasons
  03_ARCHITECTURE.md              # versions, diagrams, dependencies
  04_UI_ROUTES_AND_FLOWS.md
  05_DATABASE_SCHEMA.md           # tables, constraints, indexes, triggers
  06_RLS_AND_ROLE_MATRIX.md
  07_AUTH_CREDENTIAL_STRATEGY.md  # never actual passwords
  08_EDGE_FUNCTIONS_AND_APIS.md
  09_QUESTION_GENERATOR_SPEC.md   # rules, versions, examples
  10_EXAM_LIFECYCLE_AND_SCORING.md
  11_TEST_REPORT.md               # results, known failures
  12_KNOWN_ISSUES_AND_BACKLOG.md
  13_PHASE2_ARCHITECTURE_RFC.md
  14_PHASE2_MIGRATION_RUNBOOK.md
  15_OPERATIONS_DEPLOYMENT.md
  16_CHANGELOG_AND_RELEASE.md
  supabase/migrations/            # complete ordered SQL migration history
  supabase/seed.sql               # synthetic demo data only
  schema_snapshot.sql             # reproducible schema-only snapshot
  export_manifest.json           # tables/versions/checksums/counts
  .env.example                    # names and descriptions, NEVER secrets
```

Also record Git commit/tag, dependency lockfile, Supabase CLI version, migration checksums, feature flags, storage buckets/policies, Auth configuration to recreate, cron jobs, Edge Function names, environment variable names, and test fixtures. Do not commit production user data or token values to Git.

**Critical history rule:** A conversational summary is insufficient. Implementation history, decisions and migration scripts must exist as repo files and be verifiable by a fresh engineer or AI assistant with no access to prior chats.

## 8. Phase 2 — Multi-Organization Expansion (Project 2 ONLY)

### 8.1 Starting conditions

- Explicit owner approval of Phase 1 release/handoff.
- New repo/project initialized from `phase1-approved-v1.0.0` codebase and handoff package.
- New Supabase project set up with separate URL/keys/secrets, Auth config, storage and function deployments.
- Make a **staging-only migration rehearsal**, compare record counts and permissions, then seek approval for any real migration.
- Create new Project 2 `plan.md` and `migration-review.md` before writing Phase 2 code.

### 8.2 Organizations and user roles

- Organizations: platform owner, schools, institutes and franchises. Define parent-child organization relationships only after confirming the intended hierarchy.
- Roles: `platform_admin`, `org_admin` (school/institute/franchise admin), `student` (the owner's requested phase 2 roles); don't create extra roles without approval.
- Platform admin can onboard/manage organizations and view authorized cross-org reports.
- Organization admin can manage only their organization's permitted students, papers, schedules, enrollment and commissions.
- One student may belong to one or multiple organizations only if explicitly decided; model memberships rather than embedding a single immutable organization on the user account where necessary.
- Strict, tested org-level RLS and role checks on all database views/functions/storage paths.

### 8.3 Multi-institution exams

- Paper sets per institution, different exam time windows and durations per organization.
- Institution-level assignment of questions/papers and scheduling without mutating another institution's published exam.
- Per-organization exam eligibility, participant reports and CSV exports.
- Shared global exam identity vs separate organization exam instances requires explicit design choice.

### 8.4 Payments and registration

- **Student account registration remains FREE**; an **exam enrollment fee may apply**. Do not charge merely to create an account unless requirements change.
- Optional exam fee, discount/coupon, free or sponsored enrollment and administrator-created enrollment.
- Payment gateway integration with secure server-side payment initiation, signed webhook verification, idempotency, refunds and reconciliation.
- Do not grant paid exam access on browser redirect alone. Paid enrollment occurs only after verified success or an audited authorized waiver.
- Coupon support assumed provisionally from requirement #6 ('couple support'); verify before implementing.
- Coupon limits: flat/percentage, validity, permitted organizations/exams, usage limit, concurrency handling, audit trail.

### 8.5 Commissions and settlements

- Configure commission formula per organization (fixed amount/percentage), applicable base (paid participants? exam fees net of discounts/refunds?), effective date, and permission to override.
- Append-only commission ledger: earned, pending, payable, paid, adjusted/reversed.
- Admin sees calculations, filters, exports, per-exam/org totals and settlement status.
- Never conflate a displayed estimate with money actually paid; track payout status separately.
- Refunds/cancellations/reversals must not duplicate or silently erase ledger history.

### 8.6 WhatsApp and email

- Approved WhatsApp Business API templates, explicit messaging opt-in, transactional email provider.
- Events: registration confirmation (free), exam enrollment/payment, exam schedule, reminders and result availability.
- Queue/retry/idempotency, delivery logs, opt-outs and template localization.
- Secrets remain backend-only. Respect age-appropriate contact/guardian communications where required.

### 8.7 Phase 2 acceptance gates

P2-G0: Approved inheritance/migration plan.  
P2-G1: Organizations/roles/RLS validated.  
P2-G2: Institution-specific exam assignments and schedules validated.  
P2-G3: Free registration + optional paid enrollment + coupon flow validated.  
P2-G4: Commission ledger/reconciliation validated.  
P2-G5: Messaging and reporting validated.  
P2-G6: Security, UAT, backups/restore and production readiness approved.

## 9. Supabase migration to a new project: safe procedure

1. Freeze Phase 1 release and tag code; confirm migrations can rebuild a clean schema.
2. Back up schema **and** authorized data separately, including policies, triggers, functions, indexes and relevant storage configuration.
3. Create a new Supabase project with separately managed secrets; never paste project/service keys into docs.
4. Apply ordered, versioned SQL migrations in staging. Validate compatibility with the target Supabase version.
5. Configure Auth providers, templates/SMTP, redirects, buckets/policies, database extensions, cron jobs, secrets and Edge Functions explicitly; a SQL schema dump does **not** restore every managed setting/service automatically.
6. If existing real students must move, design a secure Auth-user migration and record-mapping plan; **password hashes and Auth identities cannot be assumed portable by a simple public-table CSV export**. Prefer platform-supported Auth migration methods or planned password reset/re-invitation where required.
7. Migrate permitted application data respecting FK dependency order; preserve UUID mapping and historical results; avoid copying production PII into casual staging.
8. Recalculate/check counts, sums, referential integrity, sample paper snapshots, leaderboard results, RLS policy tests and Edge Function behavior.
9. Run a documented dry run and rollback test, then approve cutover. Keep Phase 1 environment untouched until verification is complete.
10. Update Project 2 `.env` locally/secure CI only, deploy and confirm isolation between Supabase projects.

**Phase 2 should extend a newly created project safely, not rewrite the existing Phase 1 production database by default.** Data migration is contingent on D10.

## 10. Security / reliability controls

- Supabase Auth, hashed credentials, session expiration, server authorization and rate limits.
- RLS for every student/organization-owned table; admin privileges verified server-side, not from editable frontend fields.
- Private question keys and answer snapshots; no service-role secret inside React bundles.
- Server timestamps, attempts locked at cutoff, request idempotency and auditing.
- Backups, tested restores, observability/error logs without sensitive answer/password leakage.
- CSV injection protection on export, CSV upload size limits and malicious input validation.
- Accessibility for keyboard and assistive technology; avoid coercive full-screen constraints without an approved fallback.

## 11. Out-of-scope and non-goals

**Not Phase 1:** multiple organizations, franchises, platform admin, commission calculation, student self-checkout/payments, coupons, WhatsApp/email integrations, tenant-specific papers/schedules. These belong to Project 2.

**Not promised without separately approved scope:** webcam/video proctoring, guaranteed cheat prevention, AI-generated natural-language reasoning, certificates, mobile apps, SMS, automated bank payouts, recurring subscriptions, parent portal.

## 12. First action and approval format

**The next action is REVIEW, not coding.**

Review in this order:
1. Resolve D01–D14, especially level numbering, generator rules, validity, rank ties, and free-registration/paid-exam distinction.
2. Review Phase 1 admin/student user journeys and screen list.
3. Approve data entities, auth/RLS approach and exam attempt state machine.
4. Approve release/handoff structure and new-project strategy.
5. Respond `APPROVE PHASE 1 PLAN` or provide edits. Only then begin G1; request separate approval at each gate.

### Phase handoff completion definition

Phase 1 is complete only when the features pass acceptance tests, owner signs off, Git release tag exists, the handoff documentation bundle is complete, migrations rebuild a new Supabase staging project successfully, and a new engineer/AI project can implement Phase 2 **without relying on prior chat history**.
