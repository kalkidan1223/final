BEGIN;

-- ============================================================================
-- Auth & Registration System — Brana Youth Academy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE approval_action AS ENUM ('approve', 'reject', 'suspend');

-- ----------------------------------------------------------------------------
-- REGISTRATION REQUESTS (Parent accounts awaiting admin review)
-- ----------------------------------------------------------------------------
CREATE TABLE registration_requests (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    alt_phone       VARCHAR(20),
    date_of_birth   DATE NOT NULL,
    gender          VARCHAR(20) NOT NULL,
    nationality     VARCHAR(100) NOT NULL,
    occupation      VARCHAR(150) NOT NULL,
    relationship_to_child VARCHAR(100) NOT NULL,
    national_id     VARCHAR(50),
    profile_image_url TEXT,
    country         VARCHAR(100) NOT NULL,
    region          VARCHAR(100) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    sub_city        VARCHAR(100),
    woreda          VARCHAR(100),
    house_number    VARCHAR(50),
    postal_code     VARCHAR(20),
    emergency_contact_name  VARCHAR(150) NOT NULL,
    emergency_contact_relationship VARCHAR(100) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    terms_agreed    BOOLEAN NOT NULL DEFAULT FALSE,
    guardian_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    status          registration_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_notes  TEXT,
    UNIQUE (email)
);
CREATE INDEX idx_reg_requests_status ON registration_requests(status);
CREATE INDEX idx_reg_requests_email ON registration_requests(email);

-- ----------------------------------------------------------------------------
-- CHILD REGISTRATION REQUESTS (all children require admin approval)
-- ----------------------------------------------------------------------------
CREATE TABLE student_registration_requests (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_full_name VARCHAR(150) NOT NULL,
    date_of_birth   DATE NOT NULL,
    gender          VARCHAR(20) NOT NULL,
    grade           VARCHAR(50),
    section         VARCHAR(50),
    preferred_language VARCHAR(50),
    blood_group     VARCHAR(5),
    medical_condition TEXT,
    learning_disability TEXT,
    student_photo_url TEXT,
    admission_number VARCHAR(50),
    previous_school VARCHAR(200),
    current_grade   VARCHAR(50),
    academic_year   VARCHAR(20),
    -- Required only when the child is aged 10-12 and will receive a login.
    student_email   VARCHAR(255),
    password_hash   VARCHAR(255),
    recovery_email  VARCHAR(255),
    username        VARCHAR(100),
    age             SMALLINT NOT NULL,
    status          registration_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_email),
    UNIQUE (parent_id, student_full_name, date_of_birth)
);
CREATE INDEX idx_student_reg_status ON student_registration_requests(status);
CREATE INDEX idx_student_reg_parent ON student_registration_requests(parent_id);

-- ----------------------------------------------------------------------------
-- PASSWORD RESET TOKENS
-- ----------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(255) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pw_reset_user ON password_reset_tokens(user_id);

-- ----------------------------------------------------------------------------
-- EMAIL VERIFICATION TOKENS
-- ----------------------------------------------------------------------------
CREATE TABLE email_verification_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(255) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_ver_user ON email_verification_tokens(user_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       BIGINT,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ----------------------------------------------------------------------------
-- USER SESSIONS (for session timeout & device management)
-- ----------------------------------------------------------------------------
CREATE TABLE user_sessions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    device_info     TEXT,
    ip_address      VARCHAR(45),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);

COMMIT;
