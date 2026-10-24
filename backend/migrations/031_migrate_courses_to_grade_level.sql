-- ============================================================================
-- MIGRATION: Migrate Courses from Age Groups to Grade Levels
-- Brana Youth - Grade-Based Learning System
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Add grade_level_id column to courses table
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'grade_level_id'
    ) THEN
        ALTER TABLE courses ADD COLUMN grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Migrate existing courses from age_group_id to grade_level_id
-- ----------------------------------------------------------------------------
-- Map age groups to grade levels (based on age ranges)
-- Age group 1 (Ages 5-6) -> KG1
-- Age group 2 (Ages 6-7) -> KG2
-- Age group 3 (Ages 7-8) -> Grade 1
-- Age group 4 (Ages 8-9) -> Grade 2
-- Age group 5 (Ages 9-10) -> Grade 3
-- Age group 6 (Ages 10-11) -> Grade 4
-- Age group 7 (Ages 11-12) -> Grade 5
-- Age group 8 (Ages 12-13) -> Grade 6

UPDATE courses
SET grade_level_id = (
  CASE age_group_id
    WHEN 1 THEN (SELECT id FROM grade_levels WHERE code = 'KG1' LIMIT 1)
    WHEN 2 THEN (SELECT id FROM grade_levels WHERE code = 'KG2' LIMIT 1)
    WHEN 3 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_1' LIMIT 1)
    WHEN 4 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_2' LIMIT 1)
    WHEN 5 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_3' LIMIT 1)
    WHEN 6 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_4' LIMIT 1)
    WHEN 7 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_5' LIMIT 1)
    WHEN 8 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_6' LIMIT 1)
    ELSE NULL
  END
)
WHERE age_group_id IS NOT NULL AND grade_level_id IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 3: Update home_pin_controller to use grade_level_id
-- ----------------------------------------------------------------------------
-- This will be done in the controller code, not in SQL

-- ----------------------------------------------------------------------------
-- STEP 4: Create index for grade_level_id on courses
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_courses_grade_level ON courses(grade_level_id);

COMMIT;

-- ============================================================================
-- ROLLBACK (for testing purposes only)
-- ============================================================================
-- ROLLBACK;
