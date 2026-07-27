# Brana Youth Academy — Children Learning Hub with AI-Based Learning Recommendation System

Final year project for Brana Youth Academy — a web-based learning platform for children aged 5–12, with age-appropriate account handling, instructor-authored courses/lessons/quizzes/activities, parent oversight, parent and student registration with admin approval workflow, and a rule-based AI recommendation engine.

## Architecture

```
Frontend (React + Vite + Tailwind) → Backend (Node.js + Express) → PostgreSQL
```

- **Frontend**: `frontend/` — React 18, Vite, Tailwind CSS, React Router, Axios
- **Backend**: `backend/` — Node.js, Express, PostgreSQL (`pg`), JWT + bcrypt
- **Database Migrations**: `backend/migrations/` — `001_schema.sql`, `002_auth_extension.sql`, `003_auth_registration.sql`

## The core design decision: two student categories

- **Age 5–9 (Category 1)** — no login account. A parent manages everything for them: opens lessons, submits activities, views progress.
- **Age 10–12 (Category 2)** — has their own login after admin approval. Created via parent registration, so every student account is traceable to a parent.

This is enforced by application-level business rules and a PostgreSQL trigger (`enforce_student_account_rule`), not just the UI — the database itself refuses to create a login-enabled 5–9-year-old or a parent-only 10–12-year-old.

## The approval workflow

No one can log in or create student accounts without admin approval:

1. **Parent registers** → account is `pending`. The parent cannot log in until an admin approves or rejects.
2. **Admin reviews** pending parent registrations → approves, rejects, or suspends.
3. **Approved parent** can now log in → adds children directly (ages 5–9) or generates an invite code for a child aged 10–12.
4. **Student aged 10–12** uses the invite code to register → their account is also `pending`.
5. **Admin approves** the student registration → email credentials are generated and the student can now log in.
6. **Student aged 5–9** never creates an account — the parent manages their learning entirely.

All registration and approval actions are logged in the `audit_logs` table for traceability.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (running locally, or a connection string to a hosted instance)
- npm

---

## 1. Set up the database

```bash
# Create the database
createdb learning_hub

# Run the schema, then the auth extension, then the auth registration migration
psql -d learning_hub -f backend/schema.sql
psql -d learning_hub -f backend/migrations/002_auth_extension.sql
psql -d learning_hub -f backend/migrations/003_auth_registration.sql
```

If you don't have `psql`/`createdb` on your PATH, use any PostgreSQL GUI (pgAdmin, TablePlus, DBeaver) to run the same `.sql` files against a fresh database, in order.

---

## 2. Run the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

```
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/learning_hub
JWT_ACCESS_SECRET=<any long random string>
JWT_REFRESH_SECRET=<a different long random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

Then:

```bash
npm install
npm run dev        # nodemon, auto-restarts on changes
# or: npm start     # plain node
```

The API starts on `http://localhost:5000`. Confirm it's up:

```bash
curl http://localhost:5000/health
# {"status":"ok"}
```

---

## 3. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite starts on `http://localhost:5173` and opens the app in your browser.
It's already configured (`CLIENT_ORIGIN` in the backend `.env`, and
`VITE_API_BASE_URL` if you need to override the API URL) to talk to the
backend on port 5000.

---

## 4. Create your first accounts

The system has no public "admin" signup — someone has to be admin zero.

```bash
cd backend

# Generate a bcrypt hash for your admin password
node -e "console.log(require('bcrypt').hashSync('YourPassword123', 12))"
```

Copy the printed hash, then insert the admin directly:

```bash
psql -d learning_hub -c "
INSERT INTO users (email, password_hash, role, full_name)
VALUES ('admin@branyouth.edu', '<paste the bcrypt hash here>', 'admin', 'Site Admin');
INSERT INTO admins (user_id) SELECT id FROM users WHERE email = 'admin@branyouth.edu';
"
```

Then log in as that admin in the UI and use **Admin → Create an instructor** account to create instructors.

**Parent registration flow:**
1. A parent goes to **Login → Create an account**, fills out the registration form in 3 steps (account info, child details, preferences), and submits.
2. The parent's account is set to `pending` — they cannot log in yet.
3. An admin reviews pending registrations and approves or rejects them.
4. Once approved, the parent can log in and manage their children.

**Student registration flow (ages 10–12):**
1. An approved parent generates an invite code from their dashboard.
2. The child uses the invite code to register their own account.
3. The student account is also `pending` until an admin approves it.
4. Upon approval, email credentials are generated and the student can log in.

**Students aged 5–9** are managed entirely by their parent — they do not need their own login.

**Default flow after setup:**

1. **Admin** creates instructors from the admin panel.
2. **Parent** registers (pending) → admin approves → parent logs in → adds children (5–9 directly, 10–12 via invite).
3. **Instructor** (created by admin) creates a course → adds lessons → adds videos/materials/quizzes/activities → publishes the course.
4. **Student/Parent** browses **Courses** → opens a lesson → takes a quiz or submits an activity.
5. **Instructor** reviews and grades submissions from the lesson's activity page.
6. **Student** hits **Refresh** on their dashboard to regenerate AI recommendations based on their actual quiz/activity performance.

---

## Project structure

```
backend/
  schema.sql                        # Core normalized schema
  migrations/
    002_auth_extension.sql          # Refresh tokens + student invites
    003_auth_registration.sql       # Registration requests, approval tables, audit logs, password reset, email verification
  src/
    config/db.js                    # PostgreSQL pool
    controllers/
      authController.js             # Login, refresh, logout, me, student invite/registration
      authRegistrationController.js # Parent/student registration, password reset, email verification
      adminApprovalController.js    # Parent/student registration approval, audit logs
      adminController.js            # Admin CRUD (instructors, etc.)
      adminDashboardController.js   # Admin dashboard stats
      coursesController.js          # Course CRUD
      lessonsController.js          # Lesson CRUD
      lessonContentController.js    # Lesson content (videos, materials, quizzes, activities)
      studentsController.js         # Student management
      quizzesController.js          # Quiz CRUD & grading
      quizQuestionsController.js    # Quiz question management
      progressController.js         # Progress tracking
      activitySubmissionsController.js # Activity submission handling
      notificationsController.js    # Notification system
      ageGroupsController.js        # Age group management
      aiController.js               # AI recommendation engine
    middleware/
      auth.js                       # JWT verification
      rbac.js                       # Role-based access control
      errorHandler.js               # Centralized error handling
    routes/
      authRoutes.js                 # Authentication + registration + password + email verification
      adminApprovalRoutes.js        # Admin approval + audit log endpoints
      adminRoutes.js                # Admin-only endpoints
      coursesRoutes.js
      lessonsRoutes.js
      lessonContentRoutes.js
      studentsRoutes.js
      quizzesRoutes.js
      quizQuestionsRoutes.js
      progressRoutes.js
      activitySubmissionsRoutes.js
      notificationsRoutes.js
      ageGroupsRoutes.js
      aiRoutes.js
      materialsRoutes.js
      videosRoutes.js
    utils/
      jwt.js                        # Token generation/verification
      validators.js                 # Input validation
      roleHelpers.js                # Role lookup helpers
      progress.js                   # Progress calculation utilities
    app.js / server.js

frontend/
  src/
    api/axiosClient.js              # Axios + automatic token refresh
    context/AuthContext.jsx         # Current user, login/logout
    components/
      Layout.jsx                    # Shared nav (role-colored)
      AdminLayout.jsx               # Admin sidebar layout
    routes/ProtectedRoute.jsx       # Role-gated routing
    pages/
      Login.jsx                     # Glassmorphism login page
      RegisterParent.jsx            # Multi-step parent registration
      RegisterStudent.jsx           # Student registration with invite code
      Unauthorized.jsx              # Access denied page
      parent/
        ParentDashboard.jsx         # Parent dashboard with overview & notifications
      student/
        StudentDashboard.jsx        # Student dashboard
        StudentCourseDetail.jsx     # Course/lesson browsing
        StudentLessonDetail.jsx     # Lesson content view
        QuizTake.jsx                # Quiz-taking interface
        ActivitySubmit.jsx          # Activity submission
      instructor/
        InstructorCourses.jsx       # Course management
        InstructorCourseDetail.jsx  # Course detail & lesson management
        InstructorLessonDetail.jsx  # Lesson editor
        InstructorQuizManage.jsx    # Quiz management
        InstructorActivitySubmissions.jsx # Grading interface
      shared/
        CourseCatalog.jsx           # Course catalog (used by both student and parent)
      admin/
        AdminDashboard.jsx          # Admin dashboard with stats
        AdminApproval.jsx           # Parent/student registration approval panel
        AdminUsers.jsx              # User management
        AdminStudents.jsx           # Student management
        AdminParents.jsx            # Parent management
        AdminInstructors.jsx        # Instructor management
        AdminCourses.jsx            # Course management
        AdminAgeGroups.jsx          # Age group management
        AdminReports.jsx            # Reports & analytics
        AdminNotifications.jsx      # Notification management
        AdminAnalytics.jsx          # Advanced analytics
    index.css                       # Global styles with glassmorphism utilities
```

## API surface

Every route file under `backend/src/routes/` documents in comments who is allowed to call each endpoint. `backend/src/app.js` lists every mount point if you want the full map at a glance.

### Auth routes (`/api/auth/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/parent` | Parent self-registration (status: pending) |
| POST | `/login` | Email + password login (checks account status) |
| POST | `/refresh` | Refresh JWT access token |
| POST | `/logout` | Invalidate refresh token |
| GET | `/me` | Get current user profile |
| POST | `/forgot-password` | Send password reset token |
| POST | `/reset-password` | Reset password with token |
| POST | `/verify-email` | Send email verification token |
| POST | `/verify-email/confirm` | Confirm email with token |
| POST | `/students/invite` | Parent generates invite code (requires parent role) |
| POST | `/students/register` | Student registers with invite code |

### Admin approval routes (`/api/admin/approval/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/registration-requests` | List all pending parent registrations |
| GET | `/registration-requests/:id` | Get a specific parent registration |
| PATCH | `/registration-requests/:id/approve` | Approve a parent registration |
| PATCH | `/registration-requests/:id/reject` | Reject a parent registration |
| PATCH | `/registration-requests/:id/suspend` | Suspend a parent registration |
| GET | `/student-registration-requests` | List all pending student registrations |
| GET | `/student-registration-requests/:id` | Get a specific student registration |
| PATCH | `/student-registration-requests/:id/approve` | Approve a student registration |
| PATCH | `/student-registration-requests/:id/reject` | Reject a student registration |
| GET | `/audit-logs` | List audit trail entries |

### Other routes

All other route files (`adminRoutes`, `coursesRoutes`, `lessonsRoutes`, etc.) follow the same pattern — documented inline with the routes definitions.

---

## Known limitations / good next steps

- The **AI module** is a transparent rule-based heuristic (weak-lesson detection from quiz/activity averages + next-lesson suggestion), not the scikit-learn model named in the original tech stack. It's deliberately isolated behind `POST /api/ai/recommendations/:studentId/generate` so that model can replace the scoring logic later without changing the API contract or the frontend.
- **File uploads** (photos, PDFs, audio) are handled as URLs the client supplies — there's no S3/cloud storage integration yet. Wire one up and point `submission_url` / `resource_url` / `file_url` at it.
- **No automated tests** yet (unit or end-to-end).
- The **`reports` table** exists in the schema but has no controller/UI yet — the underlying data (progress, quiz_results, activity_submissions) is all there and queryable.
- **Messaging** (`messages` table) exists in the schema for parent↔teacher communication but has no API/UI yet.
- **Email delivery** is not yet integrated — verification tokens and password reset links are returned as API responses for testing purposes.#   f i n a l  
 