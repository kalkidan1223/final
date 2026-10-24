-- ============================================================================
-- MIGRATION: Replace Age-Based Groups with Grade-Based Curriculum
-- Brana Youth - Grade-Based Learning System
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 1: Create new grade_levels table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grade_levels (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,  -- e.g., 'KG1', 'KG2', 'GRADE_1'
    name            VARCHAR(100) NOT NULL,         -- e.g., 'Kindergarten 1', 'Grade 1'
    level_type      VARCHAR(20) NOT NULL,         -- 'kindergarten' or 'primary'
    sequence_order  INT NOT NULL UNIQUE,
    description     TEXT,
    min_age         SMALLINT,                      -- Optional: for age-appropriate UI
    max_age         SMALLINT,                      -- Optional: for age-appropriate UI
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- STEP 2: Create subjects table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,  -- e.g., 'MATH', 'ENG', 'AMH'
    name            VARCHAR(100) NOT NULL,         -- e.g., 'Mathematics', 'English', 'Amharic'
    description     TEXT,
    language        VARCHAR(50),                   -- e.g., 'English', 'Amharic'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- STEP 3: Create curriculum_versions table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_versions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,         -- e.g., 'Ethiopian National Curriculum 2024'
    version_code    VARCHAR(50) NOT NULL UNIQUE,    -- e.g., 'ENC-2024'
    effective_from  DATE NOT NULL,
    effective_until DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'deprecated'
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- STEP 4: Create curriculum_objectives table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curriculum_objectives (
    id                      SERIAL PRIMARY KEY,
    grade_level_id          INT NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
    subject_id              INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    curriculum_version_id   INT NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
    objective_code          VARCHAR(50) NOT NULL,    -- e.g., 'MATH-G1-001'
    title                   VARCHAR(300) NOT NULL,
    description             TEXT,
    sequence_order          INT NOT NULL DEFAULT 0,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (grade_level_id, subject_id, objective_code)
);

-- ----------------------------------------------------------------------------
-- STEP 5: Update students table to use grade_level_id
-- ----------------------------------------------------------------------------
-- Add grade_level_id column to students
ALTER TABLE students ADD COLUMN grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;

-- Add enrollment_status column
ALTER TABLE students ADD COLUMN enrollment_status VARCHAR(20) NOT NULL DEFAULT 'active'; -- 'active', 'withdrawn', 'completed'

-- Create index for grade_level_id
CREATE INDEX idx_students_grade_level ON students(grade_level_id);

-- ----------------------------------------------------------------------------
-- STEP 6: Update courses table to use grade_level_id and subject_id
-- ----------------------------------------------------------------------------
-- Add subject_id column to courses
ALTER TABLE courses ADD COLUMN subject_id INT REFERENCES subjects(id) ON DELETE SET NULL;

-- Add curriculum_version_id column to courses
ALTER TABLE courses ADD COLUMN curriculum_version_id INT REFERENCES curriculum_versions(id) ON DELETE SET NULL;

-- Create index for subject_id
CREATE INDEX idx_courses_subject ON courses(subject_id);

-- Create index for curriculum_version_id
CREATE INDEX idx_courses_curriculum ON courses(curriculum_version_id);

-- ----------------------------------------------------------------------------
-- STEP 7: Create course_instructor_assignments table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_instructor_assignments (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id   BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_primary      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (course_id, instructor_id)
);
CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON course_instructor_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_instructor ON course_instructor_assignments(instructor_id);

-- ----------------------------------------------------------------------------
-- STEP 8: Update activities table to use grade_level_id
-- ----------------------------------------------------------------------------
-- Rename age_group_id to grade_level_id (we'll migrate data later)
ALTER TABLE activities RENAME COLUMN age_group_id TO grade_level_id_old;

-- Add new grade_level_id column
ALTER TABLE activities ADD COLUMN grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;

-- Create index for new grade_level_id
CREATE INDEX idx_activities_grade_level ON activities(grade_level_id);

-- ----------------------------------------------------------------------------
-- STEP 9: Update quiz_question_type enum to add more types
-- ----------------------------------------------------------------------------
-- Note: 'short_answer', 'picture', and 'audio' already exist from previous migrations
-- 'multiple_select' and 'picture_selection' need to be added
-- PostgreSQL doesn't support IF NOT EXISTS for enum values, so we check first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum WHERE enumtypid = 'quiz_question_type'::regtype AND enumlabel = 'multiple_select'
    ) THEN
        ALTER TYPE quiz_question_type ADD VALUE 'multiple_select' AFTER 'mcq';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum WHERE enumtypid = 'quiz_question_type'::regtype AND enumlabel = 'picture_selection'
    ) THEN
        ALTER TYPE quiz_question_type ADD VALUE 'picture_selection' AFTER 'picture';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 10: Enhance quizzes table
-- ----------------------------------------------------------------------------
-- Check and add columns if they don't exist
DO $$
BEGIN
    -- quiz_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'quiz_type'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN quiz_type VARCHAR(20) NOT NULL DEFAULT 'practice';
    END IF;

    -- grade_level_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'grade_level_id'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;
    END IF;

    -- subject_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'subject_id'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN subject_id INT REFERENCES subjects(id) ON DELETE SET NULL;
    END IF;

    -- status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'status'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';
    END IF;

    -- passing_score
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'passing_score'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN passing_score NUMERIC(5,2) DEFAULT 70.00;
    END IF;

    -- max_attempts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'max_attempts'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN max_attempts INT DEFAULT 3;
    END IF;

    -- shuffle_questions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'shuffle_questions'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- shuffle_options
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'shuffle_options'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN shuffle_options BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- feedback_mode
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'feedback_mode'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN feedback_mode VARCHAR(20) DEFAULT 'immediate';
    END IF;

    -- allow_retry
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'allow_retry'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN allow_retry BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    -- created_by_instructor_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'created_by_instructor_id'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN created_by_instructor_id BIGINT REFERENCES instructors(id) ON DELETE SET NULL;
    END IF;

    -- published_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quizzes' AND column_name = 'published_at'
    ) THEN
        ALTER TABLE quizzes ADD COLUMN published_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes
CREATE INDEX idx_quizzes_grade ON quizzes(grade_level_id);
CREATE INDEX idx_quizzes_subject ON quizzes(subject_id);
CREATE INDEX idx_quizzes_status ON quizzes(status);

-- ----------------------------------------------------------------------------
-- STEP 11: Enhance quiz_questions table
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_questions' AND column_name = 'instruction_text'
    ) THEN
        ALTER TABLE quiz_questions ADD COLUMN instruction_text TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_questions' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE quiz_questions ADD COLUMN image_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_questions' AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE quiz_questions ADD COLUMN audio_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_questions' AND column_name = 'explanation'
    ) THEN
        ALTER TABLE quiz_questions ADD COLUMN explanation TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_questions' AND column_name = 'hint'
    ) THEN
        ALTER TABLE quiz_questions ADD COLUMN hint TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_questions' AND column_name = 'curriculum_objective_id'
    ) THEN
        ALTER TABLE quiz_questions ADD COLUMN curriculum_objective_id INT REFERENCES curriculum_objectives(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_questions' AND column_name = 'is_required'
    ) THEN
        ALTER TABLE quiz_questions ADD COLUMN is_required BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- Create index for curriculum_objective_id
CREATE INDEX idx_questions_objective ON quiz_questions(curriculum_objective_id);

-- ----------------------------------------------------------------------------
-- STEP 12: Create quiz_question_options table (separate from JSONB)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_question_options (
    id              BIGSERIAL PRIMARY KEY,
    question_id     BIGINT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text     TEXT NOT NULL,
    image_url       TEXT,
    audio_url       TEXT,
    sequence_order  INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_options_question ON quiz_question_options(question_id);

-- ----------------------------------------------------------------------------
-- STEP 13: Create quiz_attempts table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id                  BIGSERIAL PRIMARY KEY,
    quiz_id             BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id          BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attempt_number      INT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'graded', 'expired'
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at        TIMESTAMPTZ,
    graded_at           TIMESTAMPTZ,
    score               NUMERIC(6,2),
    max_score           NUMERIC(6,2),
    percentage          NUMERIC(5,2),
    passed              BOOLEAN,
    time_spent_seconds  INT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (quiz_id, student_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON quiz_attempts(status);

-- ----------------------------------------------------------------------------
-- STEP 14: Create quiz_attempt_answers table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    id                  BIGSERIAL PRIMARY KEY,
    attempt_id          BIGINT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id         BIGINT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option_ids INT[],                      -- Array of option IDs for multiple-select
    text_answer         TEXT,                        -- For fill-in-the-blank, short answer
    answer_data         JSONB,                       -- For structured answers (e.g., matching pairs)
    points_awarded      NUMERIC(6,2),
    is_correct          BOOLEAN,
    feedback            TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON quiz_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON quiz_attempt_answers(question_id);

-- ----------------------------------------------------------------------------
-- STEP 15: Create lesson_resources table for ordered resources
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_resources (
    id                      BIGSERIAL PRIMARY KEY,
    lesson_id               BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    resource_type           VARCHAR(50) NOT NULL,     -- 'video', 'material', 'activity', 'quiz'
    resource_id             BIGINT NOT NULL,          -- Foreign key to videos, learning_materials, activities, or quizzes
    display_order           INT NOT NULL DEFAULT 0,
    is_required             BOOLEAN NOT NULL DEFAULT TRUE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    sequential_unlocking    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lesson_id, resource_type, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON lesson_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_order ON lesson_resources(lesson_id, display_order);

-- ----------------------------------------------------------------------------
-- STEP 16: Update lesson table for status
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' AND column_name = 'status'
    ) THEN
        ALTER TABLE lessons ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 17: Create trigger to update updated_at timestamps
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_grade_levels_updated_at BEFORE UPDATE ON grade_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_versions_updated_at BEFORE UPDATE ON curriculum_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_objectives_updated_at BEFORE UPDATE ON curriculum_objectives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at BEFORE UPDATE ON quiz_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempt_answers_updated_at BEFORE UPDATE ON quiz_attempt_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_resources_updated_at BEFORE UPDATE ON lesson_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- NOTES:
-- 1. age_groups table is NOT dropped yet - data migration needed
-- 2. activities.grade_level_id_old will be used for data migration
-- 3. students.grade_level_id needs to be populated based on age
-- 4. courses.grade_level_id needs to be populated based on age_group_id
-- 5. activities.grade_level_id needs to be populated from grade_level_id_old
-- ============================================================================
