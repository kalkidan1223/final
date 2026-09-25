-- ============================================================================
-- Migration 022: Fix activities status check constraint
-- Ensures the status column has the correct CHECK constraint
-- ============================================================================

BEGIN;

-- Drop the old constraint if it exists (it might have wrong values)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_status_check;

-- Ensure status column exists with correct default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' AND column_name = 'status'
    ) THEN
        ALTER TABLE activities 
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
    END IF;
END$$;

-- Add the correct constraint
ALTER TABLE activities
ADD CONSTRAINT activities_status_check 
CHECK (status IN ('active', 'inactive', 'archived'));

-- Update any existing rows with invalid status values to 'active'
UPDATE activities SET status = 'active' WHERE status NOT IN ('active', 'inactive', 'archived');

COMMIT;
