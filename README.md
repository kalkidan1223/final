# Children Learning Hub

A full-stack learning platform for Brana Youth Academy designed for children aged 5–12. It supports parent oversight, instructor course management, student learning flows, and mandatory administrator approval.

## Overview

This project combines:

- a React + Vite frontend for the user experience
- a Node.js + Express backend for APIs and business rules
- a PostgreSQL database for course content, users, progress, approvals, and audit logs

## Key Features

- Parent registration and approval workflow
- Child registration and approval workflow — no child can access learning content before administrator approval
- Parent-managed learning profiles for children aged 5–9
- Student accounts for children aged 10–12, created only after administrator approval
- Course, lesson, quiz, and activity management
- Progress tracking and learning recommendations
- Admin dashboard for approvals, users, and content oversight



## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, PostgreSQL, JWT, bcrypt
- Database: PostgreSQL with SQL migrations



## Project Structure

```text
backend/     Backend API and database migrations
frontend/    React application
```



## Getting Started



### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm



### 2. Database Setup

Create a PostgreSQL database and run the SQL files in order:

```bash
createdb learning_hub
psql -d learning_hub -f backend/schema.sql
psql -d learning_hub -f backend/migrations/002_auth_extension.sql
psql -d learning_hub -f backend/migrations/003_auth_registration.sql
psql -d learning_hub -f backend/migrations/004_child_approval_policy.sql
psql -d learning_hub -f backend/migrations/005_parent_guardian_verification.sql
psql -d learning_hub -f backend/migrations/006_child_request_review_notes.sql
psql -d learning_hub -f backend/migrations/007_student_profile_details.sql
psql -d learning_hub -f backend/migrations/016_sync_instructor_assignments.sql
psql -d learning_hub -f backend/migrations/017_instructor_lms_content_management.sql
```

If you already created the database before the child-approval policy was added, back it up before applying migrations `004_child_approval_policy.sql` through `006_child_request_review_notes.sql`. Migration 006 is required for the administrator's child approval action because it stores the reviewer note.

### Child Approval Policy

Every child registration starts as `pending` and is unavailable to the parent and student learning areas until an administrator approves it.

- Ages **5–9**: the administrator creates a parent-managed child profile. The child does not receive a separate login.
- Ages **10–12**: the administrator creates both the child profile and the student login account from the credentials submitted by the parent.

The Parent Dashboard displays submitted child-registration requests and their current status.

### Parent Child Registration

Parents register each child through the Parent Dashboard. The form collects the child's identity, school information, preferred learning language, and optional medical or learning-support information. For ages 10–12 it also collects an email and password for the future independent account.

The admin must approve the request before the child appears in learning areas. A rejection reason or review note is retained with the request for the parent to see.

### Parent and Guardian Eligibility

- A parent or guardian must be at least **18 years old**.
- A parent may submit their own registration for approval.
- An adult sibling, relative, or other guardian must be created by an administrator after an in-person identity and document review.
- The administrator records the relationship, verification decision, notes, reviewer, and verification time for every exceptional guardian account.



### 3. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend will run on [http://localhost:5000](http://localhost:5000).

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on [http://localhost:5173](http://localhost:5173).

The parent-registration date-of-birth control supports Ethiopian and Gregorian calendar entry; the API always receives a Gregorian `YYYY-MM-DD` date.

### 5. Create an Admin User

After migrations are applied, seed the default admin account:

```bash
cd backend
npm run seed:admin
```

Default credentials (override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`):

- **Email:** `admin@brana.edu`
- **Password:** `Admin1234`

Log in at [http://localhost:5173/login](http://localhost:5173/login) — you will be redirected to the admin dashboard.

## Development Notes

- The AI recommendation module is rule-based and can be upgraded later.
- File uploads are currently handled through URLs rather than cloud storage.
- The project does not yet include automated tests.
- The former direct invite-based student registration flow has been removed to enforce administrator approval.
- After pulling changes, run any newly added migrations before testing admin approvals or registration flows.



## License

This project is intended for educational and academic use.
