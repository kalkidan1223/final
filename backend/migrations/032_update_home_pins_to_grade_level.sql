-- ============================================================================
-- MIGRATION: Update home_pins table to use grade_level_id
-- Brana Youth - Grade-Based Learning System
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Add grade_level_id column to home_pins
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'home_pins' AND column_name = 'grade_level_id'
    ) THEN
        ALTER TABLE home_pins ADD COLUMN grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Migrate existing pins from age_group_id to grade_level_id
-- ----------------------------------------------------------------------------
UPDATE home_pins
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
-- STEP 3: Update the unique constraint to use grade_level_id
-- ----------------------------------------------------------------------------
-- Drop old constraint
ALTER TABLE home_pins DROP CONSTRAINT IF EXISTS home_pins_age_group_id_resource_type_resource_id_key;

-- Add new constraint
ALTER TABLE home_pins ADD CONSTRAINT home_pins_grade_level_id_resource_type_resource_id_key
UNIQUE (grade_level_id, resource_type, resource_id);

-- ----------------------------------------------------------------------------
-- STEP 4: Create index for grade_level_id
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_home_pins_grade_level ON home_pins(grade_level_id);

COMMIT;

-- ============================================================================
-- ROLLBACK (for testing purposes only)
-- ============================================================================
-- ROLLBACK;
