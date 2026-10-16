# Phase 2 starting RFC (input for P2-G0; not an approved design)

Owner decisions so far: Phase 2 = separate repo from tag `phase1-approved-v1.0.0` + a new Supabase project; starts with a clean database (Q19); roles `platform_admin`, `org_admin`, `student`; free registration separate from paid exam enrollment; "couple support" means coupons.

## Extension points already in Phase 1
- `org_id` (nullable, unused) on `students` and `exams`.
- Roles are data (`profiles.role` has a check list that can be widened).
- Rules and papers belong to each exam, so organization-specific exams are copies, not edits.
- Attempts reference exams, not enrollments: add an `exam_enrollments` table between student and exam for paid access.
- `begin_attempt` is the single eligibility gate: add the enrollment/payment check there.

## Must be redesigned
- RLS: every policy and function assumes one organization (`is_admin()` is global). Add `org_id` checks and a membership table.
- Student ID: the prefix is one global setting; Phase 2 needs a per-organization prefix or globally unique IDs.
- Hidden `students.local` emails: replace with real email/phone when notifications arrive.
- Leaderboard and results per organization, with platform-level views.

## Open questions for the owner at P2-G0
Hierarchy (franchise above institutes? schools independent?), can a student belong to many organizations, payment provider/currency/refunds, commission definition (net of discount? refunds?), coupon rules, WhatsApp provider and consent, certificate design, data migration from Phase 1 (default: none).
