# Login & Security Rules (G2)

## Login
- Students type **Student ID + password**. The app turns the ID into a hidden email login (`sai260001@students.local`) for Supabase Auth. Students never see or need an email.
- Admins log in with their real email.
- Passwords are stored only by Supabase Auth (hashed). Temp passwords are shown once in the import download, then the student must change them.
- New students are created by an admin-only server function (the browser can't create logins).
- "One login at a time": each login claims the account; exam actions from an older login fail with `SESSION_REPLACED`.

## Who can do what (enforced in the database)
| Data | Not logged in | Student | Admin |
|---|---|---|---|
| settings | – | read | read, edit |
| profiles | – | own | all |
| levels | – | read | read, edit |
| students | – | own row (read only) | read, edit; create via server function |
| exams | – | published/closed exams of **own level** | everything |
| attempts | – | own (read only) | read |
| attempt_questions (answer key) | – | **never directly** | read |
| attempt_events, audit_events | – | – | read |
| leaderboard | – | only if admin switched it on, own level | always |

## Exam actions (server functions, the only way students touch exam data)
| Function | Does |
|---|---|
| `begin_attempt(exam)` | Checks level, open window, tries left; starts or resumes |
| `get_paper(attempt)` | Questions **without answers** + saved answers + server time |
| `save_answers(attempt, list)` | Autosave; refused after time over |
| `submit_attempt(attempt)` | Scores on server; safe to press twice |
| `get_result(attempt)` | Score + correct answers, only after submit |
| `log_event(attempt, kind)` | Anti-cheat log; can auto-submit |
| `get_leaderboard(exam)` | Ranked list |

## Tested (dry run on Supabase, rolled back — `supabase/tests/g2_dry_run.sql`)
All 24 checks passed on 2026-10-16: ID made as SAI260001; duplicate student blocked; 6-day window blocked; resume returns the same attempt; other-level exam refused; paper hides answers; student can't read the answer key, change own level or own score, or see other profiles; old login blocked after a new one; score 2 correct / 1 wrong / 1 skipped (decimal 0.30 = 0.3 counted correct); second submit gives the same result; retake refused; classmate can't read another's result or attempts; leaderboard hidden until the admin turns it on; started exam can't be edited; expired attempt auto-submitted; not-logged-in users blocked.
