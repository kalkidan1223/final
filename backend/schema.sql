-- ============================================================================
-- Children Learning Hub with AI-Based Learning Recommendation System
-- PostgreSQL Database Schema
-- Brana Uz Academy School — Final Year Project
-- ============================================================================
-- Design notes:
--  * Category 1 students (age 5–10) have NO login account. They are linked
--    directly to a parent and accessed only through the parent's account.
--  * Category 2 students (age 11–12) have their own user account.
--  * `students.user_id` is therefore NULLABLE — NULL for Category 1 children.
--  * A CHECK constraint enforces that Category 1 students never have a
--    user_id, and Category 2 students always do.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'parent', 'student');

CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE material_type AS ENUM ('video', 'image', 'pdf', 'document', 'audio');

CREATE TYPE activity_type AS ENUM (
    'writing', 'reading', 'drawing', 'speaking', 'worksheet',
    'matching', 'coloring', 'counting', 'fill_in_the_blank',
    'drag_and_drop', 'multiple_choice', 'true_false', 'puzzle',
    'story_reading', 'pronunciation', 'vocabulary_practice',
    'letter_tracing', 'number_tracing'
);

CREATE TYPE submitted_by_type AS ENUM ('student', 'parent');

CREATE TYPE submission_status AS ENUM ('pending', 'reviewed', 'graded');

CREATE TYPE quiz_question_type AS ENUM ('mcq', 'true_false', 'fill_in_the_blank', 'matching');

CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TYPE recommendation_type AS ENUM ('lesson', 'video', 'activity', 'revision', 'practice_material', 'performance_prediction');

CREATE TYPE notification_type AS ENUM ('info', 'alert', 'reminder', 'feedback', 'message');

-- ----------------------------------------------------------------------------
-- CORE IDENTITY
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20),
    profile_image_url TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE age_groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,      -- e.g. '5-7', '8-10', '11-12'
    min_age     SMALLINT NOT NULL,
    max_age     SMALLINT NOT NULL,
    requires_account BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE for 5-10 groups
    CHECK (min_age <= max_age)
);

-- ----------------------------------------------------------------------------
-- ROLE PROFILE TABLES (1-to-1 extensions of users)
-- ----------------------------------------------------------------------------
CREATE TABLE admins (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE instructors (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio             TEXT,
    qualification   VARCHAR(255),
    specialty       VARCHAR(150),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parents (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    address         TEXT,
    emergency_contact VARCHAR(20),
    date_of_birth   DATE,
    guardian_relationship VARCHAR(50) NOT NULL DEFAULT 'parent',
    in_person_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_notes TEXT,
    verified_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students cover BOTH categories. user_id is NULL for Category 1 (5-10).
CREATE TABLE students (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    parent_id       BIGINT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    age_group_id    INT NOT NULL REFERENCES age_groups(id),
    full_name       VARCHAR(150) NOT NULL,
    date_of_birth   DATE NOT NULL,
    gender          VARCHAR(20),
    profile_image_url TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_students_age_group ON students(age_group_id);

-- Enforce: Category 1 (requires_account = FALSE) => user_id IS NULL
--          Category 2 (requires_account = TRUE)  => user_id IS NOT NULL
CREATE OR REPLACE FUNCTION enforce_student_account_rule() RETURNS TRIGGER AS $$
DECLARE
    needs_account BOOLEAN;
BEGIN
    SELECT requires_account INTO needs_account FROM age_groups WHERE id = NEW.age_group_id;
    IF needs_account AND NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'Students aged 11-12 must have a linked user account';
    ELSIF NOT needs_account AND NEW.user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Students aged 5-10 must NOT have a login account (parent-managed only)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_account_rule
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION enforce_student_account_rule();

-- ----------------------------------------------------------------------------
-- COURSES & LESSONS
-- ----------------------------------------------------------------------------
CREATE TABLE courses (
    id              BIGSERIAL PRIMARY KEY,
    instructor_id   BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    age_group_id    INT NOT NULL REFERENCES age_groups(id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    thumbnail_url   TEXT,
    status          course_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_age_group ON courses(age_group_id);

CREATE TABLE lessons (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    order_index     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, order_index)
);
CREATE INDEX idx_lessons_course ON lessons(course_id);

-- ----------------------------------------------------------------------------
-- LEARNING MATERIALS & VIDEOS
-- ----------------------------------------------------------------------------
CREATE TABLE learning_materials (
    id              BIGSERIAL PRIMARY KEY,
    lesson_id       BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    type            material_type NOT NULL,
    title           VARCHAR(200) NOT NULL,
    file_url        TEXT NOT NULL,
    uploaded_by     BIGINT NOT NULL REFERENCES instructors(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_materials_lesson ON learning_materials(lesson_id);

CREATE TABLE videos (
    id              BIGSERIAL PRIMARY KEY,
    lesson_id       BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    video_url       TEXT NOT NULL,
    thumbnail_url   TEXT,
    duration_seconds INT,
    uploaded_by     BIGINT NOT NULL REFERENCES instructors(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_lesson ON videos(lesson_id);

-- ----------------------------------------------------------------------------
-- QUIZZES
-- ----------------------------------------------------------------------------
CREATE TABLE quizzes (
    id              BIGSERIAL PRIMARY KEY,
    lesson_id       BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    time_limit_seconds INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_lesson ON quizzes(lesson_id);

CREATE TABLE quiz_questions (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    question_type   quiz_question_type NOT NULL,
    options         JSONB,                 -- e.g. ["A","B","C","D"] for MCQ
    correct_answer  TEXT NOT NULL,
    points          INT NOT NULL DEFAULT 1,
    order_index     INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE quiz_results (
    id              BIGSERIAL PRIMARY KEY,
    quiz_id         BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score           NUMERIC(6,2) NOT NULL,
    total_points    NUMERIC(6,2) NOT NULL,
    answers         JSONB,                 -- submitted answers per question_id
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (quiz_id, student_id, submitted_at)
);
CREATE INDEX idx_results_student ON quiz_results(student_id);
CREATE INDEX idx_results_quiz ON quiz_results(quiz_id);

-- ----------------------------------------------------------------------------
-- ACTIVITIES
-- ----------------------------------------------------------------------------
CREATE TABLE activities (
    id              BIGSERIAL PRIMARY KEY,
    lesson_id       BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    instructor_id   BIGINT NOT NULL REFERENCES instructors(id),
    age_group_id    INT NOT NULL REFERENCES age_groups(id),
    title           VARCHAR(200) NOT NULL,
    activity_type   activity_type NOT NULL,
    instructions    TEXT NOT NULL,
    resource_url    TEXT,                  -- e.g. worksheet PDF to download
    max_score       NUMERIC(6,2) NOT NULL DEFAULT 100,
    requires_upload BOOLEAN NOT NULL DEFAULT FALSE,
    auto_gradable   BOOLEAN NOT NULL DEFAULT FALSE, -- e.g. matching, counting
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_lesson ON activities(lesson_id);
CREATE INDEX idx_activities_age_group ON activities(age_group_id);

CREATE TABLE activity_submissions (
    id              BIGSERIAL PRIMARY KEY,
    activity_id     BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submitted_by    submitted_by_type NOT NULL,   -- student (11-12) or parent (5-10)
    submission_url  TEXT,                          -- uploaded photo/audio/pdf
    submission_text TEXT,
    status          submission_status NOT NULL DEFAULT 'pending',
    score           NUMERIC(6,2),
    feedback        TEXT,
    reviewed_by     BIGINT REFERENCES instructors(id),
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ
);
CREATE INDEX idx_submissions_student ON activity_submissions(student_id);
CREATE INDEX idx_submissions_activity ON activity_submissions(activity_id);
CREATE INDEX idx_submissions_status ON activity_submissions(status);

-- ----------------------------------------------------------------------------
-- PROGRESS TRACKING
-- ----------------------------------------------------------------------------
CREATE TABLE progress (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id       BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id       BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
    status          progress_status NOT NULL DEFAULT 'not_started',
    completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    last_accessed_at TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_id, lesson_id)
);
CREATE INDEX idx_progress_student ON progress(student_id);
CREATE INDEX idx_progress_course ON progress(course_id);

-- Optional: attendance (referenced as an optional AI input signal)
CREATE TABLE attendance (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_date    DATE NOT NULL,
    present         BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (student_id, session_date)
);

-- ----------------------------------------------------------------------------
-- AI RECOMMENDATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE ai_recommendations (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    recommendation_type recommendation_type NOT NULL,
    recommended_item_id BIGINT,             -- polymorphic ref to lesson/video/activity id
    reason              TEXT,               -- human-readable explanation
    confidence_score    NUMERIC(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
    is_viewed           BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_recs_student ON ai_recommendations(student_id);
CREATE INDEX idx_ai_recs_type ON ai_recommendations(recommendation_type);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS & REPORTS
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE reports (
    id              BIGSERIAL PRIMARY KEY,
    generated_by    BIGINT NOT NULL REFERENCES users(id),
    report_type     VARCHAR(100) NOT NULL,   -- e.g. 'student_performance', 'course_summary'
    related_student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    data            JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_student ON reports(related_student_id);

-- ----------------------------------------------------------------------------
-- TEACHER-PARENT MESSAGING (supports "Communicate with Teachers")
-- ----------------------------------------------------------------------------
CREATE TABLE messages (
    id              BIGSERIAL PRIMARY KEY,
    sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id      BIGINT REFERENCES students(id) ON DELETE SET NULL, -- context (which child)
    body            TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_thread ON messages(sender_id, receiver_id);

COMMIT;

-- ============================================================================
-- SEED DATA: default age groups
-- ============================================================================
INSERT INTO age_groups (name, min_age, max_age, requires_account) VALUES
    ('5-7',   5, 7,  FALSE),
    ('8-9',   8, 9,  FALSE),
    ('10-12', 10, 12, TRUE);
