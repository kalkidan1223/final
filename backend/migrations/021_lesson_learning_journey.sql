-- ============================================================================
-- Lesson Learning Journey
-- Manages resource ordering, completion tracking, and sequential learning
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- LESSON RESOURCES (replaces hardcoded resource tabs)
-- ----------------------------------------------------------------------------
-- This table defines what resources belong to a lesson and in what order
-- Instructors control the learning sequence through display_order
CREATE TABLE lesson_resources (
    id              BIGSERIAL PRIMARY KEY,
    lesson_id       BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    resource_type   VARCHAR(50) NOT NULL, -- 'video', 'material', 'activity', 'quiz'
    resource_id     BIGINT NOT NULL,      -- polymorphic reference
    display_order   INT NOT NULL DEFAULT 0,
    is_required     BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE, -- initial lock state
    unlock_after_resource_id BIGINT REFERENCES lesson_resources(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lesson_id, resource_type, resource_id),
    CHECK (resource_type IN ('video', 'material', 'activity', 'quiz'))
);
CREATE INDEX idx_lesson_resources_lesson ON lesson_resources(lesson_id, display_order);
CREATE INDEX idx_lesson_resources_unlock ON lesson_resources(unlock_after_resource_id);

-- ----------------------------------------------------------------------------
-- STUDENT RESOURCE PROGRESS (detailed tracking for each resource)
-- ----------------------------------------------------------------------------
CREATE TABLE student_resource_progress (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_resource_id BIGINT NOT NULL REFERENCES lesson_resources(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, lesson_resource_id),
    CHECK (status IN ('not_started', 'in_progress', 'completed'))
);
CREATE INDEX idx_student_resource_progress_student ON student_resource_progress(student_id);
CREATE INDEX idx_student_resource_progress_resource ON student_resource_progress(lesson_resource_id);
CREATE INDEX idx_student_resource_progress_status ON student_resource_progress(student_id, status);

-- ----------------------------------------------------------------------------
-- STUDENT VIDEO PROGRESS (granular video watching tracking)
-- ----------------------------------------------------------------------------
-- Migration 020 already creates this table. Add only the lesson-journey
-- fields so both progress tracking implementations can use it.
ALTER TABLE student_video_progress
    ADD COLUMN IF NOT EXISTS watch_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_position_seconds INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_watch_time_seconds INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS required_percentage NUMERIC(5,2) NOT NULL DEFAULT 90,
    ADD COLUMN IF NOT EXISTS last_watched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS time_spent_seconds INT NOT NULL DEFAULT 0;
CREATE INDEX idx_student_video_progress_student ON student_video_progress(student_id);
CREATE INDEX idx_student_video_progress_video ON student_video_progress(video_id);

-- ----------------------------------------------------------------------------
-- STUDENT MATERIAL PROGRESS (reading/viewing tracking)
-- ----------------------------------------------------------------------------
-- Migration 020 already creates this table. Add the lesson-journey fields.
ALTER TABLE student_material_progress
    ADD COLUMN IF NOT EXISTS view_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS required_percentage NUMERIC(5,2) NOT NULL DEFAULT 80,
    ADD COLUMN IF NOT EXISTS time_spent_seconds INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;
CREATE INDEX idx_student_material_progress_student ON student_material_progress(student_id);
CREATE INDEX idx_student_material_progress_material ON student_material_progress(material_id);

-- ----------------------------------------------------------------------------
-- STUDENT LESSON PROGRESS (aggregated lesson completion)
-- ----------------------------------------------------------------------------
CREATE TABLE student_lesson_progress (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id       BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'not_started',
    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    required_resources_completed INT NOT NULL DEFAULT 0,
    total_required_resources INT NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, lesson_id),
    CHECK (status IN ('not_started', 'in_progress', 'completed'))
);
CREATE INDEX idx_student_lesson_progress_student ON student_lesson_progress(student_id);
CREATE INDEX idx_student_lesson_progress_lesson ON student_lesson_progress(lesson_id);
CREATE INDEX idx_student_lesson_progress_status ON student_lesson_progress(student_id, status);

-- ----------------------------------------------------------------------------
-- COURSE SEQUENTIAL LEARNING SETTINGS
-- ----------------------------------------------------------------------------
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sequential_learning BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ----------------------------------------------------------------------------
-- LESSON LOCKING
-- ----------------------------------------------------------------------------
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS unlock_after_lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- LEARNING ACHIEVEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE student_achievements (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL, -- 'first_lesson', 'course_complete', 'streak_5', etc.
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    icon            VARCHAR(100),
    course_id       BIGINT REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id       BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, achievement_type, course_id, lesson_id)
);
CREATE INDEX idx_student_achievements_student ON student_achievements(student_id);
CREATE INDEX idx_student_achievements_type ON student_achievements(achievement_type);

-- ----------------------------------------------------------------------------
-- LEARNING SESSION TRACKING
-- ----------------------------------------------------------------------------
-- Migration 020 already creates this table. Add the lesson-journey session
-- fields while retaining the real-time tracking columns.
ALTER TABLE learning_sessions
    ADD COLUMN IF NOT EXISTS session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS session_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS duration_seconds INT,
    ADD COLUMN IF NOT EXISTS activities_completed INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS resources_accessed INT NOT NULL DEFAULT 0;
CREATE INDEX idx_learning_sessions_student ON learning_sessions(student_id);
CREATE INDEX idx_learning_sessions_course ON learning_sessions(course_id);
CREATE INDEX idx_learning_sessions_date ON learning_sessions(session_start);

-- ----------------------------------------------------------------------------
-- LEARNING STREAKS
-- ----------------------------------------------------------------------------
CREATE TABLE learning_streaks (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    current_streak  INT NOT NULL DEFAULT 0,
    longest_streak  INT NOT NULL DEFAULT 0,
    last_activity_date DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_learning_streaks_student ON learning_streaks(student_id);

COMMIT;
