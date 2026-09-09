BEGIN;

-- ============================================================================
-- Migration 017: Instructor LMS — content management
-- Extends lessons, learning_materials, videos and quizzes so instructors can
-- fully manage course content per the Instructor Learning Management System
-- specification (create/edit/delete/deactivate/activate/reorder, statuses,
-- and richer lesson metadata).
-- ============================================================================

-- 1. Lessons: learning objectives, instructions, estimated duration, difficulty
-- level, content status, and classroom metadata inherited from the instructor
-- assignment (grade, section, academic year) at creation time.
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS learning_objectives       TEXT,
  ADD COLUMN IF NOT EXISTS instructions              TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT,
  ADD COLUMN IF NOT EXISTS difficulty_level          VARCHAR(20) NOT NULL DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS status                    VARCHAR(20) NOT NULL DEFAULT 'active'
                                                     CHECK (status IN ('active', 'inactive', 'archived')),
  ADD COLUMN IF NOT EXISTS grade                     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS section                   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS academic_year_id          INT REFERENCES academic_years(id) ON DELETE SET NULL;

-- Back-fill classroom metadata from the instructor assignment where available.
UPDATE lessons l
SET grade = ia.grade,
    section = ia.section,
    academic_year_id = ia.academic_year_id
FROM instructor_assignments ia
WHERE ia.course_id = l.course_id
  AND l.grade IS NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- 2. Learning materials: description, display order, content status.
ALTER TABLE learning_materials
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20) NOT NULL DEFAULT 'active'
                                         CHECK (status IN ('active', 'inactive', 'archived'));

CREATE INDEX IF NOT EXISTS idx_materials_lesson_order ON learning_materials(lesson_id, display_order);

-- 3. Videos: description, content status.
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'active'
                                       CHECK (status IN ('active', 'inactive', 'archived'));

-- 4. Quizzes: instructions, passing score, max score, content status.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS instructions  TEXT,
  ADD COLUMN IF NOT EXISTS passing_score NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS max_score     NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20) NOT NULL DEFAULT 'active'
                                         CHECK (status IN ('active', 'inactive', 'archived'));

COMMIT;