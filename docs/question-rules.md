# Question Rules (draft v0.1 — from `referance/index.html` analysis)

Status: DRAFT for G2 approval. Source: reference generator `generateQuestionForRule()` (referance/index.html ~L1555–2208) and `levelSyllabus` (~L1055).

## 1. How the reference works
- An exam ("campaign") stores `blueprints`: `{ bud: [...rules], lvl1: [...], ... lvl8: [...] }` (Level 0 key = `bud`).
- Each rule = `{ operation, digits, rows, quantity }`. Paper = for each rule, `quantity` questions. Total marks = total questions (1 mark each).
- Generation is rejection sampling: random numbers until constraints pass (max 500 tries, then a fallback).
- Display is vertical (abacus style): numbers stacked, operator on the left, decimals aligned.

### Rule fields
| Field | Format | Meaning |
|---|---|---|
| `operation` | `addition`, `subtraction`, `add_sub` (default), `multiplication`, `division`, `mixed`, `table`, `decimal_addition`, `decimal_subtraction`, `decimal_add_sub`, `decimal_multiplication`, `decimal_division` | Question type |
| `digits` | `"2d1d"` = first row 2 digits, other rows 1 digit; `"1b2a"` = 1 digit before / 2 after decimal point; `"1b2a_1b1a"` = first row / other rows; table: `"2_100"` = table range | Size of numbers |
| `rows` | integer | Rows (operands) per question; table: sequence length (min 3) |
| `quantity` | integer | Questions of this rule per paper |

### Per-operation behaviour
| Operation | Generation | Constraints |
|---|---|---|
| addition | row1 d1 digits, others d2 | Level 0: each step must be "direct" (no carry, no use of 5-bead formula) |
| subtraction | same | running total never < 1 (Level 0: ≥0 and direct, no borrow / no 5-bead) |
| add_sub | each row randomly + or − | as above; result ≥1 (Level 0: 0–9) |
| multiplication | chain of `rows` numbers | Level 0: answer 0–9 |
| division | dividend d1 digits ÷ divisors d2 digits, built as quotient×divisors | Always exact (integer quotient) |
| mixed | ≥5 rows, must use all of + − × ÷, left-to-right | × uses 2–9; ÷ only by exact divisor 2–20; no negatives |
| table | sequence n×1 … n×k with one `?` (never first/last) | n in range |
| decimal_* | integers scaled by 10^decimals | Answer rounded to max decimals |

### Syllabus in the reference (levels 0–8 only)
| Level | Content |
|---|---|
| 0 | Direct add/sub (no carry, no formula) |
| 1 | Small friend, big friend, combination |
| 2 | ± 2-digit 3 rows, ± 3-digit 2 rows, 1×1 multiply, tables 2–100 |
| 3 | ± 2d 5r, 3d 3r, 4d 2r, 2×1 multiply, tables 2–300 |
| 4 | ± 2d 7r, 3d 4r, 4d 3r, 3×1, tables 2–500 |
| 5 | ± 2d 10r, 3d 5r, 4d 4r, 5d 2r, 2×2, 2÷1, tables 2–1000 |
| 6 | ± 2d 15r, 3d 6r, 4d 5r, 5d 3r, 2×3, 3÷1, tables 2–2000, decimal |
| 7 | ± 2d 20r, 3d 7r, 4d 6r, 5d 4r, 3×3, 4÷1, tables 2–3000, decimal |
| 8 | ± 2d 25r, 3d 8r, 4d 7r, 5d 5r, 3×4, 4÷2, tables 2–5000, decimal |

Level 9 removed by owner (2026-10-16): levels are **0–8**.
Admin operation dropdown (owner-approved): Addition, Multiplication, Division, Addition & Subtraction, Decimal Addition, Decimal Multiplication, Decimal Division, Decimal Addition & Subtraction, Table, Mixed. (Plain subtraction / decimal subtraction exist in reference code but are not in the dropdown.)
Level 1: every step must use a small-friend (5) or big-friend (10) formula.

## 2. Problems found in the reference (we will fix, not copy)
| # | Severity | Problem | Fix in our build |
|---|---|---|---|
| R1 | Critical | Questions **and answers** generated in the browser; student can read answers in DevTools | Generate on server (Postgres function); browser only receives question text |
| R2 | Critical | Score computed in the browser and written directly to DB; a student can post any score | Server scores from stored paper |
| R3 | Critical | Submission/"already submitted" check and update by `username` from localStorage — anyone can mark/overwrite another student | Auth user id + RLS + server function |
| R4 | High | Timer is client only; refresh restarts the test and generates a new paper | Server `deadline_at`; paper stored once per attempt |
| R5 | High | Decimal answers compared with `===` on floats (e.g. 0.1+0.2) → correct answers marked wrong | Integer math on scaled values; compare as `numeric` |
| R6 | High | After 500 failed tries, fallback silently **breaks level rules** (e.g. carry at Level 0); `mixed` fallback is a fixed question | Fail the rule validation at admin preview instead; no silent fallback |
| R7 | Medium | Level 1 "small/big friend" not enforced — Level 1 just gets plain add_sub | Need owner definition (Q02a) |
| R8 | Medium | `mixed` is evaluated left-to-right, not BODMAS; must be stated to students | Decided: use BODMAS (2 + 3 × 4 = 14); instructions say so |
| R9 | Medium | Division pads with leading zeros ("05"); level from email regex supports single digit only | Clean display; level from DB |
| R10 | Low | Answers not autosaved; network failure at submit loses the attempt (error only logged) | Autosave each answer; retry submit |

## 3. Our rule format (v1, G2)
Each exam / level has a list of rules:
```json
{"operation": "add_sub", "digits": [2, 2], "rows": 5, "quantity": 4}
```
| Field | Meaning |
|---|---|
| `operation` | addition, multiplication, division, add_sub, decimal_addition, decimal_multiplication, decimal_division, decimal_add_sub, table, mixed |
| `digits` | [first row, other rows] digit counts (whole-number part). Multiplication `[2,1]` = 2-digit × 1-digit; division `[4,2]` = 4-digit ÷ 2-digit |
| `decimals` | [first row, other rows] digits after the point (decimal_* only) |
| `rows` | numbers per question (table: sequence length) |
| `quantity` | questions of this rule in the paper |
| `range` | table only: [min, max] table number |
| `formula` | add/sub only: `direct` (Level 0: no carry, no 5-bead) or `friends` (Level 1: each step uses a small/big friend) |

Rules that apply to all questions: answers are never negative; division is always exact; mixed uses BODMAS and every intermediate result is a whole, non-negative number; decimal answers are compared exactly (0.30 = 0.3).
Defaults for each level are in migration `20261016000004_levels_and_cron.sql` (quantities are starting values; the admin can edit them).

## 4. Implementation (G4)
- One TypeScript module `generator.ts`, used by the server (real papers) and the admin preview.
- If a rule can't be satisfied, it is rejected with a clear message at preview or publish time. There is no silent fallback.
- Tests: ≥10,000 questions per rule, checking answer correctness and level constraints.
