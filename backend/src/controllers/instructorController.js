/**
 * instructorController.js
 * All instructor-facing endpoints.
 * Security: Every request verifies JWT → role=instructor → assignment ownership.
 */
const { query, pool } = require('../config/db');

/* ─── Helpers ─── */

async function getInstructorId(userId) {
  const r = await query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
  if (!r.rows.length) throw Object.assign(new Error('Instructor profile not found'), { status: 403 });
  return r.rows[0].id;
}

async function verifyAssignmentOwnership(assignmentId, instructorId) {
  const r = await query(
    'SELECT id FROM instructor_assignments WHERE id = $1 AND instructor_id = $2',
    [assignmentId, instructorId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Assignment not found or access denied'), { status: 403 });
  return r.rows[0];
}

async function verifyStudentInAssignment(studentId, assignmentId) {
  // A student belongs to this assignment via the course's age group matching the student's age group
  // and the section/grade matching if provided.
  const r = await query(
    `SELECT s.id FROM students s
     JOIN instructor_assignments ia ON ia.course_id IN (
       SELECT ic.course_id FROM instructor_courses ic WHERE ic.instructor_id = ia.instructor_id
     )
     WHERE s.id = $1 AND ia.id = $2
     LIMIT 1`,
    [studentId, assignmentId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Student does not belong to this assignment'), { status: 403 });
}

/* ─── Dashboard ─── */

async function getDashboard(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);

    const [assignmentsRes, statsRes] = await Promise.all([
      query(
        `SELECT ia.id, ia.status, ia.grade, ia.section, ia.academic_year_id,
                c.title AS course_title, c.description AS course_description,
                ag.name AS age_group_name,
                ay.label AS academic_year,
                COUNT(DISTINCT s.id) AS student_count,
                COUNT(DISTINCT l.id) AS lesson_count,
                COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending') AS pending_count,
                COUNT(DISTINCT m.id) AS material_count
         FROM instructor_assignments ia
         JOIN courses c ON c.id = ia.course_id
         JOIN age_groups ag ON ag.id = ia.age_group_id
         LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
         LEFT JOIN students s ON s.age_group_id = ia.age_group_id
         LEFT JOIN lessons l ON l.course_id = ia.course_id
         LEFT JOIN learning_materials m ON m.lesson_id = l.id
         LEFT JOIN activity_submissions sub ON sub.student_id = s.id
         WHERE ia.instructor_id = $1
         GROUP BY ia.id, c.title, c.description, ag.name, ay.label
         ORDER BY ia.created_at DESC`,
        [instructorId]
      ),
      query(
        `SELECT
           COUNT(DISTINCT ia.id) AS assignments,
           COUNT(DISTINCT s.id) AS students,
           COUNT(DISTINCT l.id) AS lessons,
           COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending') AS pending_submissions
         FROM instructor_assignments ia
         JOIN courses c ON c.id = ia.course_id
         LEFT JOIN students s ON s.age_group_id = ia.age_group_id
         LEFT JOIN lessons l ON l.course_id = ia.course_id
         LEFT JOIN activity_submissions sub ON sub.student_id = s.id
         WHERE ia.instructor_id = $1`,
        [instructorId]
      ),
    ]);

    const summary = {
      assignments: parseInt(statsRes.rows[0]?.assignments || 0),
      students:    parseInt(statsRes.rows[0]?.students || 0),
      lessons:     parseInt(statsRes.rows[0]?.lessons || 0),
      pending_submissions: parseInt(statsRes.rows[0]?.pending_submissions || 0),
      attendance_rate: 0,
      avg_score: 0,
    };

    res.json({ summary, assignments: assignmentsRes.rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Assignments ─── */

async function listAssignments(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { rows } = await query(
      `SELECT ia.id, ia.status, ia.grade, ia.section,
              c.title AS course_title, c.description AS course_description,
              ag.name AS age_group_name,
              ay.label AS academic_year,
              COUNT(DISTINCT s.id) AS student_count,
              COUNT(DISTINCT l.id) AS lesson_count,
              COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending') AS pending_count
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       LEFT JOIN students s ON s.age_group_id = ia.age_group_id
       LEFT JOIN lessons l ON l.course_id = ia.course_id
       LEFT JOIN activity_submissions sub ON sub.student_id = s.id
       WHERE ia.instructor_id = $1
       GROUP BY ia.id, c.title, c.description, ag.name, ay.label
       ORDER BY ia.created_at DESC`,
      [instructorId]
    );
    res.json({ assignments: rows });
  } catch (err) {
    next(err);
  }
}

async function getAssignment(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;

    const { rows } = await query(
      `SELECT ia.id, ia.status, ia.grade, ia.section,
              c.title AS course_title, c.description AS course_description,
              ag.name AS age_group_name,
              ay.label AS academic_year,
              COUNT(DISTINCT s.id) AS student_count,
              COUNT(DISTINCT l.id) AS lesson_count,
              COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending') AS pending_count,
              COUNT(DISTINCT m.id) AS material_count
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       LEFT JOIN students s ON s.age_group_id = ia.age_group_id
       LEFT JOIN lessons l ON l.course_id = ia.course_id
       LEFT JOIN learning_materials m ON m.lesson_id = l.id
       LEFT JOIN activity_submissions sub ON sub.student_id = s.id
       WHERE ia.id = $1 AND ia.instructor_id = $2
       GROUP BY ia.id, c.title, c.description, ag.name, ay.label`,
      [id, instructorId]
    );
    if (!rows.length) return res.status(403).json({ error: 'Assignment not found or access denied' });
    res.json({ assignment: rows[0] });
  } catch (err) {
    next(err);
  }
}

/* ─── Students ─── */

async function getAssignmentStudents(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    // Get age_group_id for this assignment
    const iaRes = await query('SELECT age_group_id FROM instructor_assignments WHERE id = $1', [id]);
    if (!iaRes.rows.length) return res.status(404).json({ error: 'Assignment not found' });

    const { rows } = await query(
      `SELECT s.id, s.full_name, s.date_of_birth, s.gender,
              ag.name AS age_group_name,
              CASE WHEN s.user_id IS NULL THEN 'parent-managed' ELSE 'individual' END AS account_type
       FROM students s
       JOIN age_groups ag ON ag.id = s.age_group_id
       WHERE s.age_group_id = $1 AND s.is_active = TRUE
       ORDER BY s.full_name`,
      [iaRes.rows[0].age_group_id]
    );
    res.json({ students: rows });
  } catch (err) {
    next(err);
  }
}

async function getStudentProfile(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { studentId } = req.params;

    // Verify this student belongs to at least one of the instructor's assignments
    const accessCheck = await query(
      `SELECT s.id FROM students s
       JOIN instructor_assignments ia ON ia.instructor_id = $1 AND ia.age_group_id = s.age_group_id
       WHERE s.id = $2 LIMIT 1`,
      [instructorId, studentId]
    );
    if (!accessCheck.rows.length) return res.status(403).json({ error: 'Student does not belong to your classes' });

    const [studentRes, submissionsRes, feedbackRes] = await Promise.all([
      query(
        `SELECT s.id, s.full_name, s.date_of_birth, s.gender,
                ag.name AS age_group_name,
                CASE WHEN s.user_id IS NULL THEN 'parent-managed' ELSE 'individual' END AS account_type
         FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         WHERE s.id = $1`,
        [studentId]
      ),
      query(
        `SELECT sub.id, sub.status, sub.score, sub.max_score, sub.submitted_at,
                a.title AS activity_title
         FROM activity_submissions sub
         JOIN activities a ON a.id = sub.activity_id
         WHERE sub.student_id = $1
         ORDER BY sub.submitted_at DESC LIMIT 10`,
        [studentId]
      ),
      query(
        `SELECT tf.id, tf.feedback, tf.created_at,
                a.title AS activity_title
         FROM teacher_feedback tf
         LEFT JOIN activities a ON a.id = tf.activity_id
         WHERE tf.student_id = $1
         ORDER BY tf.created_at DESC LIMIT 10`,
        [studentId]
      ),
    ]);

    if (!studentRes.rows.length) return res.status(404).json({ error: 'Student not found' });

    // Calculate avg score
    const gradedSubs = submissionsRes.rows.filter(s => s.score != null && s.max_score > 0);
    const avgScore = gradedSubs.length
      ? Math.round(gradedSubs.reduce((acc, s) => acc + (s.score / s.max_score * 100), 0) / gradedSubs.length)
      : 0;

    res.json({
      student: studentRes.rows[0],
      avg_score: avgScore,
      attendance_rate: 0, // Would need attendance table query
      progress: { overall: 0, activities_done: gradedSubs.length, activities_total: submissionsRes.rows.length, courses: [] },
      recent_submissions: submissionsRes.rows,
      feedback_history: feedbackRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

/* ─── Lessons ─── */

async function getAssignmentLessons(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    const ia = await verifyAssignmentOwnership(id, instructorId);

    const { rows } = await query(
      `SELECT l.*, ia.course_id
       FROM lessons l
       JOIN instructor_assignments ia ON ia.id = $1 AND ia.course_id = l.course_id
       ORDER BY l.order_index`,
      [id]
    );
    res.json({ lessons: rows });
  } catch (err) {
    next(err);
  }
}

async function createLesson(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    // Get course_id from assignment
    const iaRes = await query('SELECT course_id FROM instructor_assignments WHERE id = $1', [id]);
    const courseId = iaRes.rows[0].course_id;

    const { title, description, order_index, status } = req.body;
    if (!title) return res.status(400).json({ error: 'Lesson title is required' });

    const { rows } = await query(
      `INSERT INTO lessons (course_id, title, description, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [courseId, title, description || null, order_index || 1]
    );
    res.status(201).json({ lesson: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Lesson with this order already exists' });
    next(err);
  }
}

/* ─── Materials ─── */

async function getAssignmentMaterials(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    const { rows } = await query(
      `SELECT m.* FROM learning_materials m
       JOIN lessons l ON l.id = m.lesson_id
       JOIN instructor_assignments ia ON ia.course_id = l.course_id AND ia.id = $1
       ORDER BY m.created_at DESC`,
      [id]
    );
    res.json({ materials: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Activities ─── */

async function getAssignmentActivities(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    const { rows } = await query(
      `SELECT a.* FROM activities a
       JOIN instructor_assignments ia ON ia.course_id = a.course_id AND ia.id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );
    res.json({ activities: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Submissions ─── */

async function getAssignmentSubmissions(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    const { rows } = await query(
      `SELECT sub.id, sub.status, sub.score, a.max_score, sub.submitted_at,
              s.full_name AS student_name,
              a.title AS activity_title
       FROM activity_submissions sub
       JOIN students s ON s.id = sub.student_id
       JOIN activities a ON a.id = sub.activity_id
       JOIN instructor_assignments ia ON ia.course_id = a.course_id AND ia.id = $1
       ORDER BY sub.submitted_at DESC`,
      [id]
    );
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Attendance ─── */

async function getAttendance(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Support both old schema (session_date/present) and new (date/status)
    const { rows } = await query(
      `SELECT att.student_id,
              COALESCE(att.status,
                CASE WHEN att.present THEN 'present' ELSE 'absent' END,
                'present') AS status
       FROM attendance att
       WHERE (att.assignment_id = $1 OR att.assignment_id IS NULL)
         AND (att.date = $2 OR att.session_date = $2)`,
      [id, date]
    );
    res.json({ attendance: rows });
  } catch (err) {
    next(err);
  }
}

async function saveAttendance(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) return res.status(400).json({ error: 'date and records are required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Upsert each attendance record
      for (const rec of records) {
        await client.query(
          `INSERT INTO attendance (assignment_id, student_id, date, status, marked_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (assignment_id, student_id, date)
           DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
          [id, rec.student_id, date, rec.status, req.user.id]
        );
      }
      await client.query('COMMIT');
      res.json({ message: 'Attendance saved', count: records.length });
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

/* ─── Progress ─── */

async function getAssignmentProgress(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    const iaRes = await query('SELECT age_group_id, course_id FROM instructor_assignments WHERE id = $1', [id]);
    if (!iaRes.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    const { age_group_id, course_id } = iaRes.rows[0];

    const { rows } = await query(
      `SELECT s.id AS student_id, s.full_name AS student_name,
              COUNT(DISTINCT sub.id) FILTER (WHERE sub.status != 'pending') AS activities_done,
              COUNT(DISTINCT sub.id) AS activities_total,
              COALESCE(AVG(sub.score::float / NULLIF(a.max_score,0) * 100), 0)::int AS avg_score
       FROM students s
       LEFT JOIN activity_submissions sub ON sub.student_id = s.id
       LEFT JOIN activities a ON a.id = sub.activity_id
       WHERE s.age_group_id = $1 AND s.is_active = TRUE
       GROUP BY s.id, s.full_name
       ORDER BY s.full_name`,
      [age_group_id]
    );

    const progress = rows.map(r => ({
      ...r,
      progress_pct: r.activities_total > 0
        ? Math.round((parseInt(r.activities_done) / parseInt(r.activities_total)) * 100)
        : 0,
    }));

    res.json({ progress });
  } catch (err) {
    next(err);
  }
}

/* ─── Announcements ─── */

async function getAnnouncements(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    const { rows } = await query(
      `SELECT a.* FROM announcements a
       WHERE a.assignment_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );
    res.json({ announcements: rows });
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    await verifyAssignmentOwnership(id, instructorId);

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const { rows } = await query(
      `INSERT INTO announcements (assignment_id, created_by, title, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.id, title, content]
    );
    res.status(201).json({ announcement: rows[0] });
  } catch (err) {
    next(err);
  }
}

/* ─── Notifications ─── */

async function getNotifications(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
}

/* ─── Profile ─── */

async function getProfile(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active,
              i.bio, i.qualification, i.specialty,
              CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END AS status
       FROM users u
       JOIN instructors i ON i.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });

    // Get assignments
    const instructorId = await getInstructorId(req.user.id);
    const assignmentsRes = await query(
      `SELECT ia.id, c.title AS course_title, ag.name AS age_group_name, ia.grade
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'`,
      [instructorId]
    );

    res.json({ profile: { ...rows[0], assignments: assignmentsRes.rows } });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { bio, specialty, qualification, phone } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE users SET phone = $1, updated_at = now() WHERE id = $2',
        [phone || null, req.user.id]
      );
      await client.query(
        'UPDATE instructors SET bio = $1, specialty = $2, qualification = $3 WHERE user_id = $4',
        [bio || null, specialty || null, qualification || null, req.user.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows } = await query(
      `SELECT u.id, u.full_name, u.email, u.phone,
              i.bio, i.qualification, i.specialty,
              CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END AS status
       FROM users u
       JOIN instructors i ON i.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ profile: rows[0] });
  } catch (err) {
    next(err);
  }
}

/* ─── Messages ─── */

async function getConversations(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id))
              m.id,
              CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS receiver_id,
              CASE WHEN m.sender_id = $1 THEN ru.full_name ELSE su.full_name END AS other_name,
              CASE WHEN m.sender_id = $1 THEN ru.role ELSE su.role END AS other_role,
              m.body AS last_message,
              m.sent_at AS created_at
       FROM messages m
       JOIN users su ON su.id = m.sender_id
       JOIN users ru ON ru.id = m.receiver_id
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id), m.sent_at DESC`,
      [req.user.id]
    );
    res.json({ conversations: rows });
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const otherId = req.params.otherId;
    const { rows } = await query(
      `SELECT m.*, m.body AS message, (m.sender_id = $1) AS is_mine
       FROM messages m
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.sent_at ASC`,
      [req.user.id, otherId]
    );
    res.json({ messages: rows });
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) return res.status(400).json({ error: 'receiver_id and message are required' });

    const { rows } = await query(
      `INSERT INTO messages (sender_id, receiver_id, body) VALUES ($1, $2, $3) RETURNING *, body AS message, sender_id = $1 AS is_mine`,
      [req.user.id, receiver_id, message]
    );
    res.status(201).json({ message: { ...rows[0], message: rows[0].body, is_mine: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  listAssignments,
  getAssignment,
  getAssignmentStudents,
  getStudentProfile,
  getAssignmentLessons,
  createLesson,
  getAssignmentMaterials,
  getAssignmentActivities,
  getAssignmentSubmissions,
  getAttendance,
  saveAttendance,
  getAssignmentProgress,
  getAnnouncements,
  createAnnouncement,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getProfile,
  updateProfile,
  getConversations,
  getConversation,
  sendMessage,
};
