# Database Schema (G2)

Source of truth: `supabase/migrations/*.sql`. This page explains it in plain words.

| Table | What it holds | Key rules |
|---|---|---|
| `settings` | One row: student ID prefix (SAI), timezone, anti-cheat switches | Prefix 2–6 capital letters |
| `profiles` | One row per login: role `admin` or `student`, current session | Role set only by server |
| `levels` | Levels 0–8 with default question rules | Level must be 0–8 |
| `students` | Student code, name, father's name, DOB, level, active/disabled, must-change-password | Code auto-made (SAI260001); same name + father + DOB = duplicate (blocked) |
| `student_code_counters` | Last number used per year | Internal |
| `exams` | Name, official/practice, level, rules, duration, opens/closes, tries allowed, draft/published/closed, leaderboard switch | Open window ≤ 5 days; rules locked after first student starts |
| `attempts` | One try at an exam: start, deadline, submit time, status, scores, times left screen | One open try per student per exam; tries numbered 1,2,… |
| `attempt_questions` | The student's own paper: question, correct answer, student's answer | Students can't read this table (answer key) |
| `attempt_events` | Anti-cheat log (left screen, left fullscreen) | |
| `audit_events` | Admin actions log (imports, resets) | |

## Attempt life
`in_progress` → `submitted` (student pressed Submit) or `auto_submitted` (time over, too many screen leaves, or cron).
"Absent" = no attempt row. Score fields are filled exactly once, when the attempt closes.

## Timing
- `deadline_at = start + duration`, set by the server. A student who starts 2 minutes before closing still gets the full time (ADR-0004).
- Answers arriving up to 10 seconds after the deadline are accepted (network delay).
- Every minute a job closes attempts whose time ran out.

## Phase 2 extension points
- `org_id` (always empty now) on `students` and `exams`.
- Roles are stored as data (`profiles.role`), so new roles can be added.
- Rules live in the exams and levels tables, so they can be copied per organization.
- Payments will attach to a new `enrollments` table, kept separate from `attempts`.
