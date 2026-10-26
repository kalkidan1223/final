-- Finalize the grade based model after migrations 029-034 have copied any
-- explicitly recorded grades. Run during a maintenance window with a DB backup.
BEGIN;

INSERT INTO grade_levels (code, name, level_type, sequence_order) VALUES
    ('KG1', 'Kindergarten 1', 'kindergarten', 1),
    ('KG2', 'Kindergarten 2', 'kindergarten', 2),
    ('GRADE_1', 'Grade 1', 'primary', 3),
    ('GRADE_2', 'Grade 2', 'primary', 4),
    ('GRADE_3', 'Grade 3', 'primary', 5),
    ('GRADE_4', 'Grade 4', 'primary', 6),
    ('GRADE_5', 'Grade 5', 'primary', 7),
    ('GRADE_6', 'Grade 6', 'primary', 8)
ON CONFLICT (code) DO NOTHING;

-- Content is assigned by its parent course wherever possible.
UPDATE activities a
SET grade_level_id = c.grade_level_id
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE a.lesson_id = l.id AND a.grade_level_id IS NULL AND c.grade_level_id IS NOT NULL;

UPDATE quizzes q
SET grade_level_id = c.grade_level_id
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE q.lesson_id = l.id AND q.grade_level_id IS NULL AND c.grade_level_id IS NOT NULL;

-- The old invite did not record a grade. Preserve the invite row and invite
-- code, but require a grade on new invitations; old invitations cannot create
-- an incorrectly placed student.
ALTER TABLE IF EXISTS student_invites
  ADD COLUMN IF NOT EXISTS grade_level_id INT REFERENCES grade_levels(id) ON DELETE SET NULL;

-- Reconcile the earlier DOB-based migration for databases where migration 033
-- was already applied. Use the grade explicitly selected on the registration
-- request or invitation; do not keep a grade inferred from date of birth.
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

ALTER TABLE IF EXISTS student_invites DROP COLUMN IF EXISTS age_group_id;

-- Remove the former category/group relationship after the grade values have
-- been copied. Use IF EXISTS because deployments may be at different points.
ALTER TABLE IF EXISTS activities DROP COLUMN IF EXISTS age_group_id_old;
ALTER TABLE IF EXISTS activities DROP COLUMN IF EXISTS age_group_id;
ALTER TABLE IF EXISTS courses DROP COLUMN IF EXISTS age_group_id;
ALTER TABLE IF EXISTS courses DROP COLUMN IF EXISTS available_course_id CASCADE;
ALTER TABLE IF EXISTS instructor_assignments DROP COLUMN IF EXISTS age_group_id;
ALTER TABLE IF EXISTS students DROP COLUMN IF EXISTS age_group_id;
ALTER TABLE IF EXISTS quizzes DROP COLUMN IF EXISTS age_group_id;
ALTER TABLE IF EXISTS home_pins DROP COLUMN IF EXISTS age_group_id;

-- The baseline schema enforced login ownership by age group. Account policy is
-- handled by the existing registration/approval workflow after this migration.
DROP TRIGGER IF EXISTS trg_student_account_rule ON students;
DROP FUNCTION IF EXISTS enforce_student_account_rule();

-- Catch any deployment-specific legacy age-group columns not covered above.
DO $$
DECLARE legacy_column RECORD;
BEGIN
  FOR legacy_column IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND column_name IN ('age_group_id', 'age_group_id_old')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP COLUMN %I CASCADE',
      legacy_column.table_schema, legacy_column.table_name, legacy_column.column_name);
  END LOOP;
END $$;

-- These tables only represented the retired age-group catalog/assignments.
DROP TABLE IF EXISTS instructor_courses CASCADE;
DROP TABLE IF EXISTS instructor_age_groups CASCADE;
DROP TABLE IF EXISTS age_group_available_courses CASCADE;
DROP TABLE IF EXISTS age_groups CASCADE;

-- Age ranges must never define or validate a grade. Date of birth remains on
-- student profiles for safeguarding and age-appropriate UI choices.
ALTER TABLE grade_levels DROP COLUMN IF EXISTS min_age;
ALTER TABLE grade_levels DROP COLUMN IF EXISTS max_age;
ALTER TABLE grade_levels DROP COLUMN IF EXISTS requires_account;

COMMIT;
