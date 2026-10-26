const { query } = require('../config/db');
const { getInstructorIdForUser } = require('./roleHelpers');

// Returns whether the authenticated user may read a course. Learners can only
// read published courses that match an approved child/student grade level.
// Instructors can read courses they authored OR courses assigned to them by admin.
async function canReadCourse(user, course) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const courseId = course.id || course.course_id;

  if (user.role === 'instructor') {
    const instructorId = await getInstructorIdForUser(user.id);
    if (!instructorId) return false;
    if (course.instructor_id && instructorId === course.instructor_id) return true;
    if (courseId) {
      const assigned = await query(
        `SELECT 1 FROM instructor_assignments
         WHERE course_id = $1 AND instructor_id = $2 AND status = 'active'
         LIMIT 1`,
        [courseId, instructorId]
      );
      if (assigned.rows.length > 0) return true;
    }
    return false;
  }

  if (course.status !== 'published') return false;

  if (user.role === 'student') {
    const result = await query(
      'SELECT 1 FROM students WHERE user_id = $1 AND grade_level_id = $2 AND is_active = TRUE',
      [user.id, course.grade_level_id]
    );
    return result.rows.length > 0;
  }

  if (user.role === 'parent') {
    const result = await query(
      `SELECT 1 FROM students s
       JOIN parents p ON p.id = s.parent_id
       WHERE p.user_id = $1 AND s.grade_level_id = $2 AND s.is_active = TRUE`,
      [user.id, course.grade_level_id]
    );
    return result.rows.length > 0;
  }

  return false;
}

// Check if user has permission to manage (edit/create lessons in) a course
async function canManageCourse(user, courseId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'instructor') return false;

  const instructorId = await getInstructorIdForUser(user.id);
  if (!instructorId) return false;

  const result = await query(
    `SELECT 1 FROM courses c
     WHERE c.id = $1 AND (
       c.instructor_id = $2
       OR EXISTS (
         SELECT 1 FROM instructor_assignments ia
         WHERE ia.course_id = c.id AND ia.instructor_id = $2 AND ia.status = 'active'
       )
     )`,
    [courseId, instructorId]
  );
  return result.rows.length > 0;
}

// Check if user has permission to manage (edit/delete) a lesson
async function canManageLesson(user, lessonId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'instructor') return false;

  const instructorId = await getInstructorIdForUser(user.id);
  if (!instructorId) return false;

  const result = await query(
    `SELECT 1 FROM lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.id = $1 AND (
       c.instructor_id = $2
       OR EXISTS (
         SELECT 1 FROM instructor_assignments ia
         WHERE ia.course_id = c.id AND ia.instructor_id = $2 AND ia.status = 'active'
       )
     )`,
    [lessonId, instructorId]
  );
  return result.rows.length > 0;
}

module.exports = { canReadCourse, canManageCourse, canManageLesson };
