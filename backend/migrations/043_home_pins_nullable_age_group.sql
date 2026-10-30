-- ============================================================================
-- Migration 042: Make home_pins.age_group_id nullable
-- The child home now keys off grade_level_id. age_group_id is legacy and
-- should not block inserts.
-- ============================================================================
BEGIN;
ALTER TABLE home_pins ALTER COLUMN age_group_id DROP NOT NULL;
COMMIT;