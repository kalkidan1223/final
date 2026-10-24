-- ============================================================================
-- MIGRATION: Migrate Students from Age Groups to Grade Levels
-- Brana Youth - Grade-Based Learning System
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Migrate existing students from age_group_id to grade_level_id
-- ----------------------------------------------------------------------------
-- Map age groups to grade levels (based on age ranges)
-- We'll use a simple mapping based on the child's age

UPDATE students
SET grade_level_id = (
  CASE
    WHEN date_of_birth IS NULL THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_1' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) BETWEEN 5 AND 6 THEN (SELECT id FROM grade_levels WHERE code = 'KG1' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) = 6 THEN (SELECT id FROM grade_levels WHERE code = 'KG2' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) = 7 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_1' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) = 8 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_2' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) = 9 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_3' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) = 10 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_4' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) = 11 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_5' LIMIT 1)
    WHEN EXTRACT(YEAR FROM age(date_of_birth)) >= 12 THEN (SELECT id FROM grade_levels WHERE code = 'GRADE_6' LIMIT 1)
    ELSE (SELECT id FROM grade_levels WHERE code = 'GRADE_1' LIMIT 1)
  END
)
WHERE grade_level_id IS NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK (for testing purposes only)
-- ============================================================================
-- ROLLBACK;
