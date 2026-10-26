-- ============================================================================
-- MIGRATION: Migrate Students from Age Groups to Grade Levels
-- Brana Youth - Grade-Based Learning System
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Use a previously recorded educational choice when available.
-- ----------------------------------------------------------------------------
-- A child's date of birth does not determine their grade. Older records with no
-- recorded grade are deliberately left unassigned for an administrator to review.
UPDATE student_registration_requests sr
SET grade_level_id = gl.id
FROM grade_levels gl
WHERE sr.grade_level_id IS NULL
  AND regexp_replace(lower(COALESCE(sr.current_grade, sr.grade, '')), '[^a-z0-9]', '', 'g')
      IN (regexp_replace(lower(gl.code), '[^a-z0-9]', '', 'g'),
          regexp_replace(lower(gl.name), '[^a-z0-9]', '', 'g'));

UPDATE students
SET grade_level_id = sr.grade_level_id
FROM student_registration_requests sr
WHERE students.grade_level_id IS NULL
  AND sr.parent_id = students.parent_id
  AND lower(sr.student_full_name) = lower(students.full_name)
  AND sr.date_of_birth = students.date_of_birth
  AND sr.grade_level_id IS NOT NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK (for testing purposes only)
-- ============================================================================
-- ROLLBACK;
