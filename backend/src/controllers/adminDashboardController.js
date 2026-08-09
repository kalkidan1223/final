const { query } = require('../config/db');

// ----------------------------------------------------------------------------
// GET /api/admin/dashboard  (admin only)
// ----------------------------------------------------------------------------
async function getDashboardStats(req, res, next) {
  try {
    const [users, courses, submissions, activeStudents, pendingParents, pendingStudents, recentInstructors, population, content, registrations] = await Promise.all([
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
      query(
        `SELECT COUNT(*) FILTER (WHERE s.is_active = TRUE)::int AS total_children,
                COUNT(*) FILTER (WHERE s.is_active = TRUE AND s.user_id IS NULL)::int AS parent_managed_children,
                COUNT(*) FILTER (WHERE s.is_active = TRUE AND s.user_id IS NOT NULL)::int AS student_accounts,
                COUNT(*) FILTER (WHERE s.is_active = TRUE AND ag.requires_account = FALSE)::int AS ages_5_to_9,
                COUNT(*) FILTER (WHERE s.is_active = TRUE AND ag.requires_account = TRUE)::int AS ages_10_to_12
         FROM students s JOIN age_groups ag ON ag.id = s.age_group_id`
      ),
      query(
        `SELECT (SELECT COUNT(*)::int FROM parents p WHERE p.guardian_relationship = 'parent') AS total_parents,
                (SELECT COUNT(*)::int FROM parents p WHERE p.guardian_relationship <> 'parent') AS total_guardians,
                (SELECT COUNT(*)::int FROM instructors i JOIN users u ON u.id = i.user_id WHERE u.is_active = TRUE) AS active_instructors,
                (SELECT COUNT(*)::int FROM lessons) AS total_lessons,
                (SELECT COUNT(*)::int FROM learning_materials) AS total_materials,
                (SELECT COUNT(*)::int FROM quizzes) AS total_quizzes`
      ),
      query(
        `SELECT DATE(submitted_at) AS day, COUNT(*)::int AS count FROM student_registration_requests
         WHERE submitted_at >= CURRENT_DATE - INTERVAL '13 days' GROUP BY DATE(submitted_at) ORDER BY day`
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
      population: population.rows[0],
      content: content.rows[0],
      child_registrations: registrations.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats };
