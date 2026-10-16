# Open Questions & Decisions

Updated 2026-10-16 after owner answers. Labels: **Blocker** / **Decision** / **Nice-to-have**.

## Decided
| ID | Decision |
|---|---|
| Q01 | Levels **0–8 (9 levels)**. Owner removed Level 9 on 2026-10-16 (reference syllabus has 0–8). Overrides SAI proposal's 1–9. |
| Q03 | Exam has an admin-set **validity**: open from `starts_at` until `ends_at`, max 5 days. |
| Q04 | 1 mark per question, **no negative marking**, skipped = 0. |
| Q05 | Tie-break: score desc → time taken asc → submit time asc → shared rank. |
| Q06 | **No retakes** by default. |
| Q07 | Every student gets a **new generated paper** (same rules, different numbers). |
| Q08 | Numeric entry only. |
| Q09 | **Scrolling list** of all questions; Tab / Enter moves to next answer (as in reference). |
| Q10 | Student sees own result **immediately on submit** (incl. correct answers). Leaderboard visible to students only after admin approves. |
| Q11 | Practice attempts: admin sets limit per practice exam; **default 1**. |
| Q12 | Leaderboard: admin only; students too once admin approves (per exam). |
| Q15 | Phase 1: admin shares credentials manually (download list). Phase 2: email/WhatsApp. |
| Q16 | Student fields: **name, father's name, DOB** (+ level, auto ID). |
| Q18 | "Couple" = **coupon** → Phase 2. |
| Q19 | Phase 1 is dev/test data only → Phase 2 starts **clean** (no student data migration; schema + rules carried over). Revisit if real exams run in Phase 1. |
| Q20 | India only: store UTC, show IST. Timezone kept in code (setting), not in UI. |
| Q21 | Certificates → Phase 2 backlog (remind owner at P2-G0). |
| Q22 | Unknown → design for 5,000 students / 500 concurrent; load-test at G6. |
| Q02 | Level 9 removed (see Q01). |
| Q02a | Level 1: every question must use a small/big friend formula. |
| Q02d | Admin operation list (owner screenshot): Addition, Multiplication, Division, Addition & Subtraction, Decimal Addition, Decimal Multiplication, Decimal Division, Decimal Addition & Subtraction, Table, Mixed. |
| Q02b | Mixed questions use **BODMAS** (× ÷ before + −): 2 + 3 × 4 = 14. Differs from reference (left-to-right). Generator must keep every step a whole, non-negative number. |
| Q13 | Login ID default `SAI260001` (prefix + 2-digit year + 4-digit number); prefix editable in Admin → Settings. |
| Q14 | CSV: bad/duplicate rows shown red, good rows imported, bad rows downloadable. Duplicate = name + father's name + DOB. |
| Q17 | All anti-cheat items approved; each one is an on/off switch in Admin → Settings (auto-submit after N tab switches default off). |
| Q23 | Supabase project `sehspievdmlwlltrbztl` ("EXAM Project", ap-southeast-1 Singapore, empty). Frontend hosting still open (suggest Vercel/Netlify). |

## Still open
| ID | Label | Question | Default if no answer |
|---|---|---|---|
| Q02c | Decision | Default question count + time per level? | Admin sets per exam |

## Q17 note — what is realistic
No web app can stop a student using a phone/AI on a second device. What we can do:
1. Fullscreen request on start (desktop/Android; iPhone Safari doesn't support it) — leaving fullscreen is logged.
2. Tab switch / window blur logged with count + time; warning shown; admin sees "left exam 3 times".
3. Copy/paste/right-click/text-select disabled on questions (stops pasting into an AI chat on same device).
4. One active session per student; second login ends the first.
5. Questions unique per student (Q07) and short time limit — biggest real deterrent: abacus speed means no time to type into AI.
6. Optional: auto-submit after N tab switches (admin setting, default off).
Real prevention = supervised exam hall / proctor. Webcam proctoring is out of scope.
