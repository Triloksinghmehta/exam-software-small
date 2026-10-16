# ADR-0003: Generator in TypeScript on the server; answer keys only behind functions
Status: Accepted (G2, 2026-10-16)

**Decision:** the question generator is one TypeScript module. The `start-attempt` Edge Function runs it and stores the paper in `attempt_questions` in a single insert. Students read the paper only through `get_paper` (no answers) and `get_result` (after submit). The table has no student read rule.
**Why:** this fixes reference problems R1/R2 (answers and score in the browser). The same code serves the admin preview and is easy to unit-test. No seed is stored, because a known seed would let a student regenerate the answers from the public code.
**Rejected:** a generator written in SQL (hard to write and test the friend formulas and BODMAS in SQL); generating in the browser (anyone could read the answers).
**If generation fails:** nothing is saved (single insert). If the exam rules themselves are invalid, `start-attempt` deletes the empty attempt so the student keeps their try and no clock runs (found and fixed 2026-10-17 during UI testing). A temporary failure (insert error) leaves the attempt; a retry resumes it and builds the paper.
