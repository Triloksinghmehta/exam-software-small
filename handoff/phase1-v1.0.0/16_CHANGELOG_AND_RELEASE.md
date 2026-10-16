# Changelog

| Gate | Date | What |
|---|---|---|
| G0 | 2026-10-16 | Plan, 23 owner decisions, reference app analysed (10 problems found) |
| G1 | 2026-10-16 | Wireframes (16 screens), workflows |
| G2 | 2026-10-16 | Schema, RLS, exam functions, levels 0–8; 24 security checks passed |
| G3 | 2026-10-16/17 | Login, student management, CSV import, settings |
| G4 | 2026-10-17 | Question generator (10 operations), exams, level rules, preview |
| G5 | 2026-10-17 | Student exam flow, autosave, auto-submit, results, anti-cheat |
| G6 | 2026-10-17 | Admin results, CSV, leaderboard |
| G7 | 2026-10-17 | Security review, disabled-student fix, FK index, database load test, this bundle |

Release candidate: v1.0.0-rc (commit: see `git log -1`). The final tag `phase1-approved-v1.0.0` comes after owner acceptance.
Migrations in apply order: 01 schema, 02 rls, 03 exam_functions, 04 levels_and_cron, 05 grace_search_path, 06 next_student_code, 07 g7_hardening.
