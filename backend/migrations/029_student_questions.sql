-- ============================================================================
-- 029: Student–Instructor Question & Answer System
-- ============================================================================
-- Lets a child ask their assigned instructor for help on a course / lesson.
--
-- BUSINESS RULE (enforced in the API with a per-student advisory lock):
--   A child may hold at most TWO questions with status 'WAITING_FOR_ANSWER'
--   at any moment, across all courses and lessons. Answering a question
--   releases a slot.
--
-- Only 'WAITING_FOR_ANSWER' counts toward the limit. 'ANSWERED' does not.
-- 'CLOSED' is reserved for a future explicit closure workflow and is never
-- produced by the current code, so it also does not count.
--
-- Two tables are added:
--   student_questions         — one row per question a child asks
--   student_question_answers  — one row per instructor response (history kept)
--
-- Existing tables are reused:
--   students, instructors, courses, lessons (FK targets)
--   notifications        — instructor alert when a child asks
--   child_notifications  — child alert when a teacher answers
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ENUM EXTENSIONS (append-only, existing rows untouched)
-- ----------------------------------------------------------------------------
-- Instructor-facing alert kind on the generic notifications table.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'question';

-- Child-facing alert kind on the child_notifications table.
ALTER TYPE child_notification_type ADD VALUE IF NOT EXISTS 'question_answered';

-- ----------------------------------------------------------------------------
-- 2. STUDENT QUESTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE student_questions (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    -- The instructor the question was routed to (owning instructor of the course
    -- at the moment the child asked). Kept for audit even if the course is later
    -- reassigned.
    instructor_id   BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    course_id       BIGINT REFERENCES courses(id) ON DELETE SET NULL,
    lesson_id       BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    -- Optional polymorphic reference to the exact learning resource the child
    -- was looking at when they asked (video / material / activity / quiz).
    resource_type   VARCHAR(20),
    resource_id     BIGINT,
    question_text   TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'WAITING_FOR_ANSWER'
                    CHECK (status IN ('WAITING_FOR_ANSWER', 'ANSWERED', 'CLOSED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at     TIMESTAMPTZ,
    CHECK (resource_type IS NULL OR resource_type IN ('video', 'material', 'activity', 'quiz'))
);

-- Pending-question lookups by child (the hot path for the two-question limit).
CREATE INDEX idx_student_questions_student_status ON student_questions(student_id, status);
-- Instructor question queue (oldest waiting first).
CREATE INDEX idx_student_questions_instructor_status ON student_questions(instructor_id, status, created_at);
-- Status-only filtering for summary cards and dashboards.
CREATE INDEX idx_student_questions_status ON student_questions(status);
CREATE INDEX idx_student_questions_course ON student_questions(course_id);
CREATE INDEX idx_student_questions_lesson ON student_questions(lesson_id);

-- ----------------------------------------------------------------------------
-- 3. STUDENT QUESTION ANSWERS (conversation history is preserved)
-- ----------------------------------------------------------------------------
CREATE TABLE student_question_answers (
    id              BIGSERIAL PRIMARY KEY,
    question_id     BIGINT NOT NULL REFERENCES student_questions(id) ON DELETE CASCADE,
    instructor_id   BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    answer_text     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_question_answers_question ON student_question_answers(question_id, created_at);

-- ----------------------------------------------------------------------------
-- 4. LINK COLUMNS SO A NOTIFICATION CAN OPEN ITS QUESTION DIRECTLY
-- ----------------------------------------------------------------------------
ALTER TABLE notifications        ADD COLUMN IF NOT EXISTS related_question_id BIGINT REFERENCES student_questions(id) ON DELETE CASCADE;
ALTER TABLE child_notifications  ADD COLUMN IF NOT EXISTS related_question_id BIGINT REFERENCES student_questions(id) ON DELETE CASCADE;

COMMIT;
