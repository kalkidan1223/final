# Brana Youth — Children Learning Hub & Amharic Fidel Academy

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Amharic Neural TTS](https://img.shields.io/badge/Amharic_TTS-Neural_Speech-FF6F00?style=for-the-badge&logo=microsoftexcel&logoColor=white)](https://azure.microsoft.com/en-us/products/ai-services/text-to-speech)
[![Tests Passing](https://img.shields.io/badge/Tests-33%20Passing-success?style=for-the-badge&logo=jest&logoColor=white)](#automated-testing)

A mission-driven, full-stack digital learning platform engineered for **Brana Youth Academy**. The system delivers modern Ethiopian early education through structured grade-level curriculums (KG to Middle School), comprehensive child-safeguarding approval workflows, dual Ethiopian–Gregorian calendar synchronizations, and an industry-first **Interactive Amharic Fidel Family Learning Engine** powered by cached Neural Text-to-Speech (TTS).

---

## Table of Contents

- [Platform Overview](#platform-overview)
- [System Architecture](#system-architecture)
- [Key Features by Role](#key-features-by-role)
  - [1. Amharic Fidel Learning & Speech Engine](#1-amharic-fidel-learning--speech-engine-featured)
  - [2. Child Learning Space (Ages 5–12)](#2-child-learning-space-ages-512)
  - [3. Instructor Academy Portal](#3-instructor-academy-portal)
  - [4. Parent Dashboard & Guardian Safeguards](#4-parent-dashboard--guardian-safeguards)
  - [5. Institutional Administration & Oversight](#5-institutional-administration--oversight)
- [Technology Stack](#technology-stack)
- [Database Architecture & Migrations](#database-architecture--migrations)
- [Amharic Fidel TTS & Audio Caching Details](#amharic-fidel-tts--audio-caching-details)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Database Provisioning](#1-database-provisioning)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Seed Default Administrator](#4-seed-default-administrator)
- [Automated Testing](#automated-testing)
- [Environment Configuration](#environment-configuration)
- [Security & Safeguarding Framework](#security--safeguarding-framework)
- [Project Directory Structure](#project-directory-structure)
- [License & Institutional Attribution](#license--institutional-attribution)

---

## Platform Overview

The **Brana Youth Academy Learning Hub** provides an authentic Ethiopian educational experience tailored to young children and youth learners:

1. **Grade-Centered Progression**: Curriculum organization is governed by structured educational grade levels (KG1–KG3, Grades 1–8) rather than chronological age alone, ensuring proper developmental readiness.
2. **Child Protection & Safeguarding**: Zero child access without explicit parental registration and administrator identity review.
3. **Phonetic Amharic Literacy**: Complete fidelity to the Ge'ez script system (Fidel), with authoritative 7-form family progression (`ግዕዝ`, `ካዕብ`, `ሣልስ`, `ራብዕ`, `ኃምስ`, `ሳድስ`, `ሳብዕ`), high-definition neural speech playback, and gamified listening challenges.
4. **Adaptive Multilingual & Cultural Support**: Built-in support for Ethiopian and Gregorian calendar date conversions, Amharic phonetics, and dual-script display.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 + Vite Frontend                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   Child Portal   │  │ Instructor Portal│  │  Parent & Admin Hub  │  │
│  │ (Fidel/Audio UI) │  │ (Authoring/Plan) │  │(Safeguards/Approvals)│  │
│  └─────────┬────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
└────────────┼────────────────────┼───────────────────────┼──────────────┘
             │                    │                       │
             ▼                    ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Node.js + Express API Gateway                   │
│   • JWT Auth & RBAC Middleware (Admin, Instructor, Student, Parent)    │
│   • Course Assignment & Sequential Learning Guards                     │
│   • Dedicated Fidel Family Learning Controller & Child Progress Engine │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼                               ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       TTS Synthesis & Caching        │  │      PostgreSQL Database     │
│  • Edge/Azure Neural Speech Adapters │  │  • 40+ Applied SQL Migrations│
│  • In-Flight Mutex Concurrency Lock  │  │  • 31 Fidel Families seeded  │
│  • SHA-256 Audio File Store (.mp3)   │  │  • 217 Characters & Orders   │
│  • Zero Redundant Synthesis Incurred │  │  • Authoritative Progress DB │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## Key Features by Role

### 1. Amharic Fidel Learning & Speech Engine *(Featured)*
- **31 Base Families & 217 Characters**: Full curriculum catalog populated from `ሀ` to `ፐ` with all 7 traditional vocalic forms.
- **Strict Data Integrity**: Ethiopic display glyph and spoken phonetic input are decoupled in the database, allowing precision fine-tuning without corrupting visual text.
- **Instructor Fidel Authoring**: Instructors pick a family with 1 click; the engine automatically binds all 7 order forms, verifies audio availability, allows direct in-browser previews, and provides retry/pronunciation issue reporting.
- **Child Audio Player & Explore Studio**: High-contrast, child-friendly layout with large touch targets, real-time waveform states, audio replay counters, and celebratory animations.
- **Practice Challenge Game**: Interactive listening recognition games testing child auditory identification against randomized distractors.
- **Authoritative Progress Tracking**: Clearly isolates auditory exposure (`listen_count`) from proven mastery (`practice_completed`).

### 2. Child Learning Space (Ages 5–12)
- **Gamified Dashboard**: Visual badges, completion rings, and celebratory modals upon finishing lessons.
- **Multi-Resource Lessons**: Integrated viewers for videos (with genuine watch-time tracking), reading materials, worksheets, interactive exercises, and quizzes.
- **Sequential Learning Enforcement**: Prevents cognitive overload by locking advanced topics until foundational prerequisites are completed.
- **Child Help Mechanism ("Ask My Teacher")**: Children can submit questions to their assigned teacher directly from within any learning step.

### 3. Instructor Academy Portal
- **Course & Lesson Authoring**: Curriculum planning scoped strictly to courses assigned by the administration.
- **Fidel Lesson Designer**: Visual 6-step creation flow featuring live child-mode preview modal.
- **Grading & Submissions**: Comprehensive review interface for student activity submissions, practice scores, and quiz attempts.
- **Direct Student & Parent Communication**: Class announcements and direct student messaging.

### 4. Parent Dashboard & Guardian Safeguards
- **Strict Safeguarding Policy**: Parent-initiated child registrations start in `pending` state; accounts remain strictly inaccessible until administrative verification.
- **Flexible Profiles**:
  - *Ages 5–9*: Fully parent-supervised learning profiles.
  - *Ages 10–12*: Independent student accounts with parent-approved credentials.
- **Real-Time Progress & Analytics**: Daily attendance, time-spent telemetry, activity submission statuses, and quiz scores.
- **Bi-Calendar Date Picker**: Seamless switching between Ethiopian Calendar (Geez date picker) and Gregorian formats.

### 5. Institutional Administration & Oversight
- **Safeguarding Approval Desk**: Administrative interface to review child registrations, verify guardian documentation, and assign confirmed grade levels.
- **Course & Grade Orchestration**: Configure grade definitions (KG1–Grade 8), assign courses to instructors, and manage academic subjects.
- **Phonetic Speech Administration**: Dedicated audit logs and speech configuration tools for updating pronunciation mappings.
- **Security Audit Logs**: Immutable recording of logins, role elevation, grade updates, and content modifications.

---

## Technology Stack

| Layer | Technologies | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5.4, Tailwind CSS 3.4 | SPA with React Router v6, Lucide & Material Icons, Canvas Confetti |
| **Audio Playback** | HTML5 Audio API, Blob URL streaming | Low-latency playback with cached static delivery |
| **Backend** | Node.js (v18+), Express (v4.19) | RESTful architecture, MVC pattern, modular route handlers |
| **Database** | PostgreSQL (v14+), `pg` pool driver | 40 production migrations, relational integrity, enum validation |
| **Authentication** | JWT (Access & Refresh tokens), bcrypt | HTTP-only cookies, OAuth 2.0 Google sign-in integration |
| **Speech (TTS)** | `msedge-tts`, Azure Speech SDK | Neural Amharic voices (`am-ET-MekdesNeural`, `am-ET-AmehaNeural`) |
| **Testing** | Node.js Test Runner, Assertions API | 33 automated backend integration & unit tests |

---

## Database Architecture & Migrations

The database uses raw SQL migrations managed under `backend/migrations/`.

### Key Tables Added in Fidel Engine (`040_fidel_family_learning_tts.sql`)

```sql
fidel_families              -- Master catalogue of 31 Ethiopic families (order_index, symbol, family_name)
fidel_characters            -- 217 forms (fidel_family_id, order_index 1..7, character, speech_text, ipa_phonetic)
lesson_fidel_families       -- Associations between lessons and families (lesson_id, fidel_family_id, display_order)
lesson_fidel_configs        -- Lesson configuration (activities_enabled, listening_required_first, require_all_audio_ready)
fidel_audio_assets          -- SHA-256 cached audio files (cache_key, file_path, file_size_bytes, duration_seconds)
student_fidel_progress      -- Child progress per character (listen_count, practice_completed, correct_count)
fidel_audio_issue_reports   -- Instructor feedback flags (issue_type, notes, resolved status)
```

---

## Amharic Fidel TTS & Audio Caching Details

To prevent redundant synthesis costs, network latency, and third-party rate limits, the platform features a multi-tier audio caching architecture:

1. **Normalized Cache Key**:
   $$\text{Hash} = \text{SHA256}(\text{provider} + \text{voice} + \text{speech\_text} + \text{rate} + \text{pitch} + \text{audio\_format})$$
2. **Local Persistence**: Audio is stored on disk at `backend/uploads/audio/fidel/<hash>.mp3` and served via static HTTP endpoints.
3. **In-Flight Mutex Deduplication**: If multiple concurrent requests arrive for the same character before synthesis completes, they hook into the same active promise.
4. **Offline Mock Fallback**: Includes a zero-cost `MockTtsProvider` generating valid MP3 frames for automated test environments and CI/CD pipelines.

---

## Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **PostgreSQL**: `v14.0` or higher
- **npm**: `v9.0.0` or higher

---

### 1. Database Provisioning

Create a PostgreSQL database and execute the migrations:

```bash
# Create PostgreSQL database
createdb -U postgres learning_hub

# Apply initial baseline schema
psql -U postgres -d learning_hub -f backend/schema.sql

# Run all migrations in sequence
cd backend
for file in migrations/*.sql; do
  echo "Applying $file..."
  psql -U postgres -d learning_hub -f "$file"
done
```

> **Tip**: You can run individual migrations using our runner:
> ```bash
> node scripts/run-migration.js 040
> ```

---

### 2. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Install dependencies (including msedge-tts)
npm install

# Start in development mode (with nodemon)
npm run dev
```
*The backend API will start on **http://localhost:5000**.*

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*The frontend user interface will be accessible at **http://localhost:5173**.*

---

### 4. Seed Default Administrator

Initialize the pre-configured system administrator account:

```bash
cd backend
npm run seed:admin
```

- **Email**: `admin@brana.edu`
- **Password**: `Admin1234`
- **Login URL**: [http://localhost:5173/login](http://localhost:5173/login)

---

## Automated Testing

The repository contains an end-to-end automated test suite verifying database integrity, instructor authoring, TTS concurrency/caching, child playback, progress tracking, and security authorization:

```bash
cd backend
npm test
```

### Test Suite Execution Summary (33 of 33 Passing)

```text
====================================================
STARTING BRANA YOUTH FIDEL LEARNING & TTS TEST SUITE
====================================================
--- 1. DATABASE TESTS ---
[PASS] Family ሀ contains exactly 7 forms
[PASS] Forms are in curriculum-defined order: ሀ, ሁ, ሂ, ሃ, ሄ, ህ, ሆ
[PASS] Speech text and character are distinct database fields
[PASS] Database rejects duplicate character within same family

--- 2. INSTRUCTOR WORKFLOW TESTS ---
[PASS] Catalogue API returns 200 and list of families
[PASS] Catalogue entry for ሀ automatically lists 7 forms count
[PASS] Instructor cannot create lesson in unassigned course (403)
[PASS] Assigned instructor successfully creates fidel lesson
[PASS] Lesson detail returns 200
[PASS] Lesson detail automatically includes 7 forms of selected family
[PASS] Forms in lesson match: ሀ, ሁ, ሂ, ሃ, ሄ, ህ, ሆ
[PASS] Instructor can update and reorder selected families
[PASS] Reordered families preserved in database (ለ then ሀ)
[PASS] Invalid update rejected with 400

--- 3. TTS INTEGRATION & CACHING TESTS ---
[PASS] Audio preview returns valid audio asset
[PASS] Cached audio asset ID is reused on subsequent call
[PASS] Concurrent requests resolve cleanly with same asset
[PASS] Instructor can report pronunciation issue
[PASS] Admin can update speech configuration
[PASS] Instructor publishes fidel lesson successfully

--- 4. CHILD LEARNING & PROGRESS TESTS ---
[PASS] Child accesses published lesson content (200)
[PASS] Child sees selected family ሀ
[PASS] Child sees all 7 forms with audio URLs
[PASS] Listening progress recorded successfully
[PASS] Replay increments listen count to 2
[PASS] Listening alone does NOT mark practice completed
[PASS] Progress persists after re-fetching
[PASS] Practice completion endpoint succeeds
[PASS] Lesson progress marked 100%
[PASS] PostgreSQL student_lesson_progress status is "completed"

--- 5. SECURITY & ACCESS TESTS ---
[PASS] Student cannot publish lessons (403)
[PASS] Student cannot alter global pronunciation catalogue (403)
[PASS] Child cannot access unpublished lesson (403)
====================================================
TEST SUMMARY: 33 PASSED, 0 FAILED
====================================================
```

---

## Environment Configuration

Create or modify `backend/.env` according to the table below:

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `5000` | Backend Express server port |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development`, `production`) |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@localhost:5432/learning_hub` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | **Yes** | `[random-256-bit-string]` | Secret key used to sign access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | `[random-256-bit-string]` | Secret key used to sign refresh tokens |
| `CLIENT_ORIGIN` | **Yes** | `http://localhost:5173` | Allowed frontend origin for CORS |
| `TTS_PROVIDER` | **Yes** | `edge` | Active TTS adapter (`edge`, `azure`, or `mock`) |
| `AZURE_SPEECH_KEY` | Conditional | `""` | Required only if `TTS_PROVIDER=azure` |
| `AZURE_SPEECH_REGION` | Conditional | `eastus` | Azure Speech service region |
| `ADMIN_EMAIL` | Optional | `admin@brana.edu` | Email for `npm run seed:admin` |
| `ADMIN_PASSWORD` | Optional | `Admin1234` | Password for `npm run seed:admin` |

---

## Security & Safeguarding Framework

1. **Child Account Isolation**: No self-registration for minors under 18. All children must be initiated by verified parents and reviewed by institutional administrators.
2. **Course Assignment Authorization**: Instructors are cryptographically restricted to modifying only courses explicitly assigned to them in the database.
3. **Sequential Learning Enforcement**: Database-backed progress checks protect children from accessing locked advanced modules prematurely.
4. **Input Sanitization & Secure Storage**: Passwords hashed with `bcrypt` (10 salt rounds); queries fully parameterized to prevent SQL injection.
5. **No Direct Third-Party TTS Exposure**: Client apps never communicate directly with speech APIs, preventing credential leakage and uncontrolled consumption costs.

---

## Project Directory Structure

```text
├── backend/
│   ├── migrations/             # 40 versioned SQL migration files
│   ├── scripts/                # Database utilities & migration runners
│   │   ├── run-migration.js    # Targeted single-migration execution tool
│   │   ├── seed-admin.js       # Admin user provisioning script
│   │   └── test_tts.js         # Voice quality & byte-size benchmark script
│   ├── src/
│   │   ├── controllers/        # Business logic handlers
│   │   │   ├── fidelCatalogueController.js
│   │   │   ├── fidelLessonController.js
│   │   │   └── fidelChildController.js
│   │   ├── middleware/         # Auth, RBAC, and validation middlewares
│   │   ├── routes/             # API routing declarations
│   │   │   └── fidelRoutes.js  # Dedicated Fidel audio & learning routes
│   │   ├── services/
│   │   │   └── tts/            # Modular speech synthesis engine
│   │   │       ├── TtsProvider.js       # Abstract base interface
│   │   │       ├── EdgeTtsProvider.js   # Microsoft Neural speech
│   │   │       ├── AzureTtsProvider.js  # Azure Cognitive Speech REST
│   │   │       ├── MockTtsProvider.js   # Offline test double
│   │   │       └── TtsService.js        # Caching & mutex orchestrator
│   │   ├── app.js              # Express app setup & middleware stack
│   │   └── server.js           # Entry point & port binding
│   ├── tests/
│   │   └── fidel_learning.test.js # 33-step automated test suite
│   ├── uploads/audio/fidel/    # SHA-256 persistent cached audio assets
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios client with interceptors
│   │   ├── components/         # Reusable UI components & layouts
│   │   │   ├── ChildLayout.jsx
│   │   │   ├── InstructorLayout.jsx
│   │   │   └── child/          # Interactive learning resource viewers
│   │   ├── pages/              # Portal pages grouped by role
│   │   │   ├── admin/          # Admin oversight, approvals, and reference data
│   │   │   ├── child/          # Gamified child learning pages
│   │   │   │   ├── ChildFidelLesson.jsx  # Interactive Fidel audio portal
│   │   │   │   └── ChildLessonDetail.jsx # Lesson steps with Fidel banner
│   │   │   ├── instructor/     # Instructor planning & grading pages
│   │   │   │   ├── InstructorFidelLessons.jsx   # Fidel lesson list
│   │   │   │   └── InstructorFidelAuthoring.jsx # 6-step authoring studio
│   │   │   └── parent/         # Parent dashboard & registration space
│   │   ├── utils/              # Ethiopian calendar & date conversion helpers
│   │   ├── App.jsx             # Top-level routing & role protection
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── README.md                   # Platform documentation
```

---

## License & Institutional Attribution

Developed exclusively for **Brana Youth Academy**. All curriculum designs, phonetic mappings, and educational materials are protected institutional assets. All rights reserved © 2026.
