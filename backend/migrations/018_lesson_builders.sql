-- ============================================================================
-- Migration 018: Instructor lesson content builders
-- Extends materials, videos, activities, quizzes and quiz_questions so the
-- lesson page can use structured, interactive builders instead of simple
-- inline forms. All statements auto-commit so ALTER TYPE ... ADD VALUE works
-- on any supported PostgreSQL version.
-- ============================================================================

-- Learning materials: new types + optional thumbnail.
ALTER TYPE material_type ADD VALUE IF NOT EXISTS 'presentation';
ALTER TYPE material_type ADD VALUE IF NOT EXISTS 'other';
ALTER TABLE learning_materials
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Videos: source type (youtube link vs uploaded file).
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'youtube'
  CHECK (source_type IN ('youtube', 'upload'));

UPDATE videos SET source_type = 'upload' WHERE video_url LIKE '/uploads/%';

-- Activities: builder fields + per-type configuration stored as JSONB.
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'listening';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'picture_selection';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'file_submission';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'short_answer';

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner'
  CHECK (difficulty IN ('beginner', 'easy', 'medium', 'hard', 'advanced')),
  ADD COLUMN IF NOT EXISTS estimated_time_minutes INT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_resubmission BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activity_config JSONB,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'archived'));

CREATE INDEX IF NOT EXISTS idx_activities_lesson_order ON activities(lesson_id, display_order);

-- Quizzes: attempt limit + presentation settings.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS attempt_limit INT NOT NULL DEFAULT 1 CHECK (attempt_limit > 0),
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_result_immediately BOOLEAN NOT NULL DEFAULT TRUE;

-- Quiz questions: more types, per-question feedback and config (media URLs).
ALTER TYPE quiz_question_type ADD VALUE IF NOT EXISTS 'short_answer';
ALTER TYPE quiz_question_type ADD VALUE IF NOT EXISTS 'picture';
ALTER TYPE quiz_question_type ADD VALUE IF NOT EXISTS 'audio';

ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS question_config JSONB;