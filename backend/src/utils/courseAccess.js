const { query } = require('../config/db');
const { getInstructorIdForUser } = require('./roleHelpers');

// Returns whether the authenticated user may read a course. Learners can only
// read published courses that match an approved child/student age group.
async function canReadCourse(user, course) {
  if (user.role === 'admin') return true;

  if (user.role === 'instructor') {
    const instructorId = await getInstructorIdForUser(user.id);
    return instructorId === course.instructor_id;
  }

  if (course.status !== 'published') return false;

  if (user.role === 'student') {
    const result = await query(
      'SELECT 1 FROM students WHERE user_id = $1 AND age_group_id = $2 AND is_active = TRUE',
      [user.id, course.age_group_id]
    );
    return result.rows.length > 0;
  }

  if (user.role === 'parent') {
    const result = await query(
      `SELECT 1 FROM students s
       JOIN parents p ON p.id = s.parent_id
       WHERE p.user_id = $1 AND s.age_group_id = $2 AND s.is_active = TRUE`,
      [user.id, course.age_group_id]
    );
    return result.rows.length > 0;
  }

  return false;
}

module.exports = { canReadCourse };
