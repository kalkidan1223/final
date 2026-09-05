-- Migration 009: Instructor Course and Age Group Assignment Tables
-- This allows admins to restrict which courses and age groups an instructor can teach

BEGIN;

-- Junction table: instructor can be assigned to multiple age groups
CREATE TABLE IF NOT EXISTS instructor_age_groups (
    id BIGSERIAL PRIMARY KEY,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    age_group_id INT NOT NULL REFERENCES age_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(instructor_id, age_group_id)
);

CREATE INDEX IF NOT EXISTS idx_instructor_age_groups_instructor ON instructor_age_groups(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_age_groups_age_group ON instructor_age_groups(age_group_id);

-- Junction table: instructor can be assigned to multiple courses
CREATE TABLE IF NOT EXISTS instructor_courses (
    id BIGSERIAL PRIMARY KEY,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(instructor_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_instructor_courses_instructor ON instructor_courses(instructor_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'instructor_courses'
          AND column_name = 'available_course_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_instructor_courses_available_course
            ON instructor_courses(available_course_id);
    ELSE
        CREATE INDEX IF NOT EXISTS idx_instructor_courses_course
            ON instructor_courses(course_id);
    END IF;
END $$;

COMMIT;
