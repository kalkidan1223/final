-- Migration 010: Age Group Available Courses
-- This table defines which courses are available/established for each age group
-- Admins establish courses for age groups, then assign instructors to teach those courses

BEGIN;

-- Junction table: which courses are available for an age group
CREATE TABLE IF NOT EXISTS age_group_available_courses (
    id BIGSERIAL PRIMARY KEY,
    age_group_id INT NOT NULL REFERENCES age_groups(id) ON DELETE CASCADE,
    course_title VARCHAR(255) NOT NULL,
    course_description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    established_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    established_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(age_group_id, course_title)
);

CREATE INDEX IF NOT EXISTS idx_age_group_available_courses_age_group ON age_group_available_courses(age_group_id);
CREATE INDEX IF NOT EXISTS idx_age_group_available_courses_active ON age_group_available_courses(is_active);

-- Add a comment
COMMENT ON TABLE age_group_available_courses IS 'Defines which courses are available for each age group. Admins establish these first, then assign instructors to teach them.';

COMMIT;
