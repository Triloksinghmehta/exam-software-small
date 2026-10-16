# Roadmap

Each gate ends with your manual approval. No gate starts before the previous is approved.

| Gate | What | Output you review | Status |
|---|---|---|---|
| G0 | Questions + plan | plan.md, open-questions.md, question-rules.md | ✅ approved 2026-10-16 |
| G1 | Simple screen designs (wireframes) for every student/admin screen | clickable wireframe page | ✅ approved 2026-10-16 |
| G2 | Database, security rules, question/scoring spec | database-schema.md, auth-rls-matrix.md, first migrations | ✅ approved + applied 2026-10-16 |
| G3 | Students: login, add/edit, CSV import | working admin student pages | ✅ approved 2026-10-17 |
| G4 | Question generator + exam creation | sample papers per level, generator tests | ✅ approved 2026-10-17 |
| G5 | Taking exams: practice + official, timer, autosave, results | working student flow | ✅ approved 2026-10-17 |
| G6 | Results, leaderboard, export, phone/tablet/desktop testing | test report | ✅ approved 2026-10-17 |
| G7 | Security check, docs, handoff bundle, release tag — **Phase 1 STOP** | handoff/phase1-v1.0.0/ | 🟨 bundle written; waiting for owner sign-off + open items (see handoff 12) |
| P2 | Phase 2 in new project (only after your approval) | — | ⬜ |

## UI rule (all gates)
Simple and straightforward: big buttons, one main action per screen, plain words, no clutter; works on phone first.

## Log
- 2026-10-16 — G0 started; owner answered Q01–Q23; reference generator analysed; Supabase project connected (empty).
- 2026-10-16 — Level 9 removed (levels 0–8); login ID prefix + anti-cheat switches go in Admin → Settings.
- 2026-10-16 — Mixed questions use BODMAS.
- 2026-10-16 — **G0 APPROVED** by owner. G1 (screen designs) started.
- 2026-10-16 — **G1 APPROVED**. G2 written: 4 migrations, security rules, ADR-0001..0004; dry run on Supabase passed 24/24 checks (rolled back, DB still empty).
- 2026-10-16 — **G2 APPROVED**; migrations applied to Supabase. ECC + ponytail plugins enabled for the project (.claude/settings.json).
- 2026-10-16 — G3 built: student login + forced password change, admin login, students list/add/edit/disable/reset, CSV import, settings. Tested in browser (see docs/qa-test-cases.md).
- 2026-10-17 — **G3 APPROVED**; code pushed to GitHub (private). G4 built: question generator (10 operations, friends/direct, BODMAS, exact decimals), exams list/create/edit/publish/close, level default rules editor, sample paper preview. 35 generator tests pass (10,000 questions per rule).
- 2026-10-17 — **G4 APPROVED**. G5 built: start-attempt Edge Function, student home (exams/practice/tries), instructions + Are you ready, exam screen (server timer, autosave every 2 s + offline queue, resume after refresh, submit/auto-submit), result with per-question review, My results, anti-cheat (fullscreen, leave-screen log, copy/paste block, one login). Tested end to end.
- 2026-10-17 — **G5 APPROVED**. G6 built: admin results table (with absent students and left-screen counts), CSV download, leaderboard with show-to-students switch, student leaderboard page. Fixed bug: database error messages showed as [object Object].
- 2026-10-17 — UI redesign v2 (owner: first version looked generic/AI-made): ink navy + ivory + brass, serif headings (Fraunces), flat hairline panels, connected stats strip, abacus logo, exam screen without site header. Earlier: icons instead of emoji.
- 2026-10-17 — UI redesign (dashboard look, icons, no emoji). Bug fixed: failed paper creation no longer leaves an open attempt.
- 2026-10-17 — **G6 APPROVED**. G7 work: security review (1 fix, 1 index), database load test (500 students) passed, handoff bundle v1.0.0-rc written. NOT tagged yet: needs owner sign-off (docs/phase1-acceptance.md) and the open items in handoff/12.
