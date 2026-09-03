-- Migration 012: Link courses table to age_group_available_courses
-- This creates the missing connection between curriculum catalog and actual course instances

BEGIN;

-- Add foreign key to link courses to their curriculum definition
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS available_course_id BIGINT REFERENCES age_group_available_courses(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_available_course ON courses(available_course_id);

-- Add constraint: title and age_group must match the available course if linked
-- (We'll enforce this in application code, not database constraint)

COMMENT ON COLUMN courses.available_course_id IS 'Links this course instance to the curriculum catalog entry it implements';

COMMIT;
