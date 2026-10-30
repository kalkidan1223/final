-- ============================================================================
-- Migration 031: English Letter Learning System (instructor-authored)
-- Mirrors the Amharic fidel system but for the 26 English letters.
-- Reference data (the alphabet) is seeded; curriculum (which letters, order)
-- is chosen by the instructor per lesson. No hardcoded curriculum.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- ENGLISH LETTERS (reference data, admin-editable like fidel_families)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS english_letters (
    id              BIGSERIAL PRIMARY KEY,
    letter          VARCHAR(8)  NOT NULL,        -- 'A', 'B', ...
    letter_name     VARCHAR(64) NOT NULL,       -- 'ay', 'bee', ...
    speech_text     TEXT        NOT NULL,       -- text sent to TTS
    speech_language VARCHAR(16) NOT NULL DEFAULT 'en-US',
    display_order   INT         NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (letter)
);

-- Seed the 26 letters as reference data (admin-editable). Speech text is the
-- letter itself; the TTS provider pronounces it (e.g. "ay", "bee").
INSERT INTO english_letters (letter, letter_name, speech_text, speech_language, display_order)
VALUES
  ('A','A','A','en-US',1),('B','B','B','en-US',2),('C','C','C','en-US',3),
  ('D','D','D','en-US',4),('E','E','E','en-US',5),('F','F','F','en-US',6),
  ('G','G','G','en-US',7),('H','H','H','en-US',8),('I','I','I','en-US',9),
  ('J','J','J','en-US',10),('K','K','K','en-US',11),('L','L','L','en-US',12),
  ('M','M','M','en-US',13),('N','N','N','en-US',14),('O','O','O','en-US',15),
  ('P','P','P','en-US',16),('Q','Q','Q','en-US',17),('R','R','R','en-US',18),
  ('S','S','S','en-US',19),('T','T','T','en-US',20),('U','U','U','en-US',21),
  ('V','V','V','en-US',22),('W','W','W','en-US',23),('X','X','X','en-US',24),
  ('Y','Y','Y','en-US',25),('Z','Z','Z','en-US',26)
ON CONFLICT (letter) DO NOTHING;

-- ----------------------------------------------------------------------------
-- LESSON <-> LETTER linking (instructor chooses which letters + order)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_english_letters (
    id             BIGSERIAL PRIMARY KEY,
    lesson_id      BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    letter_id      BIGINT NOT NULL REFERENCES english_letters(id) ON DELETE CASCADE,
    display_order  INT    NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lesson_id, letter_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_english_letters_lesson ON lesson_english_letters(lesson_id, display_order);

-- ----------------------------------------------------------------------------
-- LESSON ENGLISH CONFIG (publish state, activities)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_english_configs (
    lesson_id             BIGINT PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
    is_published          BOOLEAN NOT NULL DEFAULT FALSE,
    activities_enabled    JSONB   NOT NULL DEFAULT '["listen_explore","listen_identify"]'::jsonb,
    listening_required_first BOOLEAN NOT NULL DEFAULT TRUE,
    min_listen_count_required INT NOT NULL DEFAULT 1,
    published_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- ENGLISH AUDIO ASSETS (TTS cache, one per letter)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS english_audio_assets (
    id                         BIGSERIAL PRIMARY KEY,
    english_letter_id          BIGINT NOT NULL REFERENCES english_letters(id) ON DELETE CASCADE,
    provider                   VARCHAR(32) NOT NULL,
    voice_id                   VARCHAR(128) NOT NULL,
    language_code              VARCHAR(16) NOT NULL DEFAULT 'en-US',
    speech_text_hash           VARCHAR(128) NOT NULL,
    audio_url                  TEXT,
    storage_key                TEXT,
    generation_status          VARCHAR(32) NOT NULL DEFAULT 'pending',
    pronunciation_review_status VARCHAR(32) NOT NULL DEFAULT 'approved',
    duration_seconds           NUMERIC(6,2) NOT NULL DEFAULT 1.0,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (english_letter_id, provider, voice_id, speech_text_hash)
);
CREATE INDEX IF NOT EXISTS idx_english_audio_assets_letter ON english_audio_assets(english_letter_id);

-- ----------------------------------------------------------------------------
-- STUDENT ENGLISH PROGRESS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_english_progress (
    id                  BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id           BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    english_letter_id   BIGINT NOT NULL REFERENCES english_letters(id) ON DELETE CASCADE,
    listen_count        INT NOT NULL DEFAULT 0,
    first_listened_at   TIMESTAMPTZ,
    practice_completed_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, lesson_id, english_letter_id)
);
CREATE INDEX IF NOT EXISTS idx_student_english_progress_student ON student_english_progress(student_id, lesson_id);

COMMIT;