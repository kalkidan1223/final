-- ============================================================================
-- RESULTS AND NOTIFICATIONS SYSTEM EXPANSION
-- ============================================================================
-- This migration expands the notifications system to support:
-- - Student-specific notifications (not just user-based)
-- - Different notification types (quiz results, activity graded, new course, new lesson)
-- - Links to related entities (courses, lessons, activities, quizzes, results)
-- ============================================================================

BEGIN;

-- 1. Expand notification types
CREATE TYPE child_notification_type AS ENUM (
    'quiz_result',
    'activity_graded',
    'new_course',
    'new_lesson',
    'course_completed',
    'lesson_completed',
    'general'
);

-- 2. Create new child-specific notifications table
CREATE TABLE child_notifications (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type            child_notification_type NOT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    related_course_id   BIGINT REFERENCES courses(id) ON DELETE SET NULL,
    related_lesson_id   BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    related_activity_id BIGINT REFERENCES activities(id) ON DELETE SET NULL,
    related_quiz_id     BIGINT REFERENCES quizzes(id) ON DELETE SET NULL,
    related_result_id   BIGINT, -- Will reference quiz_results or activity_submissions
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_child_notifications_student ON child_notifications(student_id, is_read);
CREATE INDEX idx_child_notifications_type ON child_notifications(type);
CREATE INDEX idx_child_notifications_course ON child_notifications(related_course_id);

-- 3. Add percentage field to quiz_results for easier display
ALTER TABLE quiz_results ADD COLUMN percentage NUMERIC(5,2);
ALTER TABLE quiz_results ADD COLUMN attempt_number INT NOT NULL DEFAULT 1;
ALTER TABLE quiz_results ADD COLUMN is_passed BOOLEAN;
ALTER TABLE quiz_results ADD COLUMN passing_score NUMERIC(5,2);

-- 4. Add percentage field to activity_submissions
ALTER TABLE activity_submissions ADD COLUMN percentage NUMERIC(5,2);
ALTER TABLE activity_submissions ADD COLUMN graded_at TIMESTAMPTZ;

-- 5. Add constraint to ensure percentage is between 0 and 100
ALTER TABLE quiz_results ADD CONSTRAINT check_quiz_percentage CHECK (percentage BETWEEN 0 AND 100);
ALTER TABLE activity_submissions ADD CONSTRAINT check_activity_percentage CHECK (percentage BETWEEN 0 AND 100);

COMMIT;
