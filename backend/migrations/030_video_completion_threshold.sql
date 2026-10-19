-- ============================================================================
-- Migration 030: Configurable video completion threshold
-- ============================================================================
-- Allows an instructor to set the percentage of uniquely-watched content
-- required to mark a video as completed (default 90%, between 50 and 100).
-- ============================================================================

BEGIN;

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS completion_threshold NUMERIC(5,2) NOT NULL DEFAULT 90
  CHECK (completion_threshold BETWEEN 50 AND 100);

COMMIT;
