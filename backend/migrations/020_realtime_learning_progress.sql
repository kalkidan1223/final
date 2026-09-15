-- ============================================================================
-- Migration 020: Real-Time Learning Progress & Content Completion Engine
-- ============================================================================

BEGIN;

-- 1. Active Learning Sessions (tracks active time with visibility & focus detection)
CREATE TABLE IF NOT EXISTS learning_sessions (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_active_seconds INT NOT NULL DEFAULT 0,
    ended_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' -- 'in_progress', 'paused', 'completed'
);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_student_lesson ON learning_sessions(student_id, lesson_id);

-- 2. Video Progress & Unique Watch Intervals
CREATE TABLE IF NOT EXISTS student_video_progress (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    duration_seconds INT NOT NULL DEFAULT 0,
    watched_seconds INT NOT NULL DEFAULT 0, -- unique validated watched seconds
    last_position_seconds INT NOT NULL DEFAULT 0,
    progress_percentage INT NOT NULL DEFAULT 0,
    play_count INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress', -- 'not_started', 'in_progress', 'completed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, video_id)
);

CREATE TABLE IF NOT EXISTS student_video_watch_intervals (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    start_seconds NUMERIC(8,2) NOT NULL,
    end_seconds NUMERIC(8,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_intervals_student_video ON student_video_watch_intervals(student_id, video_id);

-- 3. Material Progress (Audio, PDF, Images)
CREATE TABLE IF NOT EXISTS student_material_progress (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    material_id BIGINT NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,
    duration_seconds INT NOT NULL DEFAULT 0,
    listened_seconds INT NOT NULL DEFAULT 0,
    last_position_seconds INT NOT NULL DEFAULT 0,
    pages_viewed INT NOT NULL DEFAULT 0,
    total_pages INT NOT NULL DEFAULT 1,
    progress_percentage INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress', -- 'not_started', 'in_progress', 'completed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, material_id)
);

-- 4. Activity Progress Tracking
CREATE TABLE IF NOT EXISTS student_activity_progress (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'submitted', 'graded', 'completed'
    progress_percentage INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, activity_id)
);

-- 5. Quiz Attempts & Passing Criteria
CREATE TABLE IF NOT EXISTS student_quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    score NUMERIC(6,2),
    total_points NUMERIC(6,2),
    percentage NUMERIC(5,2),
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'completed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

COMMIT;
