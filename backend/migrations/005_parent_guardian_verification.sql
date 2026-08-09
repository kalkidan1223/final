BEGIN;

ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(50) NOT NULL DEFAULT 'parent',
  ADD COLUMN IF NOT EXISTS in_person_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Preserve the date of birth submitted with earlier parent registrations where
-- the approved parent can be matched by email.
UPDATE parents p
SET date_of_birth = rr.date_of_birth,
    guardian_relationship = COALESCE(NULLIF(LOWER(rr.relationship_to_child), ''), 'parent')
FROM users u
JOIN registration_requests rr ON rr.email = u.email
WHERE p.user_id = u.id AND p.date_of_birth IS NULL;

COMMIT;
