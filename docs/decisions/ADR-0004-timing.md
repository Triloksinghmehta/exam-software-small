# ADR-0004: Server timing
Status: Accepted (G2, 2026-10-16). The full-duration rule can be changed by the owner.

**Decision:** the deadline is start + duration, set by the server. A student who starts just before the exam closes still gets the full duration. Answers arriving up to 10 seconds late are accepted. The browser timer is only for display; it is synced to `server_now`. A cron job every minute closes expired attempts.
**Why:** a refresh or a wrong device clock can't change the time (reference problem R4). Children who start late aren't cut short unexpectedly.
**Alternative (not chosen):** cut the deadline at the exam closing time. This is a one-line change in `begin_attempt` if the owner prefers it.
