# ADR-0002: Student login with ID via hidden email
Status: Accepted (G2, 2026-10-16)

**Decision:** each student gets a Supabase Auth user with the email `<studentcode>@students.local`, which the student never sees. The login screen asks only for Student ID + password.
**Why:** Supabase Auth needs an email or phone, and students have neither. Building the email from the ID needs no lookup, so the app has no endpoint that reveals which IDs exist.
**Rejected:** a custom password table (unsafe); a lookup function from ID to email (lets anyone check which IDs exist).
**Phase 2 note:** when real emails/phones are added, update the Auth user's email; the student code stays the same.
