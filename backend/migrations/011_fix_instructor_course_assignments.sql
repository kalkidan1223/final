-- Migration 011: Fix Instructor Course Assignments to use Available Courses
-- Changes instructor_courses to reference age_group_available_courses instead of courses table

BEGIN;

-- Drop the old foreign key constraint
ALTER TABLE instructor_courses 
DROP CONSTRAINT IF EXISTS instructor_courses_course_id_fkey;

-- Rename the column to be clearer when migration 011 has not run yet
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'instructor_courses'
		  AND column_name = 'course_id'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'instructor_courses'
		  AND column_name = 'available_course_id'
	) THEN
		ALTER TABLE instructor_courses
		RENAME COLUMN course_id TO available_course_id;
	END IF;
END $$;

-- Add new foreign key to age_group_available_courses
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'instructor_courses_available_course_id_fkey'
		  AND conrelid = 'instructor_courses'::regclass
	) THEN
		ALTER TABLE instructor_courses
		ADD CONSTRAINT instructor_courses_available_course_id_fkey
		FOREIGN KEY (available_course_id)
		REFERENCES age_group_available_courses(id)
		ON DELETE CASCADE;
	END IF;
END $$;

-- Update the unique constraint
ALTER TABLE instructor_courses 
DROP CONSTRAINT IF EXISTS instructor_courses_instructor_id_course_id_key;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'instructor_courses_instructor_id_available_course_id_key'
		  AND conrelid = 'instructor_courses'::regclass
	) THEN
		ALTER TABLE instructor_courses
		ADD CONSTRAINT instructor_courses_instructor_id_available_course_id_key
		UNIQUE(instructor_id, available_course_id);
	END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_instructor_courses_course;
CREATE INDEX IF NOT EXISTS idx_instructor_courses_available_course ON instructor_courses(available_course_id);

COMMIT;
