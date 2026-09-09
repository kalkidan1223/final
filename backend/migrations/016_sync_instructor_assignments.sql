-- Migration 016: Sync teaching-workspace assignments from instructor course assignments
-- The instructor portal ("My Assignments" + workspace) reads instructor_assignments,
-- but the admin "Instructors → Edit" flow only wrote to instructor_courses / courses.
-- This backfills instructor_assignments for every existing instructor-course link.

BEGIN;

INSERT INTO instructor_assignments (instructor_id, course_id, age_group_id, status, assigned_by)
SELECT ic.instructor_id,
       c.id   AS course_id,
       c.age_group_id,
       'active' AS status,
       ic.assigned_by
FROM instructor_courses ic
JOIN courses c ON c.available_course_id = ic.available_course_id
              AND c.instructor_id       = ic.instructor_id
WHERE NOT EXISTS (
    SELECT 1
    FROM instructor_assignments ia
    WHERE ia.instructor_id = ic.instructor_id
      AND ia.course_id     = c.id
);

COMMIT;