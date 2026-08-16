BEGIN;

-- Child registrations support a review note just like parent registrations.
-- Older databases created from migration 003 did not include this column,
-- causing admin approval to fail when it saved the reviewer note.
ALTER TABLE student_registration_requests
  ADD COLUMN IF NOT EXISTS reviewed_notes TEXT;

COMMIT;
