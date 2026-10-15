-- Add 'pending' to user_role enum
-- This allows users created via Google OAuth to have a temporary role
-- until they complete registration (parent or instructor)

-- First, alter the type to add 'pending'
ALTER TYPE user_role ADD VALUE 'pending';

-- Note: In PostgreSQL, you can only add values to an enum at the end
-- Since 'pending' is being added after the existing values, this is safe
