const { query } = require('../config/db');

// ----------------------------------------------------------------------------
// GET /api/admin/dashboard  (admin only)
// ----------------------------------------------------------------------------
async function getDashboardStats(req, res, next) {
  try {
    const [users, courses, submissions, activeStudents, pendingParents, pendingStudents, recentInstructors] = await Promise.all([
      query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) AS count FROM courses GROUP BY status`),
      query(`SELECT status, COUNT(*) AS count FROM activity_submissions GROUP BY status`),
      query(`SELECT COUNT(*) AS count FROM students WHERE is_active = TRUE`),
      query(`SELECT COUNT(*) AS count FROM registration_requests WHERE status = 'pending'`),
      query(`SELECT COUNT(*) AS count FROM student_registration_requests WHERE status = 'pending'`),
      query(
        `SELECT u.id, u.full_name, u.email, u.created_at, i.qualification, i.specialty
         FROM users u
         JOIN instructors i ON i.user_id = u.id
         ORDER BY u.created_at DESC
         LIMIT 5`
      ),
    ]);

    res.json({
      users_by_role: users.rows,
      courses_by_status: courses.rows,
      submissions_by_status: submissions.rows,
      active_students: Number(activeStudents.rows[0].count),
      pending_parent_registrations: Number(pendingParents.rows[0].count),
      pending_student_registrations: Number(pendingStudents.rows[0].count),
      recent_instructors: recentInstructors.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats };
