-- =============================================================================
-- Migration 040: Fidel Family Selection, TTS Audio Assets, and Child Learning Progress
-- Brana Youth / Children Learning Hub
-- =============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. FIDEL FAMILIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fidel_families (
    id                  BIGSERIAL PRIMARY KEY,
    family_name         VARCHAR(50) NOT NULL,
    base_character      VARCHAR(8) NOT NULL UNIQUE,
    language_code       VARCHAR(20) NOT NULL DEFAULT 'am-ET',
    description         TEXT,
    curriculum_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL,
    display_order       INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fidel_families_order ON fidel_families(display_order);
CREATE INDEX IF NOT EXISTS idx_fidel_families_active ON fidel_families(is_active);

-- ----------------------------------------------------------------------------
-- 2. FIDEL CHARACTERS TABLE (7 forms per family)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fidel_characters (
    id                   BIGSERIAL PRIMARY KEY,
    family_id            BIGINT NOT NULL REFERENCES fidel_families(id) ON DELETE CASCADE,
    character            VARCHAR(8) NOT NULL,
    character_name       VARCHAR(100),
    speech_text          VARCHAR(100) NOT NULL,
    speech_language      VARCHAR(20) NOT NULL DEFAULT 'am-ET',
    display_order        INT NOT NULL CHECK (display_order BETWEEN 1 AND 7),
    pronunciation_status VARCHAR(30) NOT NULL DEFAULT 'verified'
                         CHECK (pronunciation_status IN ('unverified', 'verified', 'needs_review')),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (family_id, character),
    UNIQUE (family_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_fidel_characters_family ON fidel_characters(family_id, display_order);
CREATE INDEX IF NOT EXISTS idx_fidel_characters_char ON fidel_characters(character);

-- ----------------------------------------------------------------------------
-- 3. LESSON FIDEL FAMILIES (association table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_fidel_families (
    id            BIGSERIAL PRIMARY KEY,
    lesson_id     BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    family_id     BIGINT NOT NULL REFERENCES fidel_families(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lesson_id, family_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_fidel_families_lesson ON lesson_fidel_families(lesson_id, display_order);

-- ----------------------------------------------------------------------------
-- 4. LESSON FIDEL CONFIGURATIONS (practice settings & learning sequence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_fidel_configs (
    id                          BIGSERIAL PRIMARY KEY,
    lesson_id                   BIGINT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
    activities_enabled          JSONB NOT NULL DEFAULT '["listen_explore", "listen_identify", "sound_match", "quiz"]'::jsonb,
    activity_order              JSONB NOT NULL DEFAULT '["listen_explore", "listen_identify", "sound_match", "quiz"]'::jsonb,
    listening_required_first    BOOLEAN NOT NULL DEFAULT TRUE,
    min_listen_count_required   INT NOT NULL DEFAULT 1,
    require_all_audio_ready     BOOLEAN NOT NULL DEFAULT TRUE,
    is_published                BOOLEAN NOT NULL DEFAULT FALSE,
    published_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. FIDEL AUDIO ASSETS (cached generated TTS audio)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fidel_audio_assets (
    id                          BIGSERIAL PRIMARY KEY,
    fidel_character_id          BIGINT NOT NULL REFERENCES fidel_characters(id) ON DELETE CASCADE,
    provider                    VARCHAR(50) NOT NULL,
    voice_id                    VARCHAR(100) NOT NULL,
    language_code               VARCHAR(20) NOT NULL DEFAULT 'am-ET',
    speech_text_hash            VARCHAR(64) NOT NULL,
    audio_url                   TEXT NOT NULL,
    storage_key                 TEXT,
    generation_status           VARCHAR(30) NOT NULL DEFAULT 'ready'
                                CHECK (generation_status IN ('pending', 'processing', 'ready', 'failed')),
    pronunciation_review_status VARCHAR(30) NOT NULL DEFAULT 'approved'
                                CHECK (pronunciation_review_status IN ('approved', 'flagged', 'pending_review')),
    duration_seconds            NUMERIC(5,2),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fidel_character_id, provider, voice_id, speech_text_hash)
);

CREATE INDEX IF NOT EXISTS idx_fidel_audio_lookup ON fidel_audio_assets(fidel_character_id, provider, voice_id, speech_text_hash);
CREATE INDEX IF NOT EXISTS idx_fidel_audio_status ON fidel_audio_assets(generation_status);

-- ----------------------------------------------------------------------------
-- 6. STUDENT FIDEL PROGRESS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_fidel_progress (
    id                     BIGSERIAL PRIMARY KEY,
    student_id             BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id              BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    fidel_character_id     BIGINT NOT NULL REFERENCES fidel_characters(id) ON DELETE CASCADE,
    first_listened_at      TIMESTAMPTZ,
    listen_count           INT NOT NULL DEFAULT 0,
    practice_completed_at  TIMESTAMPTZ,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, lesson_id, fidel_character_id)
);

CREATE INDEX IF NOT EXISTS idx_student_fidel_progress ON student_fidel_progress(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_fidel_char ON student_fidel_progress(fidel_character_id);

-- ----------------------------------------------------------------------------
-- 7. FIDEL AUDIO ISSUE REPORTS (instructors flagging pronunciation issues)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fidel_audio_issue_reports (
    id               BIGSERIAL PRIMARY KEY,
    audio_asset_id   BIGINT REFERENCES fidel_audio_assets(id) ON DELETE CASCADE,
    reported_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    issue_type       VARCHAR(50) NOT NULL,
    description      TEXT,
    status           VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. POPULATE INITIAL FIDEL FAMILIES & CHARACTERS FROM fidel_letters IF PRESENT
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    order_names TEXT[] := ARRAY['ግዕዝ', 'ካዕብ', 'ሣልስ', 'ራብዕ', 'ኃምስ', 'ሳድስ', 'ሳብዕ'];
    r RECORD;
    fam_id BIGINT;
    i INT;
    char_val TEXT;
BEGIN
    -- Populate families from fidel_letters if fidel_letters has rows
    FOR r IN (SELECT * FROM fidel_letters WHERE is_active = TRUE ORDER BY teaching_order ASC) LOOP
        INSERT INTO fidel_families (family_name, base_character, language_code, description, display_order, is_active)
        VALUES (
            r.base_char,
            r.base_char,
            'am-ET',
            format('Amharic fidel family for %s (%s)', r.base_char, r.sound),
            r.teaching_order,
            TRUE
        )
        ON CONFLICT (base_character) DO UPDATE
            SET display_order = EXCLUDED.display_order,
                updated_at = now()
        RETURNING id INTO fam_id;

        -- Ensure each of the 7 forms is inserted into fidel_characters
        IF array_length(r.syllables, 1) = 7 THEN
            FOR i IN 1..7 LOOP
                char_val := r.syllables[i];
                INSERT INTO fidel_characters (family_id, character, character_name, speech_text, speech_language, display_order, pronunciation_status, is_active)
                VALUES (
                    fam_id,
                    char_val,
                    order_names[i],
                    char_val,
                    'am-ET',
                    i,
                    'verified',
                    TRUE
                )
                ON CONFLICT (family_id, character) DO UPDATE
                    SET character_name = EXCLUDED.character_name,
                        speech_text = EXCLUDED.speech_text,
                        display_order = EXCLUDED.display_order,
                        updated_at = now();
            END LOOP;
        END IF;
    END LOOP;
END $$;

COMMIT;
