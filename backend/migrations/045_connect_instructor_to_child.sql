-- ============================================================================
-- Migration 045: Connect Instructor Lesson Creation to Child Experience
-- ----------------------------------------------------------------------------
-- 1. Allow learning_materials to store text explanations, learning cards,
--    and demonstrations without requiring a physical file_url.
-- 2. Add content and metadata JSONB columns to learning_materials.
-- 3. Ensure lesson_resources cascades and supports all learning content items.
-- ============================================================================

BEGIN;

-- Allow learning_materials to have null file_url (for text blocks / card blocks)
ALTER TABLE learning_materials
  ALTER COLUMN file_url DROP NOT NULL;

-- Add rich content and metadata columns to learning_materials
ALTER TABLE learning_materials
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Ensure activities table has activity_config and course_id
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS activity_config JSONB,
  ADD COLUMN IF NOT EXISTS course_id BIGINT;

-- Ensure quizzes table has attempt_limit, show_result_immediately
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS attempt_limit INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_result_immediately BOOLEAN NOT NULL DEFAULT TRUE;

-- Add index on lesson_resources for fast retrieval
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lookup 
  ON lesson_resources (lesson_id, display_order);

COMMIT;

