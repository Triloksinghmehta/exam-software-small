# Exam lifecycle and scoring

## Exam
`draft` → `published` → `closed` (can be reopened). Students see published/closed exams of their level. "Open now" = published and `starts_at ≤ now ≤ ends_at`. The window is at most 5 days (database check). Once the first attempt exists, only the name, a later `ends_at`, the status and the leaderboard switch can change (trigger `EXAM_LOCKED`).
"Close now" stops new starts; students already writing continue until their own deadline.

## Attempt
1. The student presses Start → `begin_attempt` creates the attempt (`deadline_at = now + duration`; the full duration even if started just before closing, ADR-0004) → `start-attempt` stores the paper.
2. While `in_progress`: `get_paper` (resume), `save_answers` (accepted until deadline + 10 s).
3. It ends as `submitted` (student pressed Submit) or `auto_submitted` (time over, too many screen leaves, or the cron job every minute). Exactly once (row lock + status check).
4. "Absent" = no attempt row.

## Scoring (server only)
1 mark per question, no negative marking, skipped = 0. Correct = the student's answer equals the stored answer as an exact `numeric` (0.30 = 0.3). `answered = correct + wrong`, `total = answered + skipped`. `submitted_at` is capped at the deadline. Percent = correct / total, 1 decimal.

## Practice vs official
Same screen, with a yellow PRACTICE band. Practice tries = `attempts_allowed` (default 1). Practice never appears in the leaderboard (the function ignores it) and has its own tab in My results.

## Leaderboard
Official exams, best attempt per student. Order: more correct → less time taken → earlier submit; equal on all = same rank. Visible to students only if `exams.leaderboard_public` is on.
