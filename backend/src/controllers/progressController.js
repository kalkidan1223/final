const { query } = require('../config/db');
const { getStudentIdForUser, getParentIdForUser, getInstructorIdForUser } = require('../utils/roleHelpers');

const PROGRESS_SELECT = `
  SELECT p.*, c.title AS course_title, l.title AS lesson_title
  FROM progress p
  JOIN courses c ON c.id = p.course_id
  LEFT JOIN lessons l ON l.id = p.lesson_id
  WHERE p.student_id = $1
  ORDER BY p.updated_at DESC
`;

// ----------------------------------------------------------------------------
// GET /api/progress/me  (student only)
// ----------------------------------------------------------------------------
async function getMyProgress(req, res, next) {
  try {
    const studentId = await getStudentIdForUser(req.user.id);
    if (!studentId) return res.status(403).json({ error: 'No student profile linked to this account' });

    const result = await query(PROGRESS_SELECT, [studentId]);
    res.json({ progress: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/progress/student/:studentId
// A parent may only view their own child's progress; instructor/admin can
// view any student's (needed for "Monitor Student Performance").
// ----------------------------------------------------------------------------
async function getStudentProgress(req, res, next) {
  try {
    const { studentId } = req.params;

    if (req.user.role === 'parent') {
      const parentId = await getParentIdForUser(req.user.id);
      const owns = await query('SELECT 1 FROM students WHERE id = $1 AND parent_id = $2', [
        studentId,
        parentId,
      ]);
      if (owns.rows.length === 0) {
        return res.status(403).json({ error: 'This student is not linked to your account' });
      }
    } else if (req.user.role === 'student') {
      const ownStudentId = await getStudentIdForUser(req.user.id);
      if (String(ownStudentId) !== String(studentId)) {
        return res.status(403).json({ error: 'You can only view your own progress' });
      }
    }
    // instructor and admin: unrestricted (monitor-performance requirement)

    const result = await query(PROGRESS_SELECT, [studentId]);
    res.json({ progress: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyProgress, getStudentProgress };
