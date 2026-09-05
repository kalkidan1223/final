BEGIN;

-- ============================================================================
-- Instructor Self-Registration Requests
-- Instructors can submit their own application; admin approves and then
-- assigns course, age group, grade/class, and section.
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_registration_requests (
    id                  BIGSERIAL PRIMARY KEY,
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    specialization      VARCHAR(150),
    education_level     VARCHAR(100),
    years_of_experience SMALLINT,
    bio                 TEXT,
    terms_agreed        BOOLEAN NOT NULL DEFAULT FALSE,
    status              registration_status NOT NULL DEFAULT 'pending',
    rejection_reason    TEXT,
    reviewed_by         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    reviewed_notes      TEXT,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_instructor_reg_status ON instructor_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_instructor_reg_email  ON instructor_registration_requests(email);

COMMIT;
