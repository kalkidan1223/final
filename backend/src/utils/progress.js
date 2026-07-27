const { query } = require('../config/db');

// Called whenever a graded event should move the needle on a student's
// progress — e.g. an activity submission gets graded, a quiz is completed.
async function upsertLessonProgress(studentId, courseId, lessonId, status, completionPercentage) {
  await query(
    `INSERT INTO progress (student_id, course_id, lesson_id, status, completion_percentage, last_accessed_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     ON CONFLICT (student_id, course_id, lesson_id)
     DO UPDATE SET
       status = EXCLUDED.status,
       completion_percentage = GREATEST(progress.completion_percentage, EXCLUDED.completion_percentage),
       last_accessed_at = now(),
       updated_at = now()`,
    [studentId, courseId, lessonId, status, completionPercentage]
  );
}

module.exports = { upsertLessonProgress };
