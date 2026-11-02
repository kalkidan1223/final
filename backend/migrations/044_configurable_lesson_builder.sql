-- Store the instructor lesson-builder experience with the curriculum level.
-- Existing early-years levels start with the visual builder; administrators
-- can change this mapping in Grade Level Management.
ALTER TABLE grade_levels
  ADD COLUMN IF NOT EXISTS lesson_builder_type VARCHAR(20) NOT NULL DEFAULT 'structured';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grade_levels_lesson_builder_type_check'
  ) THEN
    ALTER TABLE grade_levels
      ADD CONSTRAINT grade_levels_lesson_builder_type_check
      CHECK (lesson_builder_type IN ('visual', 'structured'));
  END IF;
END $$;

UPDATE grade_levels
SET lesson_builder_type = 'visual'
WHERE lower(code) ~ '^(kg|kinder(garten)?)[ _-]*[12]$'
   OR lower(name) ~ '^(kindergarten|kg)[ _-]*[12]$'
   OR lower(name) ~ '^grade[ _-]*[12]$'
   OR lower(code) ~ '^(grade|g)[ _-]*0?[12]$';

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS prerequisites TEXT,
  ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
