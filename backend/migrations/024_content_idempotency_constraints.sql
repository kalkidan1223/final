-- =============================================================================
-- 024: Idempotency constraints for course and activity content
-- =============================================================================
--
-- WHY
--
-- Migration 023 added the instructor-published child home, which is seeded and
-- maintained by the ActivityBuilder rather than by hand. The seed script
-- (backend/seeds/seed_ethiopian_curriculum.js) upserts content so it can be run
-- repeatedly, and upserts need a unique key to conflict on.
--
-- Two of them were missing:
--
--   courses    (instructor_id, age_group_id, title)
--   activities (lesson_id, title)
--
-- Without them the seed's ON CONFLICT clause has nothing to match and the whole
-- statement errors out, which is what the previous seed script hit: it used
-- `ON CONFLICT DO NOTHING` with no target, so on a database that already had the
-- rows it silently did nothing, and on a fresh one it duplicated them.
--
-- These are correct constraints in their own right, independent of the seed:
--   - one instructor cannot publish two different courses with the same title to
--     the same age group and call them different things
--   - an activity title identifies an activity within its lesson
--
-- Applied with IF NOT EXISTS semantics, and the duplicate guard first, so this
-- is safe to run against a database that somehow already has duplicates.
-- =============================================================================

BEGIN;

-- ── Refuse to proceed if the data would violate the new constraints ─────────
DO $$
DECLARE
  dupes bigint;
BEGIN
  SELECT COUNT(*) INTO dupes FROM (
    SELECT 1 FROM courses
    GROUP BY instructor_id, age_group_id, title
    HAVING COUNT(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Cannot add courses uniqueness: % duplicated (instructor, age_group, title) group(s) exist. '
      'Merge or rename them first.', dupes;
  END IF;

  SELECT COUNT(*) INTO dupes FROM (
    SELECT 1 FROM activities
    GROUP BY lesson_id, title
    HAVING COUNT(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Cannot add activities uniqueness: % duplicated (lesson_id, title) group(s) exist. '
      'Merge or rename them first.', dupes;
  END IF;
END $$;

-- ── The constraints ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_instructor_age_group_title_key'
  ) THEN
    ALTER TABLE courses
      ADD CONSTRAINT courses_instructor_age_group_title_key
      UNIQUE (instructor_id, age_group_id, title);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_lesson_id_title_key'
  ) THEN
    ALTER TABLE activities
      ADD CONSTRAINT activities_lesson_id_title_key
      UNIQUE (lesson_id, title);
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Note on existing rows
-- -----------------------------------------------------------------------------
-- These constraints only apply to new inserts and updates. A pre-existing
-- duplicate would have blocked the migration above, so reaching this point means
-- the data is already consistent.
--
-- One deliberate omission: no unique constraint on home_pins, because a teacher
-- may legitimately pin the same lesson to two different age groups, and
-- (age_group_id, resource_type, resource_id) is already unique from 023.
-- =============================================================================
