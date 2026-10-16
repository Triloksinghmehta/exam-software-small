# Roadmap

Each gate ends with your manual approval. No gate starts before the previous is approved.

| Gate | What | Output you review | Status |
|---|---|---|---|
| G0 | Questions + plan | plan.md, open-questions.md, question-rules.md | ✅ approved 2026-10-16 |
| G1 | Simple screen designs (wireframes) for every student/admin screen | clickable wireframe page | ✅ approved 2026-10-16 |
| G2 | Database, security rules, question/scoring spec | database-schema.md, auth-rls-matrix.md, first migrations | 🟨 ready for review |
| G3 | Students: login, add/edit, CSV import | working admin student pages | ⬜ |
| G4 | Question generator + exam creation | sample papers per level, generator tests | ⬜ |
| G5 | Taking exams: practice + official, timer, autosave, results | working student flow | ⬜ |
| G6 | Results, leaderboard, export, phone/tablet/desktop testing | test report | ⬜ |
| G7 | Security check, docs, handoff bundle, release tag — **Phase 1 STOP** | handoff/phase1-v1.0.0/ | ⬜ |
| P2 | Phase 2 in new project (only after your approval) | — | ⬜ |

## UI rule (all gates)
Simple and straightforward: big buttons, one main action per screen, plain words, no clutter; works on phone first.

## Log
- 2026-10-16 — G0 started; owner answered Q01–Q23; reference generator analysed; Supabase project connected (empty).
- 2026-10-16 — Level 9 removed (levels 0–8); login ID prefix + anti-cheat switches go in Admin → Settings.
- 2026-10-16 — Mixed questions use BODMAS.
- 2026-10-16 — **G0 APPROVED** by owner. G1 (screen designs) started.
- 2026-10-16 — **G1 APPROVED**. G2 written: 4 migrations, security rules, ADR-0001..0004; dry run on Supabase passed 24/24 checks (rolled back, DB still empty).
