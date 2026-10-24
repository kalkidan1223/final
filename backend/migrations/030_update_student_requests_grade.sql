-- ============================================================================
-- MIGRATION: Update student_registration_requests to use grade_level_id
-- ============================================================================

BEGIN;

-- Add grade_level_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_registration_requests' AND column_name = 'grade_level_id'
    ) THEN
        ALTER TABLE student_registration_requests ADD COLUMN grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for grade_level_id
CREATE INDEX IF NOT EXISTS idx_student_requests_grade ON student_registration_requests(grade_level_id);

-- Note: We keep the old 'grade' column for backward compatibility with existing data
-- New registrations will use grade_level_id

COMMIT;
