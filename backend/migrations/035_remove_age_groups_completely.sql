-- ============================================================================
-- MIGRATION: Remove Age Groups Completely
-- Brana Youth - Grade-Based Learning System
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Drop age_group_id columns from all tables
-- ----------------------------------------------------------------------------

-- Drop from activities (already has grade_level_id)
ALTER TABLE activities DROP COLUMN IF EXISTS age_group_id_old;
ALTER TABLE activities DROP COLUMN IF EXISTS age_group_id;

-- Drop from courses (already has grade_level_id)
ALTER TABLE courses DROP COLUMN IF EXISTS age_group_id;

-- Drop from instructor_assignments (already has grade_level_id)
ALTER TABLE instructor_assignments DROP COLUMN IF EXISTS age_group_id;

-- Drop from students (already has grade_level_id)
ALTER TABLE students DROP COLUMN IF EXISTS age_group_id;

-- Drop from quizzes (already has grade_level_id)
ALTER TABLE quizzes DROP COLUMN IF EXISTS age_group_id;

-- ----------------------------------------------------------------------------
-- STEP 2: Drop the age_groups table
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS age_groups CASCADE;

-- ----------------------------------------------------------------------------
-- STEP 3: Drop any foreign key constraints referencing age_groups
-- (CASCADE should handle this, but double-check)
-- ----------------------------------------------------------------------------

COMMIT;

-- ============================================================================
-- ROLLBACK (for testing purposes only)
-- ============================================================================
-- ROLLBACK;
