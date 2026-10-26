BEGIN;

-- Admins create courses before assigning an instructor.
ALTER TABLE courses ALTER COLUMN instructor_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS instructor_grade_levels (
  instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  grade_level_id INT NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (instructor_id, grade_level_id)
);

-- Preserve grade scopes already established through course assignments.
INSERT INTO instructor_grade_levels (instructor_id, grade_level_id)
SELECT DISTINCT instructor_id, grade_level_id
FROM instructor_assignments
WHERE grade_level_id IS NOT NULL
ON CONFLICT (instructor_id, grade_level_id) DO NOTHING;

COMMIT;
