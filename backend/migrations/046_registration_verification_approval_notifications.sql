-- Migration 046: Registration Verification and Admin Approval Notifications
-- Adds email_verified flags and allows tokens to be linked by email

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE registration_requests 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE instructor_registration_requests 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Ensure email_verification_tokens can track tokens by email even before users row is created
ALTER TABLE email_verification_tokens 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE email_verification_tokens 
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token 
  ON email_verification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email 
  ON email_verification_tokens(email);

ALTER TABLE email_verification_tokens 
  ADD COLUMN IF NOT EXISTS code VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_code 
  ON email_verification_tokens(code);

