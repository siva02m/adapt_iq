# AdaptIQ — Adaptive Learning Platform: PROJECT BRAIN

> **Purpose:** This is the single source of truth for the AdaptIQ project.
> Every developer or LLM agent onboarding to this project should read this file
> first before touching any code. It documents architecture, role rules, feature
> status, known bugs, and pending work.

---

## 1. TECH STACK

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router v6, Axios |
| Styling | Vanilla CSS (index.css design system, no Tailwind) |
| Backend | Spring Boot 3, Spring Security (JWT stateless), Spring Data JPA |
| Database | PostgreSQL |
| Auth | JWT Bearer tokens stored in localStorage |
| File storage | Local `/uploads/` directory served as static files |
| Build | Maven Wrapper (`mvnw`) |

**Dev servers:**
- Frontend: `http://localhost:5173` (Vite)
- Backend: `http://localhost:8080` (Spring Boot)

---

## 2. PROJECT STRUCTURE

```
learning-platform/
├── adaptive-ui/                  # React frontend
│   └── src/
│       ├── api/client.js         # Axios instance with JWT interceptor
│       ├── contexts/AuthContext.jsx
│       ├── components/
│       │   ├── Sidebar.jsx       # Role-based nav sidebar
│       │   ├── TopBar.jsx
│       │   ├── BlockEditor.jsx   # Full-screen block-based content editor
│       │   ├── BlockRenderer.jsx # Renders saved block JSON in player
│       │   ├── CustomMediaPlayer.jsx # 3-mode video/audio player
│       │   └── ProtectedRoute.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── CourseLibrary.jsx # Author/Admin: course card list
│       │   ├── CourseEditor.jsx  # Author/Admin: tabbed course authoring shell
│       │   ├── editor-tabs/      # All authoring panel tabs (see Section 5)
│       │   ├── learner/
│       │   │   ├── LearnerPortal.jsx   # Learner dashboard
│       │   │   └── CoursePlayer.jsx    # Full adaptive course player
│       │   └── admin/
│       │       ├── UserManagement.jsx
│       │       └── ReportingDashboard.jsx
│       └── main.jsx              # React Router routes + role guards
│
└── learning-platform/            # Spring Boot backend
    └── src/main/java/com/adaptive/learning/
        ├── controllers/          # REST API endpoints
        ├── services/             # Business logic
        ├── repositories/         # Spring Data JPA interfaces
        ├── models/               # JPA entities
        ├── dto/                  # Request/Response DTOs
        └── security/             # JWT filter, config, util
```

---

## 3. ROLES & ACCESS MATRIX

| Feature Area | ADMIN | AUTHOR | LEARNER |
|---|---|---|---|
| Course Library (view/create/edit) | ✅ | ✅ | ❌ |
| Course Library (delete) | ✅ | ❌ | ❌ |
| Course Authoring Canvas | ✅ | ✅ | ❌ |
| Reporting Dashboard | ✅ | ✅ (MISSING — currently ADMIN only) | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Admin Dashboard | ✅ | ❌ | ❌ |
| Learning Canvas (My Courses) | ✅ | ✅ (MISSING — not routed) | ✅ |
| Course Player | ✅ | ✅ (MISSING — not routed) | ✅ |

**BUGS IN ROUTING (to fix):**
- `AUTHOR` role cannot access `/learn` or `/learn/course/:id` — needs to be added
- `AUTHOR` role cannot access `/admin/reports` — ReportController is `@PreAuthorize("hasRole('ADMIN')")` only
- Sidebar for `AUTHOR` only shows "My Courses", missing Reports link

---

## 4. USER ROLES (Database)

```
UserRole: ADMIN | AUTHOR | LEARNER
```

Default seeded accounts (DatabaseSeeder.java):
- `admin@adaptiq.com` / `Admin@123` → ADMIN
- `author@adaptiq.com` / `Author@123` → AUTHOR
- `learner@adaptiq.com` / `Learner@123` → LEARNER

---

## 5. AUTHORING PANEL — TAB STATUS

The `CourseEditor.jsx` is the tabbed authoring shell. Each tab is a separate component in `editor-tabs/`.

### a. Overview Tab — `Overview.jsx` ✅ BUILT
- Course title, description, WIIFM, status badge, thumbnail URL
- Saves via `PUT /api/courses/:id`

### b. Settings Tab — `Settings.jsx` ⚠️ PARTIAL
**Built:**
- Round size (questions per adaptive round)
- Passing score percent
- Max attempts
- Randomize questions toggle
- Randomize options toggle

**MISSING (per spec):**
- Toggle: Enable/Disable Learning Modules
- Toggle: Enable/Disable Final Exam
- Navigation mode: OPEN / PROGRESSIVE / LOCKED (sidebar behavior in player)
- Next/Previous button mode: FREE / RESTRICTED

**Backend `Course.java` fields missing:**
- `enableLearningModules` (Boolean)
- `enableFinalExam` (Boolean)
- `navigationMode` (Enum: OPEN, PROGRESSIVE, READ_ONLY)

### c. Theme Tab — `Theme.jsx` ✅ BUILT
- Primary accent color picker
- Button style presets
- Font selection

### d. Intro Pages Tab — `IntroPages.jsx` ✅ BUILT
- List view of intro pages with display order
- Create, edit (opens full-screen BlockEditor), delete, duplicate
- Drag-and-drop reorder + button reorder
- Full-screen BlockEditor with blocks: heading, paragraph, alert/callout, image, video, audio, file-download, accordion, tabs, flashcards

### e. Learning Objectives Tab — `LearningObjectives.jsx` ✅ BUILT
- Add/edit/delete Learning Objectives (LOs)
- LOs are linked to questions and modules (used in adaptive logic + reporting)

### f. Tags Tab — `Tags.jsx` ✅ BUILT
- Add/delete tags (stored as `List<String>` on Question and LearningModule)
- Tags are used in adaptive logic and reporting

### g. Pre-Assessment Tab — `PreAssessment.jsx` → `QuestionBank.jsx` ✅ BUILT
- Pool type: `ADAPTIVE_ROUND`
- List view of questions with question ID
- Add/edit/delete questions
- Each question: text, mapped LO, mapped tags, options (mark correct), custom feedback, substitute group ID
- Re-order with buttons and DnD

**MISSING (per spec):**
- Per-confidence-level custom feedback (SURE / NOT_SURE / DONT_KNOW separately) — currently single `customFeedbackText`
- "Core feedback" (shown for all confidence levels regardless)
- `Question.java` model needs `feedbackForSure`, `feedbackForNotSure`, `feedbackForDontKnow`, `coreFeedback` fields

### h. Learning Modules Tab — `LearningModules.jsx` ✅ BUILT
- Shown always (should respect `enableLearningModules` toggle — MISSING)
- List view, full-screen BlockEditor (same as IntroPages)
- Each module assigned to LO and tags
- Adaptive logic: modules shown based on unmastered question tags/LOs

### i. Post-Assessment Tab — `PostAssessment.jsx` → `QuestionBank.jsx` ⚠️ STUB
- Pool type: `FINAL_EXAM`
- Currently reuses QuestionBank UI — question list works
- **MISSING (per spec):**
  - Intro page for final exam (separate from question list)
  - No confidence meter in final exam player
  - No feedback shown in final exam player
  - CPE-compliant: 70% to pass, download certificate, no review
  - Unlimited attempts within 1 year of enrollment
  - 1-year deadline: auto-reset course progress if not passed

### j. Resources Tab — `ResourcesTab.jsx` ✅ BUILT
- 5 tabs: All, Images, Videos, Audio, Files
- Upload, view, edit alt text, add/edit CC (VTT/SRT) for video/audio
- Custom video/audio player (`CustomMediaPlayer.jsx`) with 3 modes:
  - `FULLY_FREE`: full seekbar navigation
  - `WATCHED_ONLY`: can only seek to already-watched position
  - `LOCKED`: read-only, no seeking
- Drag-and-drop upload zone
- Global resources toggle (mark resource as global)
- **MISSING:** Add from global resources into a course

### k. Import Tab — `ImportTab.jsx` ✅ BUILT
- Import course from JSON
- **MISSING:** Import from Excel

### l. Export Tab — `ExportTab.jsx` ⚠️ PARTIAL
**Built:**
- JSON export
- Web Package (ZIP)

**MISSING (per spec):**
- SCORM 1.2 export
- SCORM 2004 export (with auto-user-enrollment on LMS)
- Word export
- PDF export
- Excel export (source file)

### m. Top Bar — `TopBar.jsx` ⚠️ PARTIAL
- Navigation links (left side)
- Status display
- **MISSING:**
  - Publish button with 3 options: Everyone / Specified Roles / Specified Users

---

## 6. LEARNING PANEL (Course Player) — STATUS

File: `adaptive-ui/src/pages/learner/CoursePlayer.jsx`

### Current Implementation ✅
- Left sidebar: shows playlist (Intro pages → Pre-Assessment → Modules → Final → Results)
- Progressive lock: items locked beyond `highestUnlockedIndex`
- Bottom bar: Previous / Step X of Y / Continue
- Block-based content rendering via `BlockRenderer.jsx`
- Pre-Assessment quiz engine (MCQ + confidence meter)
- Immediate inline feedback below question
- Matrix result badges (MASTERED / MISINFORMED / DOUBTFUL / UNINFORMED / NEUTRAL)
- Pre-assessment results screen (LO mastery breakdown, attempt log)
- Round generator (`GET /api/rounds/generate`) with:
  - Course-isolated unmastered question priority
  - ADAPTIVE_ROUND pool-type filter
  - Review fallback when all questions mastered
- Answer evaluation (`POST /api/rounds/evaluate`) recording to AttemptLedger

### MISSING / BROKEN (per spec)

#### Course Mode Support (4 course types)
1. **Intro + Pre-Assessment only** ⚠️ Partial (works but results flow is broken)
2. **Intro + Pre-Assessment + Learning Modules** ❌ NOT BUILT
   - Modules should unlock based on unmastered question LOs/tags
   - Learner completes module → attempt next round
3. **Intro + Pre-Assessment + Final Exam** ❌ NOT BUILT
   - Final exam unlocks after all adaptive questions mastered
   - No feedback, no confidence meter, forward-only navigation
   - Pass threshold (e.g. 70%), certificate download on pass
4. **All four combined** ❌ NOT BUILT

#### Navigation Mode (from Course Settings)
- Currently hardcoded `isProgressive = true`
- Needs to read `course.navigationMode`: OPEN / PROGRESSIVE / READ_ONLY

#### Round Flow
- Round results screen (after each round): topic mastered so far, misinformed, uncertain — ❌ MISSING
- "Next Round" button after seeing round results — ❌ MISSING
- Final results screen: all questions in dropdown list with attempt history — ❌ MISSING
- "Review Questions" button: page-by-page audit trail — ❌ MISSING

#### Final Exam (FINAL_EXAM pool)
- No confidence meter — ❌ NOT IMPLEMENTED
- No immediate feedback — ❌ NOT IMPLEMENTED  
- Fully forward-locked (cannot go back) — ❌ NOT IMPLEMENTED
- Show only final % score at end — ❌ NOT IMPLEMENTED
- Certificate download on pass — ❌ NOT IMPLEMENTED
- 1-year enrollment deadline + auto-reset — ❌ NOT IMPLEMENTED

---

## 7. ADMIN PANEL — STATUS

### User Management — `UserManagement.jsx` ✅ BUILT
- List all users (table view)
- Create user (name, email, password, role)
- Change role
- Deactivate user

### Admin Dashboard ❌ NOT BUILT
**Required:**
- Total users count
- Total courses count
- Audit trail / activity log
- Platform-wide KPIs

---

## 8. REPORTING PANEL — STATUS

File: `admin/ReportingDashboard.jsx` + `ReportController.java`

### Built ✅
- Platform summary: total learners, total attempts, mastered%, misinformed%, avg mastery
- Course list with matrix color bar
- Course detail: confidence matrix breakdown, top misinformed questions, LO mastery bars, learner performance table

### MISSING (per spec)
- Course-level: number of questions
- Course-level: progress breakdown — Not Started / In Progress / Completed counts
- Course-level: avg time spent
- Course-level: misinformation rate
- Course-level: "mastered in first attempt" metric
- Course-level: "refresh taken then mastered" metric
- Course Struggle report: questions/topics/LOs with most & least struggle (bar chart + heatmap)
- Course Misinformation report: learner-wise chart (bar chart with matrix states by learner)
- Learner-wise reporting: knowledge by tags/topics, course-wise progress, repeated failing in same topic, improvement over time
- **Reporting access for AUTHOR role** — currently only ADMIN can call `/api/reports/*`

---

## 9. BACKEND MODELS — CURRENT STATE

| Model | Fields | Notes |
|---|---|---|
| `Course` | id, title, description, wiifm, status, thumbnailUrl, estimatedDurationMinutes, language, version, roundSize, isQuestionsRandomized, isOptionsRandomized, passingScorePercent, maxAttempts, author, tags, globalResourcesEnabled | Missing: enableLearningModules, enableFinalExam, navigationMode |
| `LearningObjective` | id, title, description, course | ✅ Complete |
| `IntroPage` | id, title, htmlContent (block JSON), displayOrder, course | ✅ Complete |
| `LearningModule` | id, title, description, htmlContent (block JSON), displayOrder, course, learningObjective, tags | ✅ Complete |
| `Question` | id, questionText, poolType (ADAPTIVE_ROUND / FINAL_EXAM), learningObjective, tags, options, substituteGroupId, customFeedbackText, optionsRandomized | Missing: feedbackForSure, feedbackForNotSure, feedbackForDontKnow, coreFeedback |
| `QuestionOption` | id, optionText, isCorrect, question | ✅ Complete |
| `AttemptLedger` | id, userId, question, selectedOption, confidenceLevel, matrixResult, attemptNumber, roundNumber, createdAt | ✅ Complete |
| `MediaResource` | id, fileName, fileType, url, altText, ccUrl, course | ✅ Complete |
| `User` | id, email, fullName, password (BCrypt), role, isActive, lastLoginAt | ✅ Complete |

### Enums
- `CourseStatus`: DRAFT, PUBLISHED, ARCHIVED
- `UserRole`: ADMIN, AUTHOR, LEARNER
- `PoolType`: ADAPTIVE_ROUND, FINAL_EXAM
- `MatrixResult`: MASTERED, MISINFORMED, DOUBTFUL, UNINFORMED, NEUTRAL
- `ConfidenceLevel`: SURE, NOT_SURE, DONT_KNOW

---

## 10. BACKEND SERVICES — CURRENT STATE

| Service | Purpose | Status |
|---|---|---|
| `EvaluationEngine` | Calculates MatrixResult from (isCorrect, confidenceLevel) | ✅ Complete |
| `RoundGeneratorService` | Generates adaptive question round: unmastered first, fresh fill, review fallback, course-isolated | ✅ Complete |
| `ResourceLifecycleService` | Globally replaces URLs in all block JSON when a resource is replaced | ✅ Complete |
| `ExportService` | JSON and Web Package export/import | ⚠️ Partial (SCORM, Word, PDF missing) |
| `DatabaseSeeder` | Seeds demo course, questions, users on startup | ✅ Complete |

---

## 11. BACKEND API ENDPOINTS — CURRENT STATE

| Method | Path | Controller | Auth | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login` | AuthController | Public | Returns JWT + user data |
| GET | `/api/auth/me` | AuthController | Any | Current user profile |
| GET/POST/PUT/DELETE | `/api/courses/**` | CourseController | ADMIN/AUTHOR | CRUD for courses |
| GET/POST/PUT/DELETE | `/api/courses/:id/intro-pages/**` | IntroPageController | ADMIN/AUTHOR | Intro page CRUD |
| GET/POST/PUT/DELETE | `/api/learning-modules/**` | LearningModuleController | ADMIN/AUTHOR | Module CRUD |
| GET/POST/PUT/DELETE | `/api/courses/:id/objectives/**` | LearningObjectiveController | ADMIN/AUTHOR | LO CRUD |
| GET/POST/PUT/DELETE | `/api/questions/**` | QuestionController | ADMIN/AUTHOR | Question CRUD |
| GET | `/api/rounds/generate` | RoundController | Any Auth | Generate adaptive round |
| POST | `/api/rounds/evaluate` | RoundController | Any Auth | Submit + record answer |
| GET/POST/PUT/DELETE | `/api/resources/**` | ResourceController | ADMIN/AUTHOR | Media resource CRUD |
| GET | `/api/reports/summary` | ReportController | ADMIN only | Platform stats |
| GET | `/api/reports/courses` | ReportController | ADMIN only | Per-course summary |
| GET | `/api/reports/courses/:id` | ReportController | ADMIN only | Course detail |
| POST/GET | `/api/export/**` | ExportController | ADMIN/AUTHOR | Export/Import |
| GET/POST/PUT/DELETE | `/api/auth/users/**` | AuthController | ADMIN only | User management |

---

## 12. KNOWN BUGS (Active)

| # | Bug | Location | Status |
|---|---|---|---|
| 1 | Questions loading from cross-course AttemptLedger | RoundGeneratorService | ✅ FIXED |
| 2 | All mastered → empty screen (no questions served) | RoundGeneratorService | ✅ FIXED |
| 3 | FINAL_EXAM questions leaking into ADAPTIVE_ROUND pool | RoundGeneratorService | ✅ FIXED |
| 4 | IDE false-positive: `findAllAttemptedQuestionIdsByUserId` undefined | AttemptLedgerRepository | ✅ FIXED (IDE cache issue) |
| 5 | AUTHOR cannot access Learning canvas | main.jsx routes | ❌ OPEN |
| 6 | AUTHOR cannot access Reports | ReportController @PreAuthorize | ❌ OPEN |
| 7 | Round results screen not shown after each round | CoursePlayer.jsx | ✅ FIXED (Task 1.2) |
| 8 | Navigation mode hardcoded to progressive | CoursePlayer.jsx | ✅ FIXED (Task 1.4) |
| 9 | Final exam uses same quiz engine as adaptive (has feedback + confidence) | CoursePlayer.jsx | ✅ FIXED (Task 1.4) |
| 10 | Learning modules not dynamically injected based on LO mastery | CoursePlayer.jsx | ✅ FIXED (Task 1.3) |
| 11 | Publish button in TopBar not implemented | TopBar.jsx | ❌ OPEN |
| 12 | enableLearningModules / enableFinalExam settings ignored in player | Course.java missing fields | ✅ FIXED (Task 1.3/1.4) |

---

## 13. IMMEDIATE NEXT PRIORITIES (Suggested Order)

### Priority 1 — Course Player Flow (Core Learning Experience)

Each task below is self-contained and must be fully completed before moving to the next.

#### Task 1.1 — Course Mode Settings (Backend + UI) ✅ DONE
- [x] Created `NavigationMode.java` enum (OPEN, PROGRESSIVE, READ_ONLY)
- [x] Added `enableLearningModules` (Boolean, default true) to `Course.java`
- [x] Added `enableFinalExam` (Boolean, default false) to `Course.java`
- [x] Added `navigationMode` (Enum, default PROGRESSIVE) to `Course.java`
- [x] Updated `Settings.jsx` — Course Structure toggles + Navigation Mode radio picker + Randomisation section
- [x] Backend compiled — 51 files, zero errors

#### Task 1.2 — Round Results Screen ✅ DONE
After the last question of each adaptive round, shows an inline "Round X Complete" screen.
- [x] Added `roundNumber`, `allRoundAnswers`, `roundResults` states to `CoursePlayer.jsx`
- [x] Reset all round states when navigating away from assessment item
- [x] `handleFeedbackProceed` now computes round stats and calls `setRoundResults` instead of immediately completing
- [x] Added `handleRoundProceed(action)` — 'next_round' increments roundNumber + re-runs startAssessment; 'complete' calls completePreAssessment with all merged answers
- [x] Round results card renders: round number header, 5-state matrix grid, overall mastery progress bar, per-question list, Next Round / View Results buttons
- [x] Assessment Intro card now shows "Start Round N" on subsequent rounds
- [x] "Next Round" button hidden when all questions in the round were mastered

#### Task 1.3 — Dynamic Module Injection ✅ DONE
After each adaptive round, modules whose LO matches unmastered question LOs are
injected into the playlist before the next round.
- [x] After round, collect unmastered LO IDs from `allRoundAnswers`
- [x] Added `loIds` query param to `GET /api/courses/{courseId}/learning-modules?loIds=1,2,3`
- [x] Added `findByCourseIdAndLearningObjectiveIdInOrderByDisplayOrderAsc` to `LearningModuleRepository`
- [x] Injected modules inserted into playlist after current assessment index
- [x] `seenModuleIds` Set prevents re-injection across rounds
- [x] Next round locked until learner completes injected modules
- [x] Injected modules styled differently in sidebar (📘 Recommended Study section, indigo colour)

#### Task 1.4 — Final Exam Player Mode ✅ DONE
Final exam questions use `FINAL_EXAM` pool. No confidence meter, no feedback,
forward-only, show only % score at the end.
- [x] `examMode` state: `null | 'ADAPTIVE' | 'FINAL'` set in `startAssessment()`
- [x] Confidence meter hidden when `examMode === 'FINAL'`
- [x] Inline feedback hidden in FINAL mode; questions advance immediately on submit
- [x] Previous button and bottom nav bar hidden during final exam
- [x] Pass/fail screen with score vs `course.passingScorePercent`
- [x] Certificate download (browser print, styled HTML) on pass
- [x] "Try Again" resets exam state only — adaptive progress preserved
- [x] Navigation mode (`course.navigationMode`) now respected — hardcoded `isProgressive=true` removed

#### Task 1.5 — End-of-Course Results + Review ✅ DONE
- [x] Rich results screen: KPI cards (Mastered/Doubtful/Misinformed/Uninformed counts), overall mastery progress bar, LO breakdown bars
- [x] Final exam result banner with score and "Download Certificate" shortcut (if passed)
- [x] Collapsible question list — all questions colour-coded by matrix state, expand to see your answer / correct answer / confidence / objective / tags
- [x] "Expand All" / "Collapse All" controls for the question list
- [x] "Review Questions" button → page-by-page review mode with progress bar, dot nav, and per-question knowledge-state explanation
- [x] Certificate download accessible from results page (if final exam passed)

### Priority 2 — Question Feedback Model
1. Add `feedbackForSure`, `feedbackForNotSure`, `feedbackForDontKnow`, `coreFeedback` to `Question.java`
2. Update QuestionBank UI to show per-confidence feedback inputs
3. Update EvaluationEngine response to send the correct feedback based on confidence level

### Priority 3 — Role Access Fixes
1. Add `/learn` and `/learn/course/:id` routes for AUTHOR role
2. Add Reports link to AUTHOR sidebar
3. Change `ReportController` to allow ADMIN + AUTHOR roles

### Priority 4 — Admin Dashboard
1. Build `/admin/dashboard` page: user count, course count, activity audit trail

### Priority 5 — Reporting Enhancements
1. Add course progress breakdown (Not Started / In Progress / Completed)
2. Add struggle report (bar chart + heatmap by LO/tag)
3. Add learner-wise detailed reports
4. Add time-spent tracking to AttemptLedger

### Priority 6 — Export / SCORM
1. SCORM 1.2 export
2. SCORM 2004 export with LMS enrollment
3. Word and PDF export
4. Excel source export

---

## 14. COURSE PLAYER — 4 COURSE MODES

The course player should dynamically build its playlist based on these settings:

### Mode 1: Intro + Pre-Assessment Only
```
[Intro pages...] → [Pre-Assessment rounds] → [Final Results]
```
- Adaptive rounds repeat until all questions mastered
- Each round shows inline feedback, then round results screen
- Final screen: all questions with attempt history dropdown

### Mode 2: Intro + Pre-Assessment + Learning Modules
```
[Intro pages...] → [Pre-Assessment Round 1] → [Round 1 Results]
→ [Unlock Modules for unmastered LOs/tags] → [Modules...] 
→ [Pre-Assessment Round 2] → ... → [Final Results]
```
- After each round, modules matching unmastered LO/tags are injected
- Learner must complete modules before next round

### Mode 3: Intro + Pre-Assessment + Final Exam
```
[Intro pages...] → [Pre-Assessment rounds] → [All Mastered!]
→ [Final Exam Intro] → [Final Exam Questions] → [Score only] → [Certificate if passed]
```
- Final exam: no confidence meter, no feedback, forward-only navigation
- Pass threshold from course settings (default 70%)
- Unlimited attempts within 1 year; auto-reset on expiry

### Mode 4: Full (All Components)
```
[Intro pages...] → [Pre-Assessment Round 1] → [Modules for unmastered]
→ [Round 2...] → [All Mastered!] → [Final Exam] → [Certificate]
```

### Mode 5: Intro + Modules + Final Exam (No Adaptive)
```
[Intro pages...] → [All Modules in order] → [Final Exam] → [Certificate]
```
- No pre-assessment, no adaptive logic
- Every module shown to every learner

---

## 15. MATRIX RESULT LOGIC (EvaluationEngine)

| Correct? | Confidence | Result |
|---|---|---|
| ✅ Yes | SURE | **MASTERED** |
| ✅ Yes | NOT_SURE | **DOUBTFUL** |
| ✅ Yes | DONT_KNOW | **NEUTRAL** |
| ❌ No | SURE | **MISINFORMED** (highest risk!) |
| ❌ No | NOT_SURE | **UNINFORMED** |
| ❌ No | DONT_KNOW | **NEUTRAL** |

Only `MASTERED` excludes a question from future rounds.
`MISINFORMED` is the most critical state — learner is confidently wrong.

---

## 16. BLOCK EDITOR — SUPPORTED BLOCK TYPES

Stored as JSON array in `htmlContent` / `blocksJson` columns.

| Block Type | Status |
|---|---|
| `heading` (h1–h4) | ✅ |
| `paragraph` | ✅ |
| `alert` (info, warning, success, danger) | ✅ |
| `image` | ✅ |
| `video` (CustomMediaPlayer, 3 modes) | ✅ |
| `audio` (CustomMediaPlayer) | ✅ |
| `file-download` | ✅ |
| `accordion` | ✅ |
| `tabs` | ✅ |
| `flashcards` | ✅ |
| `divider` | ✅ |
| `quote` | ✅ |
| More block types | Planned (evolving) |

---

## 17. IMPORTANT CONVENTIONS

- **API base URL:** `http://localhost:8080` (in `client.js`)
- **Static files:** Served from `/uploads/**` — no auth required
- **JWT:** Stored in `localStorage` as `adaptiq_token`; user object as `adaptiq_user`
- **Learning modules endpoint:** Uses `/api/learning-modules/**` (NOT `/api/modules/**`) — renamed to bypass Windows WebDAV keyword block
- **DB schema upgrades:** Done programmatically in `LearningPlatformApplication.java` via JDBC on startup (no Flyway/Liquibase)
- **Question options:** `isCorrect` field is boolean; only one option should be correct per question currently
- **Round isolation:** All AttemptLedger queries for adaptive logic must filter by `courseId` to prevent cross-course leakage

---

*Last updated: 2026-06-11 — Tasks 1.3 (Dynamic Module Injection) and 1.4 (Final Exam Player Mode) completed.*
*Update this file whenever a new feature is completed or a new bug is found.*
