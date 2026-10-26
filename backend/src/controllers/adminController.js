const bcrypt = require('bcrypt');
const { pool, query } = require('../config/db');
const { isValidEmail, isValidPassword } = require('../utils/validators');

const SALT_ROUNDS = 12;

function calculateAge(dateOfBirth) {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

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
    const { full_name, email, password, phone, bio, qualification, specialty, assigned_grade_levels, assigned_courses } = req.body;

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

      // Link the instructor to the selected grade levels.
      if (assigned_grade_levels && Array.isArray(assigned_grade_levels) && assigned_grade_levels.length > 0) {
        for (const gradeLevelId of assigned_grade_levels) {
          const grade = await client.query(
            'SELECT id FROM grade_levels WHERE id = $1 AND is_active = TRUE', [gradeLevelId]
          );
          if (!grade.rows.length) throw Object.assign(new Error('Choose active grade levels'), { status: 400 });
          await client.query(
            `INSERT INTO instructor_grade_levels (instructor_id, grade_level_id, assigned_by)
             VALUES ($1, $2, $3)`,
            [instructor.id, gradeLevelId, req.user.id]
          );
        }
      }

      if (assigned_courses && Array.isArray(assigned_courses) && assigned_courses.length > 0) {
        const courses = await client.query(
          `SELECT id, grade_level_id FROM courses
           WHERE id = ANY($1::bigint[]) AND grade_level_id = ANY($2::int[])`,
          [assigned_courses, assigned_grade_levels || []]
        );
        if (courses.rows.length !== new Set(assigned_courses.map(String)).size) {
          throw Object.assign(new Error('Every assigned course must belong to a selected grade level'), { status: 400 });
        }
        for (const course of courses.rows) {
          await client.query(
            `INSERT INTO instructor_assignments (instructor_id, course_id, grade_level_id, status, assigned_by)
             VALUES ($1, $2, $3, 'active', $4)`,
            [instructor.id, course.id, course.grade_level_id, req.user.id]
          );
          await client.query(
            `INSERT INTO course_instructor_assignments (course_id, instructor_id, assigned_by)
             VALUES ($1, $2, $3) ON CONFLICT (course_id, instructor_id) DO NOTHING`,
            [course.id, instructor.id, req.user.id]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json({
        user,
        instructor: {
          id: instructor.id,
          bio: instructor.bio,
          qualification: instructor.qualification,
          specialty: instructor.specialty,
          created_at: instructor.created_at,
          assigned_grade_levels: assigned_grade_levels || [],
          assigned_courses: assigned_courses || [],
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
        `SELECT s.*, ag.name AS grade_level_name FROM students s
         JOIN grade_levels ag ON ag.id = s.grade_level_id
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

// GET /api/admin/students  — list all students with parent & grade information
async function listStudents(req, res, next) {
  try {
    const { is_active, limit } = req.query;
    const conditions = [];
    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`s.is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT s.*, u.email, u.is_active AS user_is_active, u.full_name AS user_full_name,
               ag.name AS grade_level_name, pu.full_name AS parent_name
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       JOIN parents p ON p.id = s.parent_id
       JOIN users pu ON pu.id = p.user_id
       LEFT JOIN grade_levels ag ON ag.id = s.grade_level_id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit) || 300]
    );

    res.json({ students: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/students/:id/grade-level
async function updateStudentGradeLevel(req, res, next) {
  try {
    const { id } = req.params;
    const { grade_level_id } = req.body;
    if (!grade_level_id) return res.status(400).json({ error: 'grade_level_id is required' });

    const grade = await query(
      'SELECT id, name FROM grade_levels WHERE id = $1 AND is_active = TRUE', [grade_level_id]
    );
    if (!grade.rows.length) return res.status(400).json({ error: 'Choose an active grade level' });

    const result = await query(
      `UPDATE students SET grade_level_id = $1, updated_at = now()
       WHERE id = $2 RETURNING id, grade_level_id`,
      [grade_level_id, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json({ student: { ...result.rows[0], grade_level_name: grade.rows[0].name } });
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
    const studentResult = await query('SELECT id, user_id, grade_level_id FROM students WHERE id = $1', [id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentResult.rows[0];

    // Re-activate the linked user account if it exists
    if (student.user_id) {
      await query('UPDATE users SET is_active = TRUE WHERE id = $1', [student.user_id]);
    }

    // Parent-managed student profiles can be reactivated without a student login.
    await query('UPDATE students SET is_active = TRUE, updated_at = now() WHERE id = $1', [id]);
    res.json({ student_id: id, activated: true });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PARENTS (admin can see/manage all parents)
// =============================================================================

// POST /api/admin/parents — admin-only, in-person creation of a parent/guardian.
async function createParent(req, res, next) {
  try {
    const { full_name, email, password, phone, date_of_birth, address, emergency_contact,
      guardian_relationship = 'parent', in_person_verified, verification_notes } = req.body;
    const errors = [];
    if (!full_name || full_name.trim().length < 2) errors.push('Full name is required');
    if (!isValidEmail(email)) errors.push('A valid email address is required');
    if (!isValidPassword(password)) errors.push('Password must be at least 8 characters and include a letter and a number');
    if (!phone || !/^\d{10,15}$/.test(phone)) errors.push('Phone number must contain 10 to 15 digits');
    if (!date_of_birth || Number.isNaN(Date.parse(date_of_birth))) errors.push('A valid date of birth is required');

    const relationship = String(guardian_relationship).toLowerCase();
    if (!['parent', 'sibling', 'relative', 'other'].includes(relationship)) {
      errors.push('Select a valid parent or guardian relationship');
    }
    if (date_of_birth && !Number.isNaN(Date.parse(date_of_birth)) && calculateAge(date_of_birth) < 18) {
      errors.push('A parent or guardian must be at least 18 years old');
    }
    if (relationship !== 'parent' && in_person_verified !== true) {
      errors.push('Sibling and other guardian accounts require in-person administrator verification');
    }
    if (relationship !== 'parent' && (!verification_notes || verification_notes.trim().length < 10)) {
      errors.push('Record verification notes of at least 10 characters for a guardian account');
    }
    if (errors.length) return res.status(400).json({ errors });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES ($1, $2, 'parent', $3, $4)
         RETURNING id, email, full_name, phone, role, is_active`,
        [email.toLowerCase(), passwordHash, full_name.trim(), phone]
      );
      const user = userResult.rows[0];
      const parentResult = await client.query(
        `INSERT INTO parents (user_id, address, emergency_contact, date_of_birth, guardian_relationship,
          in_person_verified, verification_notes, verified_by, verified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $6 THEN now() ELSE NULL END)
         RETURNING id, date_of_birth, guardian_relationship, in_person_verified, verified_at`,
        [user.id, address?.trim() || null, emergency_contact?.trim() || null, date_of_birth, relationship,
          in_person_verified === true, verification_notes?.trim() || null, in_person_verified === true ? req.user.id : null]
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'CREATE_PARENT_OR_GUARDIAN', 'parent', $2, $3)`,
        [req.user.id, parentResult.rows[0].id, { email: user.email, guardian_relationship: relationship }]
      );
      await client.query('COMMIT');
      res.status(201).json({ user, parent: parentResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' });
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/parents  — list all parents
async function listParents(req, res, next) {
  try {
    const { is_active, search, limit } = req.query;
    const conditions = [];
    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`u.is_active = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.is_active, u.last_login_at, u.created_at,
              p.id AS parent_id, p.address, p.emergency_contact, p.date_of_birth,
              p.guardian_relationship, p.in_person_verified, p.verified_at, p.verification_notes
       FROM users u
       JOIN parents p ON p.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit) || 300]
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
    const { is_active, limit } = req.query;
    const conditions = [];
    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`u.is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT i.id, u.id AS user_id, u.email, u.full_name, u.phone, u.is_active, u.last_login_at, u.created_at,
              i.bio, i.qualification, i.specialty
       FROM users u
       JOIN instructors i ON i.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit) || 200]
    );

    // Fetch assigned grade levels and courses for each instructor
    const instructors = result.rows;
    for (const instructor of instructors) {
      const gradeLevelsRes = await query(
        `SELECT gl.id, gl.name, gl.code, gl.sequence_order
         FROM instructor_grade_levels iag
         JOIN grade_levels gl ON gl.id = iag.grade_level_id
         WHERE iag.instructor_id = $1`,
        [instructor.id]
      );
      instructor.assigned_grade_levels = gradeLevelsRes.rows;

      const coursesRes = await query(
        `SELECT DISTINCT c.id, c.title, c.description, c.status, c.grade_level_id
         FROM instructor_assignments ia
         JOIN courses c ON c.id = ia.course_id
         WHERE ia.instructor_id = $1 AND ia.status = 'active'`,
        [instructor.id]
      );
      instructor.assigned_courses = coursesRes.rows;
    }

    res.json({ instructors });
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

// PATCH /api/admin/instructors/:id/assignments — update instructor grade and course assignments
async function updateInstructorAssignments(req, res, next) {
  try {
    const { id } = req.params;
    const { assigned_grade_levels, assigned_courses } = req.body;

    if (!Array.isArray(assigned_grade_levels) || !Array.isArray(assigned_courses)) {
      return res.status(400).json({ error: 'assigned_grade_levels and assigned_courses must be arrays' });
    }

    const instructorResult = await query('SELECT id FROM instructors WHERE id = $1', [id]);
    if (instructorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM instructor_grade_levels WHERE instructor_id = $1', [id]);
      for (const gradeLevelId of assigned_grade_levels) {
        const validGrade = await client.query(
          'SELECT id FROM grade_levels WHERE id = $1 AND is_active = TRUE', [gradeLevelId]
        );
        if (!validGrade.rows.length) {
          const error = new Error(`Grade level ${gradeLevelId} is not active`);
          error.status = 400;
          throw error;
        }
        await client.query(
          `INSERT INTO instructor_grade_levels (instructor_id, grade_level_id, assigned_by)
           VALUES ($1, $2, $3)`,
          [id, gradeLevelId, req.user.id]
        );
      }

      const allowedCourses = assigned_courses.length
        ? await client.query(
          `SELECT id, grade_level_id FROM courses
           WHERE id = ANY($1::bigint[]) AND grade_level_id = ANY($2::int[])`,
          [assigned_courses, assigned_grade_levels]
        )
        : { rows: [] };

      if (allowedCourses.rows.length !== new Set(assigned_courses.map(String)).size) {
        const error = new Error('Every assigned course must exist and belong to one of the selected grade levels');
        error.status = 400;
        throw error;
      }

      await client.query(
        `UPDATE instructor_assignments SET status = 'inactive', updated_at = now()
         WHERE instructor_id = $1 AND status = 'active'`, [id]
      );
      await client.query(
        `DELETE FROM course_instructor_assignments
         WHERE instructor_id = $1 AND NOT (course_id = ANY($2::bigint[]))`,
        [id, assigned_courses]
      );
      for (const course of allowedCourses.rows) {
        const previous = await client.query(
          'SELECT id FROM instructor_assignments WHERE instructor_id = $1 AND course_id = $2 LIMIT 1',
          [id, course.id]
        );
        if (previous.rows.length) {
          await client.query(
            `UPDATE instructor_assignments
             SET grade_level_id = $1, status = 'active', assigned_by = $2, updated_at = now()
             WHERE id = $3`,
            [course.grade_level_id, req.user.id, previous.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO instructor_assignments (instructor_id, course_id, grade_level_id, status, assigned_by)
             VALUES ($1, $2, $3, 'active', $4)`,
            [id, course.id, course.grade_level_id, req.user.id]
          );
        }
        await client.query(
          `INSERT INTO course_instructor_assignments (course_id, instructor_id, assigned_by)
           VALUES ($1, $2, $3) ON CONFLICT (course_id, instructor_id) DO NOTHING`,
          [course.id, id, req.user.id]
        );
      }

      await client.query('COMMIT');
      res.json({ 
        success: true, 
        message: 'Instructor assignments updated successfully',
        assigned_grade_levels,
        assigned_courses
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
// COURSES (admin can manage all courses)
// =============================================================================

// GET /api/admin/courses  — list all courses with instructor & grade information
async function listCourses(req, res, next) {
  try {
    const { status, instructor_id, grade_level_id, search, limit } = req.query;
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
    if (grade_level_id) {
      params.push(grade_level_id);
      conditions.push(`c.grade_level_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.title ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT c.*, u.full_name AS instructor_name, ag.name AS grade_level_name, s.name AS subject_name, s.code AS subject_code
       FROM courses c
       LEFT JOIN instructors i ON i.id = c.instructor_id
       LEFT JOIN users u ON u.id = i.user_id
       JOIN grade_levels ag ON ag.id = c.grade_level_id
       LEFT JOIN subjects s ON s.id = c.subject_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit) || 300]
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

// PATCH /api/admin/courses/:id  — admin can update course details (subject_id, etc.)
async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { subject_id } = req.body;

    const courseResult = await query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // If subject_id is provided, validate it exists
    if (subject_id !== undefined && subject_id !== null) {
      const subjectCheck = await query('SELECT id FROM subjects WHERE id = $1', [subject_id]);
      if (subjectCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Subject not found' });
      }
    }

    const result = await query(
      `UPDATE courses
       SET subject_id = COALESCE($1, subject_id),
           updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [subject_id, id]
    );

    res.json({ course: result.rows[0] });
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

// PATCH /api/admin/notifications/:id/read
async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/notifications/read-all
async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE RETURNING id`,
      [req.user.id]
    );
    res.json({ updated: result.rowCount, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/notifications/unread
async function getUnreadNotifications(req, res, next) {
  try {
    const countResult = await query(
      `SELECT COUNT(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    const recentResult = await query(
      `SELECT n.*, u.full_name AS user_name
       FROM notifications n
       JOIN users u ON u.id = n.user_id
       WHERE n.user_id = $1 AND n.is_read = FALSE
       ORDER BY n.created_at DESC
       LIMIT 10`,
      [req.user.id]
    );
    res.json({
      unread_count: countResult.rows[0]?.unread_count || 0,
      notifications: recentResult.rows,
    });
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
  createParent,
  listUsers,
  getUser,
  updateUser,
  deactivateUser,
  activateUser,
  listStudents,
  updateStudentGradeLevel,
  deactivateStudent,
  activateStudent,
  listParents,
  deactivateParent,
  activateParent,
  listInstructors,
  deactivateInstructor,
  activateInstructor,
  updateInstructorAssignments,
  listCourses,
  updateCourseStatus,
  updateCourse,
  deleteCourse,
  listReports,
  listAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotifications,
  getAnalytics,
};
