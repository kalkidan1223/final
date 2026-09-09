/**
 * instructorAssignmentController.js
 * Admin manages instructor_assignments — assigns instructors to courses.
 */
const { query } = require('../config/db');

async function listInstructorAssignments(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT ia.id, ia.status, ia.grade, ia.section, ia.created_at,
              u.full_name AS instructor_name, u.email AS instructor_email,
              c.title AS course_title,
              ag.name AS age_group_name,
              ay.label AS academic_year
       FROM instructor_assignments ia
       JOIN instructors i ON i.id = ia.instructor_id
       JOIN users u ON u.id = i.user_id
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       ORDER BY ia.created_at DESC`
    );
    res.json({ assignments: rows });
  } catch (err) {
    next(err);
  }
}

async function createInstructorAssignment(req, res, next) {
  try {
    const { instructor_id, course_id, age_group_id, grade, section, academic_year_id, status } = req.body;
    if (!instructor_id || !course_id || !age_group_id) {
      return res.status(400).json({ error: 'instructor_id, course_id, and age_group_id are required' });
    }

    const { rows } = await query(
      `INSERT INTO instructor_assignments
         (instructor_id, course_id, age_group_id, grade, section, academic_year_id, status, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [instructor_id, course_id, age_group_id, grade || null, section || null,
       academic_year_id || null, status || 'active', req.user.id]
    );

    // Keep the course owner in sync so the assigned instructor also sees this
    // course on their "My Courses" page (courses?mine=true reads instructor_id).
    await query(
      'UPDATE courses SET instructor_id = $1, updated_at = now() WHERE id = $2',
      [instructor_id, course_id]
    );

    // Link the course's curriculum entry to the instructor so the admin's
    // Instructor list (assigned_courses) stays consistent too.
    const courseLink = await query('SELECT available_course_id FROM courses WHERE id = $1', [course_id]);
    if (courseLink.rows[0]?.available_course_id) {
      await query(
        `INSERT INTO instructor_courses (instructor_id, available_course_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (instructor_id, available_course_id) DO NOTHING`,
        [instructor_id, courseLink.rows[0].available_course_id, req.user.id]
      );
    }

    res.status(201).json({ assignment: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This instructor is already assigned to this course' });
    next(err);
  }
}

async function updateInstructorAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { status, grade, section } = req.body;
    const { rows } = await query(
      `UPDATE instructor_assignments
       SET status = COALESCE($1, status),
           grade = COALESCE($2, grade),
           section = COALESCE($3, section),
           updated_at = now()
       WHERE id = $4 RETURNING *`,
      [status, grade, section, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ assignment: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteInstructorAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await query('DELETE FROM instructor_assignments WHERE id = $1 RETURNING id', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInstructorAssignments,
  createInstructorAssignment,
  updateInstructorAssignment,
  deleteInstructorAssignment,
};
