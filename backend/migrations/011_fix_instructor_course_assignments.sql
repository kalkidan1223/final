-- Migration 011: Fix Instructor Course Assignments to use Available Courses
-- Changes instructor_courses to reference age_group_available_courses instead of courses table

BEGIN;

-- Drop the old foreign key constraint
ALTER TABLE instructor_courses 
DROP CONSTRAINT IF EXISTS instructor_courses_course_id_fkey;

-- Rename the column to be clearer
ALTER TABLE instructor_courses 
RENAME COLUMN course_id TO available_course_id;

-- Add new foreign key to age_group_available_courses
ALTER TABLE instructor_courses 
ADD CONSTRAINT instructor_courses_available_course_id_fkey 
FOREIGN KEY (available_course_id) 
REFERENCES age_group_available_courses(id) 
ON DELETE CASCADE;

-- Update the unique constraint
ALTER TABLE instructor_courses 
DROP CONSTRAINT IF EXISTS instructor_courses_instructor_id_course_id_key;

ALTER TABLE instructor_courses 
ADD CONSTRAINT instructor_courses_instructor_id_available_course_id_key 
UNIQUE(instructor_id, available_course_id);

-- Update indexes
DROP INDEX IF EXISTS idx_instructor_courses_course;
CREATE INDEX idx_instructor_courses_available_course ON instructor_courses(available_course_id);

COMMIT;
