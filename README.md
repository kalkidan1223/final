# Children Learning Hub

A full-stack learning platform for Brana Youth Academy designed for children aged 5–12. It supports parent oversight, instructor course management, student learning flows, and an admin approval workflow.

## Overview

This project combines:

- a React + Vite frontend for the user experience
- a Node.js + Express backend for APIs and business rules
- a PostgreSQL database for course content, users, progress, approvals, and audit logs

## Key Features

- Parent registration and approval workflow
- Student registration for ages 10–12 through invite codes
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
```

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend will run on http://localhost:5000.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:5173.

### 5. Create an Admin User

After the app is running, create an admin account manually in the database or through the setup flow described in the project documentation.

## Development Notes

- The AI recommendation module is rule-based and can be upgraded later.
- File uploads are currently handled through URLs rather than cloud storage.
- The project does not yet include automated tests.

## License

This project is intended for educational and academic use.
