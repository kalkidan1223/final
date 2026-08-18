BEGIN;

-- Keep the approved child profile details submitted by the parent. These
-- fields already exist on the registration request; copying them to students
-- makes them available in the Parent Portal after approval.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS section VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50),
  ADD COLUMN IF NOT EXISTS admission_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS previous_school VARCHAR(200),
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
  ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5),
  ADD COLUMN IF NOT EXISTS medical_condition TEXT,
  ADD COLUMN IF NOT EXISTS learning_disability TEXT;

-- Backfill approved children created before these profile fields were added.
UPDATE students s
SET grade = COALESCE(s.grade, sr.current_grade, sr.grade),
    section = COALESCE(s.section, sr.section),
    preferred_language = COALESCE(s.preferred_language, sr.preferred_language),
    admission_number = COALESCE(s.admission_number, sr.admission_number),
    previous_school = COALESCE(s.previous_school, sr.previous_school),
    academic_year = COALESCE(s.academic_year, sr.academic_year),
    blood_group = COALESCE(s.blood_group, sr.blood_group),
    medical_condition = COALESCE(s.medical_condition, sr.medical_condition),
    learning_disability = COALESCE(s.learning_disability, sr.learning_disability)
FROM student_registration_requests sr
WHERE sr.parent_id = s.parent_id
  AND LOWER(sr.student_full_name) = LOWER(s.full_name)
  AND sr.date_of_birth = s.date_of_birth
  AND sr.status = 'approved';

COMMIT;
