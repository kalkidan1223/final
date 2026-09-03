-- Migration: Add Google OAuth support
-- Date: 2024-01-01
-- Description: Add google_id column to users table for Google Sign-In

-- Add google_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add comment
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID for Sign in with Google';
