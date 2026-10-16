# QA Test Cases & Results

## G2: Database security (dry run, rolled back): `supabase/tests/g2_dry_run.sql`
24/24 passed on 2026-10-16 (list in docs/auth-rls-matrix.md).

## G3: Students & login (2026-10-16, Chrome, desktop + 375 px phone)
| # | Test | Result |
|---|---|---|
| 1 | Validator unit tests (`web/src/student-row.test.ts`): dates, levels 0–8 only, duplicates | ✅ 6/6 |
| 2 | Admin login with email → Admin Home | ✅ |
| 3 | CSV with headers "Full Name, Father Name, DOB, Level" (any case) accepted | ✅ |
| 4 | CSV preview: missing name, bad date 31-02, level 12, duplicate in file → red rows with reasons; 3 good | ✅ |
| 5 | Import 3 → codes SAI260001..3, login list offered once | ✅ |
| 6 | Add student matching an existing name+father+DOB → "Already exists", no leftover login created | ✅ |
| 7 | Reset password → new password shown once, audit logged | ✅ |
| 8 | Student wrong password → "Wrong ID or password" | ✅ |
| 9 | Student first login → forced to set password; mismatch error; then Home with name, ID, level | ✅ |
| 10 | Student calls admin create function directly → 403 | ✅ |
| 11 | Student reads students table → sees only self | ✅ |
| 12 | Student tries to change level / settings / make self admin → no rows changed / 403 | ✅ |
| 13 | Phone width: no sideways scrolling | ✅ |
| 14 | Value "=cmd" in a CSV export is neutralised (CSV injection) | ✅ by code (csvCell); not opened in Excel |

Known gap: a blocked duplicate still uses up an ID number (SAI260004 was skipped). This is harmless, and IDs stay unique.
Not yet tested: a 10,000-row CSV (performance, planned for G6), and disabling a student who is logged in (they keep their session until it expires; checked again at exam start in G5).

## G4: Question generator & exams (2026-10-17)
| # | Test | Result |
|---|---|---|
| 1 | All 10 operations: 10,000 questions per rule, answer re-checked by an independent BigInt evaluator; no negatives; digit/decimal counts match | ✅ 35/35 |
| 2 | Level 0 every step direct; Level 1 every step uses a friend | ✅ |
| 3 | Mixed (5+ rows) always uses + − × ÷; BODMAS; whole numbers | ✅ |
| 4 | Default rules of levels 0–8 all produce full papers | ✅ |
| 5 | Impossible rule → clear error naming the rule (no silent fallback) | ✅ |
| 6 | Browser: create exam, level 3 defaults loaded (5 rules, 20 questions), preview shows answers | ✅ (spot-checked 70+59−46+52−36 = 99) |
| 7 | Publish without a name → "Please give the exam a name" | ✅ |
| 8 | 6-day window → "at most 5 days" (also enforced by database) | ✅ |
| 9 | Publish → status Open; Save / Unpublish / Close now shown | ✅ |
| 10 | Levels page: Level 1 preview uses friends; invalid rows blocked | ✅ |

Test data left in dev database: exam "Test Level 3 Exam" (open ~2 days), used for G5.

## G5: Taking exams (2026-10-17, Chrome desktop + 375 px phone)
| # | Test | Result |
|---|---|---|
| 1 | Home lists level-3 official exam (Start) + practice (3 tries left) | ✅ |
| 2 | Instructions → I'm ready → "Are you ready?" → Start → paper made on server (20 / 4 questions) | ✅ |
| 3 | Answers autosave ("✓ Saved"); refresh keeps answers and the timer keeps counting (00:45 after refresh) | ✅ |
| 4 | 1-minute practice: time over → auto-submitted, result 2 correct / 1 wrong / 1 skipped, matches hand check (BODMAS 44+5−8÷4×7 = 35; 23.25+92.10−65.70 = 49.65) | ✅ |
| 5 | Enter and Tab move to next answer; letters typed are ignored | ✅ |
| 6 | Submit popup shows "You left 18 questions empty"; manual submit → "Submitted by you" | ✅ |
| 7 | Leaving the screen → warning shown + recorded in database (leave_count 1, event left_screen) | ✅ |
| 8 | Paste blocked on the exam screen | ✅ |
| 9 | After official submit, Home shows "View result", direct start-attempt call → NO_TRIES_LEFT | ✅ |
| 10 | Practice tries count down (3 → 2 → 1); last result link shown | ✅ |
| 11 | Phone width: no sideways scroll on exam screen | ✅ |

Not yet tested: real offline (network unplugged) — code queues answers in browser storage and resends; full-screen on a real phone (automation can't grant it); iPhone Safari has no full-screen (exam still works). To check at G6 on real devices.

## G6: Results & leaderboard (2026-10-17)
| # | Test | Result |
|---|---|---|
| 1 | Admin results table: both students, score, wrong/skipped, time, status, left-screen count (3×, 1×) | ✅ |
| 2 | Leaderboard ranks 18/20 above 2/20; tie rule is in the database function (tested in G2) | ✅ |
| 3 | Switch ON → student sees "See leaderboard" on result and the ranking | ✅ |
| 4 | Switch OFF → student sees "The leaderboard is not available." | ✅ |
| 5 | Bug found & fixed: database errors displayed as "[object Object]" | ✅ fixed |

Test data note: the second attempt (SAI260002, 18/20) was inserted directly in the database to test ranking.
Still to do before G7: CSV download opened in Excel; 10,000-row CSV import; load test (500 students at once); real phone/tablet test; real network-off test; absent-student label after an exam closes.

## G7: Security review & load test (2026-10-17)
| # | Test | Result |
|---|---|---|
| 1 | Supabase security advisor: only intentional notes left (SECURITY DEFINER functions check their caller; counters table has no policy on purpose); leaked-password check is a dashboard setting (owner) | ✅ reviewed |
| 2 | Found & fixed: a disabled student with an exam already open could still save answers → `_check_session` now rejects them (migration 07) | ✅ fixed |
| 3 | Added index on `exams.created_by` (advisor) | ✅ |
| 4 | Database load test `supabase/tests/g7_load_test.sql`: 500 students × 30 questions at once, as each student with RLS on. Start+paper 0.8 ms each; open paper + 3 autosaves 1.5 ms per student; submit 0.7 ms each; leaderboard of 500 in 9 ms; cron closes 500 abandoned attempts in 76 ms; scoring check correct (7 of 30 as planned) | ✅ |
| 5 | Load test rolled back; dev database back to 3 students / 2 exams | ✅ |

Not covered: network/Edge Function/browser load, real devices, empty-project rebuild. See handoff 12.
