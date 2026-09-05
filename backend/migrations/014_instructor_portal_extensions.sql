BEGIN;

-- ============================================================================
-- Migration 014: Instructor Portal Extensions (fixed)
-- Creates missing tables required by the instructor portal.
-- ============================================================================

-- 1. academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(20) NOT NULL UNIQUE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO academic_years (label, is_current)
VALUES ('2025/2026', TRUE)
ON CONFLICT (label) DO NOTHING;

-- 2. instructor_assignments table
--    Admins assign an instructor to a course + age group (+ optional grade/section)
CREATE TABLE IF NOT EXISTS instructor_assignments (
  id              BIGSERIAL PRIMARY KEY,
  instructor_id   BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  course_id       BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  age_group_id    INT    NOT NULL REFERENCES age_groups(id) ON DELETE RESTRICT,
  academic_year_id INT   REFERENCES academic_years(id) ON DELETE SET NULL,
  grade           VARCHAR(20),
  section         VARCHAR(10),
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'archived')),
  assigned_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_assignments_instructor ON instructor_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_inst_assignments_course     ON instructor_assignments(course_id);

-- 3. Add assignment_id + status + date to attendance
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS assignment_id BIGINT REFERENCES instructor_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'present',
  ADD COLUMN IF NOT EXISTS date          DATE,
  ADD COLUMN IF NOT EXISTS marked_by     BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Fill date from session_date for any existing rows
UPDATE attendance SET date = session_date WHERE date IS NULL;

-- New partial unique index for assignment-scoped attendance
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_assign_student_date
  ON attendance (assignment_id, student_id, date)
  WHERE assignment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_assignment_id ON attendance(assignment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date          ON attendance(date);

-- 4. announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id            BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT REFERENCES instructor_assignments(id) ON DELETE CASCADE,
  created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_assignment ON announcements(assignment_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- 5. teacher_feedback table
CREATE TABLE IF NOT EXISTS teacher_feedback (
  id            BIGSERIAL PRIMARY KEY,
  student_id    BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id   BIGINT REFERENCES activities(id) ON DELETE SET NULL,
  instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  feedback      TEXT NOT NULL,
  score         NUMERIC(6,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_feedback_student    ON teacher_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_feedback_instructor ON teacher_feedback(instructor_id);

-- 6. Add course_id + status to activities (activities currently only have lesson_id)
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status    VARCHAR(20) NOT NULL DEFAULT 'draft'
                                     CHECK (status IN ('draft', 'published', 'archived'));

-- Back-fill course_id from lesson → course
UPDATE activities a
SET course_id = l.course_id
FROM lessons l
WHERE l.id = a.lesson_id AND a.course_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_activities_course ON activities(course_id);

-- 7. Add phone column to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

COMMIT;
