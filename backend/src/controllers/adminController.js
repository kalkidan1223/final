const bcrypt = require('bcrypt');
const { pool, query } = require('../config/db');
const { isValidEmail, isValidPassword } = require('../utils/validators');

const SALT_ROUNDS = 12;

// ----------------------------------------------------------------------------
// Helper: map a users row to a safe public object
// ----------------------------------------------------------------------------
function publicUser(row) {
  const base = { id: row.id, email: row.email, full_name: row.full_name, role: row.role, is_active: row.is_active };
  return base;
}

// ----------------------------------------------------------------------------
// POST /api/admin/instructors  (admin only)
// ----------------------------------------------------------------------------
async function createInstructor(req, res, next) {
  try {
    const { full_name, email, password, phone, bio, qualification, specialty } = req.body;

    const errors = [];
    if (!full_name || full_name.trim().length < 2) errors.push('Full name is required (at least 2 characters)');
    if (!isValidEmail(email)) errors.push('A valid email address is required');
    if (!isValidPassword(password)) errors.push('Password must be at least 8 characters and include a letter and a number');
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.push('Phone number is required (10-15 digits)');
    if (!qualification || qualification.trim().length < 2) errors.push('Qualification is required');
    if (!specialty || specialty.trim().length < 2) errors.push('Teaching specialty/subject is required');
    if (bio && bio.trim().length > 0 && bio.trim().length < 10) {
      errors.push('Bio must be at least 10 characters when provided');
    }
    if (errors.length) return res.status(400).json({ errors });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES ($1, $2, 'instructor', $3, $4)
         RETURNING id, email, full_name, role, phone`,
        [email.toLowerCase(), passwordHash, full_name.trim(), phone]
      );
      const user = userResult.rows[0];

      const instructorResult = await client.query(
        `INSERT INTO instructors (user_id, bio, qualification, specialty)
         VALUES ($1, $2, $3, $4)
         RETURNING id, bio, qualification, specialty, created_at`,
        [user.id, bio?.trim() || null, qualification.trim(), specialty.trim()]
      );
      const instructor = instructorResult.rows[0];

      await client.query('COMMIT');
      res.status(201).json({
        user,
        instructor: {
          id: instructor.id,
          bio: instructor.bio,
          qualification: instructor.qualification,
          specialty: instructor.specialty,
          created_at: instructor.created_at,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// USERS
// =============================================================================

// GET /api/admin/users  — list all users, filterable by role
async function listUsers(req, res, next) {
  try {
    const { role, search, is_active } = req.query;
    const conditions = [];
    const params = [];

    if (role && ['admin', 'instructor', 'parent', 'student'].includes(role)) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT id, email, full_name, role, phone, is_active, last_login_at, created_at
       FROM users ${where}
       ORDER BY created_at DESC`,
      params
    );

    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id  — single user with their role profile
async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const userResult = await query(
      `SELECT id, email, full_name, role, phone, is_active, last_login_at, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    let profile = null;
    if (user.role === 'parent') {
      const p = await query('SELECT * FROM parents WHERE user_id = $1', [id]);
      profile = p.rows[0] || null;
    } else if (user.role === 'instructor') {
      const i = await query('SELECT * FROM instructors WHERE user_id = $1', [id]);
      profile = i.rows[0] || null;
    } else if (user.role === 'student') {
      const s = await query(
        `SELECT s.*, ag.name AS age_group_name FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         WHERE s.user_id = $1`,
        [id]
      );
      profile = s.rows[0] || null;
    }

    res.json({ user, profile });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id  — update full_name, phone, is_active
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, phone, is_active } = req.body;

    const userResult = await query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const values = [];
    let idx = 0;

    if (full_name !== undefined) { idx++; values.push(full_name); updates.push(`full_name = $${idx}`); }
    if (phone !== undefined) { idx++; values.push(phone); updates.push(`phone = $${idx}`); }
    if (is_active !== undefined) { idx++; values.push(is_active); updates.push(`is_active = $${idx}`); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    idx++; values.push(id);
    updates.push(`updated_at = now()`);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, full_name, role, is_active`,
      values
    );

    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/deactivate  — deactivate a user account
async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const result = await query(
      `UPDATE users SET is_active = FALSE, updated_at = now() WHERE id = $1 AND is_active = TRUE
       RETURNING id, email, full_name, role, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already deactivated' });
    }
    res.json({ user: publicUser(result.rows[0]), deactivated: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/users/:id/activate  — activate a user account
async function activateUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET is_active = TRUE, updated_at = now() WHERE id = $1 AND is_active = FALSE
       RETURNING id, email, full_name, role, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already active' });
    }
    res.json({ user: publicUser(result.rows[0]), activated: true });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// STUDENTS (admin can see/manage all students)
// =============================================================================

// GET /api/admin/students  — list all students with parent & age group info
async function listStudents(req, res, next) {
  try {
    const { is_active } = req.query;
    const conditions = [];
    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === 'true');
      conditions.push(`s.is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT s.*, u.email, u.is_active AS user_is_active, u.full_name AS user_full_name,
               ag.name AS age_group_name, p.full_name AS parent_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN parents p ON p.id = s.parent_id
       JOIN age_groups ag ON ag.id = s.age_group_id
       ${where}
       ORDER BY s.created_at DESC`,
      params
    );

    res.json({ students: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/students/:id/deactivate
async function deactivateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const studentResult = await query('SELECT id, user_id FROM students WHERE id = $1', [id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentResult.rows[0];

    // Deactivate the linked user account if it exists (Category 2)
    if (student.user_id) {
      await query('UPDATE users SET is_active = FALSE WHERE id = $1', [student.user_id]);
    }

    await query('UPDATE students SET is_active = FALSE, updated_at = now() WHERE id = $1', [id]);
    res.json({ student_id: id, deactivated: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/students/:id/activate
async function activateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const studentResult = await query('SELECT id, user_id, age_group_id FROM students WHERE id = $1', [id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentResult.rows[0];

    // Re-activate the linked user account if it exists
    if (student.user_id) {
      await query('UPDATE users SET is_active = TRUE WHERE id = $1', [student.user_id]);
    }

    // If the age group requires account but user_id is NULL, this is inconsistent;
    // for now we just re-activate the student record.
    await query('UPDATE students SET is_active = TRUE, updated_at = now() WHERE id = $1', [id]);
    res.json({ student_id: id, activated: true });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PARENTS (admin can see/manage all parents)
// =============================================================================

// GET /api/admin/parents  — list all parents
async function listParents(req, res, next) {
  try {
    const { is_active } = req.query;
    const conditions = [];
    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === 'true');
      conditions.push(`u.is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.is_active, u.last_login_at, u.created_at,
              p.address, p.emergency_contact
       FROM users u
       JOIN parents p ON p.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );

    res.json({ parents: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/parents/:id/deactivate
async function deactivateParent(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET is_active = FALSE, updated_at = now()
       FROM parents WHERE parents.user_id = users.id AND parents.id = $1 AND users.is_active = TRUE
       RETURNING users.id, users.email, users.full_name, users.role, users.is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found or already deactivated' });
    }
    res.json({ user: publicUser(result.rows[0]), deactivated: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/parents/:id/activate
async function activateParent(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET is_active = TRUE, updated_at = now()
       FROM parents WHERE parents.user_id = users.id AND parents.id = $1 AND users.is_active = FALSE
       RETURNING users.id, users.email, users.full_name, users.role, users.is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found or already active' });
    }
    res.json({ user: publicUser(result.rows[0]), activated: true });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// INSTRUCTORS (admin can see/manage all instructors)
// =============================================================================

// GET /api/admin/instructors  — list all instructors
async function listInstructors(req, res, next) {
  try {
    const { is_active } = req.query;
    const conditions = [];
    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true' || is_active === 'true');
      conditions.push(`u.is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT i.id, u.id AS user_id, u.email, u.full_name, u.phone, u.is_active, u.last_login_at, u.created_at,
              i.bio, i.qualification, i.specialty
       FROM users u
       JOIN instructors i ON i.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );

    res.json({ instructors: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/instructors/:id/deactivate
async function deactivateInstructor(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET is_active = FALSE, updated_at = now()
       FROM instructors WHERE instructors.user_id = users.id AND instructors.id = $1 AND users.is_active = TRUE
       RETURNING users.id, users.email, users.full_name, users.role, users.is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Instructor not found or already deactivated' });
    }
    res.json({ user: publicUser(result.rows[0]), deactivated: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/instructors/:id/activate
async function activateInstructor(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET is_active = TRUE, updated_at = now()
       FROM instructors WHERE instructors.user_id = users.id AND instructors.id = $1 AND users.is_active = FALSE
       RETURNING users.id, users.email, users.full_name, users.role, users.is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Instructor not found or already active' });
    }
    res.json({ user: publicUser(result.rows[0]), activated: true });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// COURSES (admin can manage all courses)
// =============================================================================

// GET /api/admin/courses  — list all courses with instructor & age group info
async function listCourses(req, res, next) {
  try {
    const { status, instructor_id, age_group_id } = req.query;
    const conditions = [];
    const params = [];

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (instructor_id) {
      params.push(instructor_id);
      conditions.push(`c.instructor_id = $${params.length}`);
    }
    if (age_group_id) {
      params.push(age_group_id);
      conditions.push(`c.age_group_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT c.*, u.full_name AS instructor_name, ag.name AS age_group_name
       FROM courses c
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       JOIN age_groups ag ON ag.id = c.age_group_id
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/courses/:id/status  — change course status
async function updateCourseStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'status must be one of: draft, published, archived' });
    }

    const courseResult = await query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const result = await query(
      'UPDATE courses SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ course: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/courses/:id  — admin can delete any course
async function deleteCourse(req, res, next) {
  try {
    const { id } = req.params;
    const courseResult = await query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await query('DELETE FROM courses WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// AGE GROUPS (admin CRUD)
// =============================================================================

// POST /api/admin/age-groups  — create a new age group
async function createAgeGroup(req, res, next) {
  try {
    const { name, min_age, max_age, requires_account } = req.body;

    if (!name || min_age == null || max_age == null) {
      return res.status(400).json({ error: 'name, min_age and max_age are required' });
    }
    if (min_age > max_age) {
      return res.status(400).json({ error: 'min_age cannot be greater than max_age' });
    }

    const result = await query(
      `INSERT INTO age_groups (name, min_age, max_age, requires_account)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, min_age, max_age, requires_account ?? (min_age >= 11)]
    );

    res.status(201).json({ age_group: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/age-groups/:id  — update an age group
async function updateAgeGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { name, min_age, max_age, requires_account } = req.body;

    const existing = await query('SELECT * FROM age_groups WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Age group not found' });
    }

    const updates = [];
    const values = [];
    let idx = 0;

    if (name !== undefined) { idx++; values.push(name); updates.push(`name = $${idx}`); }
    if (min_age !== undefined) { idx++; values.push(min_age); updates.push(`min_age = $${idx}`); }
    if (max_age !== undefined) { idx++; values.push(max_age); updates.push(`max_age = $${idx}`); }
    if (requires_account !== undefined) { idx++; values.push(requires_account); updates.push(`requires_account = $${idx}`); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    idx++; values.push(id);
    updates.push(`updated_at = now()`);

    const result = await query(
      `UPDATE age_groups SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json({ age_group: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/age-groups/:id  — delete an age group
async function deleteAgeGroup(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM age_groups WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Age group not found' });
    }

    await query('DELETE FROM age_groups WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// REPORTS
// =============================================================================

// GET /api/admin/reports  — list all reports, filterable by type
async function listReports(req, res, next) {
  try {
    const { report_type, student_id } = req.query;
    const conditions = [];
    const params = [];

    if (report_type) {
      params.push(report_type);
      conditions.push(`report_type = $${params.length}`);
    }
    if (student_id) {
      params.push(student_id);
      conditions.push(`related_student_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT r.*, u.full_name AS generated_by_name, s.full_name AS student_name
       FROM reports r
       JOIN users u ON u.id = r.generated_by
       LEFT JOIN students s ON s.id = r.related_student_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      params
    );

    res.json({ reports: result.rows });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// NOTIFICATIONS (admin can view all)
// =============================================================================

// GET /api/admin/notifications  — list all notifications, filterable
async function listAllNotifications(req, res, next) {
  try {
    const { user_id, type, is_read } = req.query;
    const conditions = [];
    const params = [];

    if (user_id) {
      params.push(user_id);
      conditions.push(`user_id = $${params.length}`);
    }
    if (type && ['info', 'alert', 'reminder', 'feedback', 'message'].includes(type)) {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }
    if (is_read !== undefined) {
      params.push(is_read === 'true' || is_read === 'true');
      conditions.push(`is_read = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT n.*, u.full_name AS user_name
       FROM notifications n
       JOIN users u ON u.id = n.user_id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT 100`,
      params
    );

    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// ANALYTICS / DETAILED DASHBOARD
// =============================================================================

// GET /api/admin/analytics  — detailed analytics for the admin dashboard
async function getAnalytics(req, res, next) {
  try {
    const [
      userCounts,
      courseCounts,
      lessonCounts,
      activityCounts,
      submissionStats,
      quizStats,
      progressStats,
      dailyActivity,
      topStudents,
      weakAreas,
    ] = await Promise.all([
      query(`SELECT role, COUNT(*) AS count FROM users GROUP BY role`),
      query(`SELECT status, COUNT(*) AS count FROM courses GROUP BY status`),
      query(`SELECT COUNT(*) AS total FROM lessons`),
      query(`SELECT activity_type, COUNT(*) AS count FROM activities GROUP BY activity_type`),
      query(`SELECT status, COUNT(*) AS count FROM activity_submissions GROUP BY status`),
      query(`SELECT AVG(score / NULLIF(total_points, 0)) AS avg_score, COUNT(*) AS total_submissions FROM quiz_results`),
      query(
        `SELECT status, COUNT(*) AS count FROM progress GROUP BY status`
      ),
      query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM users
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`
      ),
      query(
        `SELECT s.id, s.full_name, u.email,
                AVG(qr.score / NULLIF(qr.total_points, 0)) * 100 AS avg_quiz_score,
                COUNT(DISTINCT qr.id) AS quizzes_taken
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN quiz_results qr ON qr.student_id = s.id
         GROUP BY s.id, s.full_name, u.email
         ORDER BY avg_quiz_score DESC NULLS LAST
         LIMIT 10`
      ),
      query(
        `SELECT l.title AS lesson_title, c.title AS course_title,
                AVG(sub.score / NULLIF(a.max_score, 0)) * 100 AS avg_activity_score,
                COUNT(sub.id) AS submission_count
         FROM activity_submissions sub
         JOIN activities a ON a.id = sub.activity_id
         JOIN lessons l ON l.id = a.lesson_id
         JOIN courses c ON c.id = l.course_id
         WHERE sub.status = 'graded'
         GROUP BY l.title, c.title
         HAVING AVG(sub.score / NULLIF(a.max_score, 0)) < 0.6
         ORDER BY avg_activity_score ASC
         LIMIT 10`
      ),
    ]);

    res.json({
      users_by_role: userCounts.rows,
      courses_by_status: courseCounts.rows,
      total_lessons: Number(lessonCounts.rows[0]?.total || 0),
      activities_by_type: activityCounts.rows,
      submissions_by_status: submissionStats.rows,
      quiz_avg_score: quizStats.rows[0]?.avg_score ? Number((quizStats.rows[0].avg_score * 100).toFixed(1)) : 0,
      quiz_total_submissions: Number(quizStats.rows[0]?.total_submissions || 0),
      progress_by_status: progressStats.rows,
      daily_registrations: dailyActivity.rows,
      top_students: topStudents.rows,
      weak_areas: weakAreas.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInstructor,
  listUsers,
  getUser,
  updateUser,
  deactivateUser,
  activateUser,
  listStudents,
  deactivateStudent,
  activateStudent,
  listParents,
  deactivateParent,
  activateParent,
  listInstructors,
  deactivateInstructor,
  activateInstructor,
  listCourses,
  updateCourseStatus,
  deleteCourse,
  createAgeGroup,
  updateAgeGroup,
  deleteAgeGroup,
  listReports,
  listAllNotifications,
  getAnalytics,
};