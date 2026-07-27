const { query } = require('../config/db');

// ----------------------------------------------------------------------------
// GET /api/admin/dashboard  (admin only)
// ----------------------------------------------------------------------------
async function getDashboardStats(req, res, next) {
  try {
    const [users, courses, submissions, activeStudents] = await Promise.all([
      query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) AS count FROM courses GROUP BY status`),
      query(`SELECT status, COUNT(*) AS count FROM activity_submissions GROUP BY status`),
      query(`SELECT COUNT(*) AS count FROM students WHERE is_active = TRUE`),
    ]);

    res.json({
      users_by_role: users.rows,
      courses_by_status: courses.rows,
      submissions_by_status: submissions.rows,
      active_students: Number(activeStudents.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats };
