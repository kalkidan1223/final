-- Correct prior DOB-derived student grades for installations that already
-- applied the first version of migration 035. Only explicit parent selections
-- on approved registrations or invitations are retained.
BEGIN;

ALTER TABLE IF EXISTS student_invites
  ADD COLUMN IF NOT EXISTS grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;

UPDATE students s
SET grade_level_id = sr.grade_level_id
FROM student_registration_requests sr
WHERE sr.parent_id = s.parent_id
  AND lower(sr.student_full_name) = lower(s.full_name)
  AND sr.date_of_birth = s.date_of_birth
  AND sr.status = 'approved'
  AND sr.grade_level_id IS NOT NULL;

UPDATE students s
SET grade_level_id = si.grade_level_id
FROM student_invites si
WHERE si.parent_id = s.parent_id
  AND lower(si.full_name) = lower(s.full_name)
  AND si.date_of_birth = s.date_of_birth
  AND si.grade_level_id IS NOT NULL;

UPDATE students s
SET grade_level_id = NULL
WHERE NOT EXISTS (
    SELECT 1 FROM student_registration_requests sr
    WHERE sr.parent_id = s.parent_id
      AND lower(sr.student_full_name) = lower(s.full_name)
      AND sr.date_of_birth = s.date_of_birth
      AND sr.status = 'approved'
      AND sr.grade_level_id IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM student_invites si
    WHERE si.parent_id = s.parent_id
      AND lower(si.full_name) = lower(s.full_name)
      AND si.date_of_birth = s.date_of_birth
      AND si.grade_level_id IS NOT NULL
  );

COMMIT;
