BEGIN;

-- Ensure content column is nullable and defaults to empty string
ALTER TABLE IF EXISTS announcements 
  ALTER COLUMN content DROP NOT NULL,
  ALTER COLUMN content SET DEFAULT '';

-- Ensure message column exists with default
ALTER TABLE IF EXISTS announcements 
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';

-- Ensure audience column exists with default
ALTER TABLE IF EXISTS announcements 
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';

-- Ensure priority column exists with default
ALTER TABLE IF EXISTS announcements 
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal';

-- Ensure date columns exist
ALTER TABLE IF EXISTS announcements 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Ensure is_active flag exists for easy toggling if needed
ALTER TABLE IF EXISTS announcements 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Sync content and message for any existing records
UPDATE announcements SET content = message WHERE (content IS NULL OR content = '') AND message IS NOT NULL;
UPDATE announcements SET message = content WHERE (message IS NULL OR message = '') AND content IS NOT NULL;

COMMIT;
