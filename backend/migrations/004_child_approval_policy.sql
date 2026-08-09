BEGIN;

-- Move child requests from the parent's original application to the approved
-- parent account. A child cannot be created by the parent directly.
ALTER TABLE student_registration_requests
  DROP CONSTRAINT IF EXISTS student_registration_requests_parent_id_fkey;

UPDATE student_registration_requests sr
SET parent_id = p.id
FROM registration_requests rr
JOIN users u ON u.email = rr.email
JOIN parents p ON p.user_id = u.id
WHERE sr.parent_id = rr.id;

ALTER TABLE student_registration_requests
  ADD CONSTRAINT student_registration_requests_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;

ALTER TABLE student_registration_requests
  ALTER COLUMN student_email DROP NOT NULL,
  ALTER COLUMN password_hash DROP NOT NULL;

-- Align the age categories with the approval policy: 5-9 parent-managed and
-- 10-12 account-owning. Existing approved 10-year-old records must be reviewed
-- before this migration because they may have been created under the old rule.
UPDATE age_groups SET name = '8-9', max_age = 9 WHERE name = '8-10';
UPDATE age_groups SET name = '10-12', min_age = 10 WHERE name = '11-12';

COMMIT;
