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
