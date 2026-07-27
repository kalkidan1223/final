-- ============================================================================
-- Auth module extension — run AFTER schema.sql
-- ============================================================================
BEGIN;

-- Stores hashed refresh tokens so they can be individually revoked/rotated.
CREATE TABLE refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- A parent generates an invite for a Category 2 child (age 11-12). The child
-- uses the invite_code once to create their own account, which the backend
-- then links to this pre-created student profile.
CREATE TABLE student_invites (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    age_group_id    INT NOT NULL REFERENCES age_groups(id),
    full_name       VARCHAR(150) NOT NULL,
    date_of_birth   DATE NOT NULL,
    invite_code     VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_invites_code ON student_invites(invite_code);

COMMIT;
