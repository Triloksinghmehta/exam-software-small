# Workflows & Screens (G1 draft)

Visual wireframes: `docs/wireframes/index.html` (open in a browser).
UI rule: one main action per screen, big buttons, plain words, phone first. All times shown in IST.

## Student screens

### S1 Login `/login`
- Fields: Student ID, Password. Button: **Login**.
- Errors: "Wrong ID or password" (same message for both — doesn't reveal which IDs exist); "Account disabled, contact your teacher"; too many tries → "Wait 5 minutes".
- First login with temp password → S2.
- Already logged in on another device → that device is logged out (if setting on).

### S2 Set new password `/change-password`
- New password + confirm (min 6 chars). Button: **Save**. Then → S3.

### S3 Home `/`
- Header: name, ID, "Level 3", Logout.
- Card list **Exams**: each card = name, "Open till 20 Oct, 6:00 PM", "20 questions · 8 min", button **Start** / **View result** / "Opens 18 Oct 10:00 AM" (disabled) / "Missed" (grey).
- Card list **Practice**: same cards, label PRACTICE, "1 try left".
- Link **My results**.
- Empty: "No exams right now. Your teacher will add one."
- Error: "Can't load. Check internet." + **Try again**.

### S4 Instructions `/exam/:id`
- Exam name, level, questions, time, marks, "No minus marks", "Mixed questions use BODMAS", anti-cheat rules that are switched on (e.g. "Don't leave this screen — it is recorded").
- Button **I'm ready** → popup "Are you ready? Timer starts now." **Start** / **Cancel**.
- Server re-checks: open window, right level, attempts left. If not → message + back to Home.

### S5 Exam `/attempt/:id`
- Top bar (sticky): timer, "12 / 20 answered", saved indicator (✓ Saved / Saving… / ⚠ Offline – answers kept), **Submit**.
- Scrolling list of question cards: Q.No, numbers stacked vertically, answer box (number keypad on phone). Tab/Enter → next box.
- Last minute: timer turns red. Time 0: auto-submit → S6.
- Refresh / reopen: same questions, saved answers, timer continues from server.
- Offline: answers queue, resend on reconnect. Answers saved before time-end count.
- Submit popup: "You left 3 questions empty. Submit?" **Submit** / **Go back**.
- PRACTICE: yellow "PRACTICE" band on top.

### S6 Result `/result/:attemptId`
- Big score "16 / 20 (80%)". Tiles: Correct, Wrong, Skipped, Time taken. Start/submit time. Status: Submitted / Auto-submitted (time over).
- Review list: each question, your answer, correct answer, ✓/✗/–.
- **Leaderboard** button only if admin has turned it on → rank list (rank, name, score, time).
- Button **Back to home**.

### S7 My results `/results`
- List of past attempts (Exam / Practice tabs) → S6.

## Admin screens

### A1 Login `/admin/login` → A2.
### A2 Home `/admin`
- Tiles: Students, Exams open now, Students writing now, Submitted today. Quick buttons: **Add students**, **Create exam**.

### A3 Students `/admin/students`
- Search, filter by level/status. Table: ID, name, father's name, DOB, level, status. Row actions: Edit, Reset password, Disable.
- Buttons: **Add student**, **Upload CSV**, **Download list**.
- Empty: "No students yet. Upload a CSV to add many at once."

### A4 Upload CSV `/admin/students/import`
1. **Download template** (name, father_name, dob DD-MM-YYYY, level).
2. Choose file → preview table. Red rows with reason (missing name, bad date, level not 0–8, duplicate in file, already exists).
3. "45 good, 3 bad" — **Import 45 students** / **Download bad rows**.
4. Done screen: **Download login list** (ID + temp password; shown only this once).

### A5 Exams `/admin/exams`
- Tabs: Official / Practice. Card: name, level, status (Draft / Scheduled / Open / Closed), dates, "32/40 submitted". **Create exam**.

### A6 Create/edit exam `/admin/exams/new`
- Name, Official or Practice, Level (0–8), Opens at, Closes at (max 5 days — error if more), Duration (minutes), Attempts allowed (default 1).
- Question rules: rows of [Operation ▾ | Digits | Rows | How many] + **Add rule**; filled from level's default rules. Total questions = marks shown.
- **Preview sample paper** (with answers). Save as draft / **Publish**.
- After the first student starts: rules locked; only "Closes at" can be extended.

### A7 Exam detail `/admin/exams/:id`
- Summary + tabs: **Results**, **Leaderboard**, **Settings**.
- Results table: ID, name, score, correct, wrong, skipped, time, status, "left screen 2×". Click → student's answers. **Download CSV**.
- Leaderboard: rank (ties: higher score → less time → earlier submit), switch **Show to students**.
- Buttons: **Close now**.

### A8 Levels & default rules `/admin/levels`
- Levels 0–8: each with default rule rows (same editor as A6) + Preview.

### A9 Settings `/admin/settings`
- Student ID prefix (default SAI) — preview "SAI260001".
- Anti-cheat switches: Fullscreen, Record leaving screen, Block copy/paste, One login at a time, Auto-submit after [N] leaves (off).

## Acceptance checks for G1 (owner, manual)
1. Every screen above has a wireframe with its empty/error state.
2. Student can go Login → Home → Instructions → Ready → Exam → Submit → Result in ≤ 5 taps besides answering.
3. Admin can go Upload CSV → Create exam → Publish → see results without help.
4. Layout readable on a phone (375 px wide).
