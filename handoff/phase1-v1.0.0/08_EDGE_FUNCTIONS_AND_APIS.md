# Edge Functions and database API inventory

## Edge Functions (Deno, `supabase/functions/`)
| Function | Called by | JWT | Does |
|---|---|---|---|
| `admin-students` | admin browser | required + `is_admin()` | `create` (1-50 rows, checks every row, makes Auth user + profile + student, undoes on failure), `reset_password` |
| `start-attempt` | student browser | required | runs `begin_attempt` as the student, then makes the student's paper once with the generator and stores it (single insert) |

Shared code: `_shared/generator.ts` (questions), `_shared/student-row.ts` (CSV/student validation; also used by the browser).

## Database functions (called as `supabase.rpc`; all SECURITY DEFINER with `search_path=''`)
| Function | Caller | Purpose |
|---|---|---|
| `is_admin()`, `my_level()` | any logged in user | helpers used by RLS and screens |
| `claim_session()` | student | newest login takes the session |
| `mark_password_changed()` | student | clears must-change-password |
| `begin_attempt(exam)` | student (via start-attempt) | eligibility, window, tries; creates or resumes the attempt; sets the deadline |
| `get_paper(attempt)` | student | questions without answers + saved answers + server time |
| `save_answers(attempt, list)` | student | autosave; returns -1 if time is over |
| `submit_attempt(attempt)` | student | scores once; safe to repeat |
| `get_result(attempt)` | student (own) / admin | summary + per-question review, finished attempts only |
| `log_event(attempt, kind)` | student | anti-cheat log; may auto-submit |
| `get_leaderboard(exam)` | admin / student when switched on | ranked list |

Not callable by users: `_finalize`, `_my_open_attempt`, `_check_session`, `_grace`, `next_student_code`, `finalize_expired` (cron, every minute).

## Error codes (exception messages)
`SESSION_REPLACED, NOT_ALLOWED, NOT_FOUND, NOT_OPEN_YET, CLOSED, NO_TRIES_LEFT, PAPER_NOT_READY, PAPER_RULES_INVALID, NOT_FINISHED, EXAM_LOCKED`. Plain-language texts: `web/src/lib/supabase.ts`.

## Direct table access (RLS) used by the app
`students`, `exams`, `levels`, `settings`, `attempts` (select only), `profiles` (select only). Writes: admin on `students` (edit/disable), `exams`, `levels`, `settings`.
