# ADR-0001: React + Supabase stack
Status: Accepted (G2, 2026-10-16)

**Decision:** React + TypeScript + Vite for the frontend; Supabase Postgres, Auth, RLS and Edge Functions for the backend.
**Why:** the owner required this stack. Postgres row security plus server functions keep scoring and answer keys on the server.
**Rejected:** a custom Node API server (one more thing to host and secure); keeping the reference app's browser-only logic (students could cheat, see question-rules.md R1–R3).
