BEGIN;

-- Create table to assign subjects to grade levels
CREATE TABLE IF NOT EXISTS subject_grade_assignments (
  id SERIAL PRIMARY KEY,
  subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade_level_id INT NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (subject_id, grade_level_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_grade_subject ON subject_grade_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_grade_grade ON subject_grade_assignments(grade_level_id);

-- Add helpful comment
COMMENT ON TABLE subject_grade_assignments IS 'Assigns subjects to grade levels for curriculum planning';

COMMIT;
