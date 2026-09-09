/**
 * instructorController.js
 * All instructor-facing endpoints.
 * Security: Every request verifies JWT → role=instructor → course ownership.
 */
const { query, pool } = require('../config/db');

/* ─── Helpers ─── */

async function getInstructorId(userId) {
  const r = await query('SELECT id FROM instructors WHERE user_id = $1', [userId]);
  if (!r.rows.length) throw Object.assign(new Error('Instructor profile not found'), { status: 403 });
  return r.rows[0].id;
}

// Verify this course is currently assigned to this instructor.
async function verifyCourseOwnership(courseId, instructorId) {
  const r = await query(
    `SELECT ia.*, c.title AS course_title, ag.name AS age_group_name,
            ay.label AS academic_year
     FROM instructor_assignments ia
     JOIN courses c ON c.id = ia.course_id
     JOIN age_groups ag ON ag.id = ia.age_group_id
     LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
     WHERE ia.course_id = $1 AND ia.instructor_id = $2 AND ia.status = 'active'
     LIMIT 1`,
    [courseId, instructorId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Course not found or access denied'), { status: 403 });
  return r.rows[0];
}

/* ─── Dashboard ─── */

async function getDashboard(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);

    const coursesRes = await query(
      `SELECT
         c.id AS course_id,
         c.title AS course_title,
         c.description AS course_description,
         c.thumbnail_url,
         c.status AS course_status,
         ag.name AS age_group_name,
         ay.label AS academic_year,
         ia.grade,
         ia.section,
         ia.id AS assignment_id,
         COUNT(DISTINCT l.id)::int AS lesson_count,
         COUNT(DISTINCT m.id)::int AS material_count,
         COUNT(DISTINCT s.id)::int AS student_count,
         COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending') AS pending_count
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN learning_materials m ON m.lesson_id = l.id
       LEFT JOIN students s ON s.age_group_id = ia.age_group_id
       LEFT JOIN activity_submissions sub ON sub.student_id = s.id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'
       GROUP BY c.id, c.title, c.description, c.thumbnail_url, c.status,
                ag.name, ay.label, ia.grade, ia.section, ia.id
       ORDER BY ia.created_at DESC`,
      [instructorId]
    );

    const statsRes = await query(
      `SELECT
         COUNT(DISTINCT ia.id) AS courses,
         COUNT(DISTINCT s.id) AS students,
         COUNT(DISTINCT l.id) AS lessons,
         COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending') AS pending_submissions,
         COUNT(DISTINCT m.id) AS materials,
         COUNT(DISTINCT v.id) AS videos
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       LEFT JOIN students s ON s.age_group_id = ia.age_group_id
       LEFT JOIN lessons l ON l.course_id = ia.course_id
       LEFT JOIN learning_materials m ON m.lesson_id = l.id
       LEFT JOIN videos v ON v.lesson_id = l.id
       LEFT JOIN activity_submissions sub ON sub.student_id = s.id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'`,
      [instructorId]
    );

    const summary = {
      courses: parseInt(statsRes.rows[0]?.courses || 0),
      students: parseInt(statsRes.rows[0]?.students || 0),
      lessons: parseInt(statsRes.rows[0]?.lessons || 0),
      materials: parseInt(statsRes.rows[0]?.materials || 0),
      videos: parseInt(statsRes.rows[0]?.videos || 0),
      pending_submissions: parseInt(statsRes.rows[0]?.pending_submissions || 0),
      attendance_rate: 0,
      avg_score: 0,
    };

    res.json({ summary, courses: coursesRes.rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Students ─── */

async function getCourseStudents(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;
    const ia = await verifyCourseOwnership(id, instructorId);

    const { rows } = await query(
      `SELECT s.id, s.full_name, s.date_of_birth, s.gender, s.grade, s.section,
              ag.name AS age_group_name,
              CASE WHEN s.user_id IS NULL THEN 'parent-managed' ELSE 'individual' END AS account_type
       FROM students s
       JOIN age_groups ag ON ag.id = s.age_group_id
       WHERE s.age_group_id = $1
         AND s.is_active = TRUE
         AND ($2::varchar IS NULL OR s.grade = $2)
         AND ($3::varchar IS NULL OR s.section = $3)
       ORDER BY s.full_name`,
      [ia.age_group_id, ia.grade || null, ia.section || null]
    );

    res.json({
      course: {
        course_id: id,
        course_title: ia.course_title,
        age_group_name: ia.age_group_name,
        grade: ia.grade,
        section: ia.section,
      },
      students: rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getStudentProfile(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { studentId } = req.params;

    // Verify this student belongs to at least one of the instructor's courses
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

    // Get active courses
    const instructorId = await getInstructorId(req.user.id);
    const coursesRes = await query(
      `SELECT ia.id AS assignment_id, c.id AS course_id, c.title AS course_title,
              ag.name AS age_group_name, ia.grade
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'`,
      [instructorId]
    );

    res.json({ profile: { ...rows[0], courses: coursesRes.rows } });
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

/* ─── Courses (Instructor LMS workspace) ─── */

/**
 * GET /api/instructor/courses
 * Every course assigned to this instructor (active assignments) with the
 * classroom metadata and content summary the Courses tab needs.
 */
async function listCourses(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { rows } = await query(
      `SELECT
         c.id AS course_id,
         c.title AS course_title,
         c.description AS course_description,
         c.thumbnail_url,
         c.status AS course_status,
         c.created_at,
         ag.name AS age_group_name,
         ay.label AS academic_year,
         ia.grade,
         ia.section,
         ia.status AS assignment_status,
         ia.id AS assignment_id,
         COUNT(DISTINCT l.id)::int AS lesson_count,
         COUNT(DISTINCT m.id)::int AS material_count,
         COUNT(DISTINCT v.id)::int AS video_count,
         COUNT(DISTINCT s.id)::int AS student_count
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN learning_materials m ON m.lesson_id = l.id
       LEFT JOIN videos v ON v.lesson_id = l.id
       LEFT JOIN students s ON s.age_group_id = ia.age_group_id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'
       GROUP BY c.id, c.title, c.description, c.thumbnail_url, c.status,
                c.created_at, ag.name, ay.label, ia.grade, ia.section,
                ia.status, ia.id
       ORDER BY ia.created_at DESC`,
      [instructorId]
    );
    res.json({ courses: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/instructor/courses/:id
 * Full assigned-course detail: classroom metadata, student count, and the
 * ordered lesson list with content counts so the Course Detail page can render
 * the lesson management actions.
 */
async function getCourse(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { id } = req.params;

    const courseRes = await query(
      `SELECT ia.id AS assignment_id, ia.grade, ia.section, ia.academic_year_id,
              ia.status AS assignment_status,
              c.*, ag.name AS age_group_name, ay.label AS academic_year
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN age_groups ag ON ag.id = ia.age_group_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       WHERE c.id = $1 AND ia.instructor_id = $2 AND ia.status = 'active'
       LIMIT 1`,
      [id, instructorId]
    );
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const course = courseRes.rows[0];

    const [lessonsRes, studentCountRes] = await Promise.all([
      query(
        `SELECT l.*,
                COUNT(DISTINCT m.id)::int AS material_count,
                COUNT(DISTINCT v.id)::int AS video_count,
                COUNT(DISTINCT q.id)::int AS quiz_count,
                COUNT(DISTINCT a.id)::int AS activity_count
         FROM lessons l
         LEFT JOIN learning_materials m ON m.lesson_id = l.id
         LEFT JOIN videos v ON v.lesson_id = l.id
         LEFT JOIN quizzes q ON q.lesson_id = l.id
         LEFT JOIN activities a ON a.lesson_id = l.id
         WHERE l.course_id = $1
         GROUP BY l.id
         ORDER BY l.order_index`,
        [id]
      ),
      query(
        `SELECT COUNT(DISTINCT s.id)::int AS student_count
         FROM students s
         WHERE s.age_group_id = $1
           AND ($2::varchar IS NULL OR s.grade = $2)
           AND ($3::varchar IS NULL OR s.section = $3)`,
        [course.age_group_id, course.grade || null, course.section || null]
      ),
    ]);

    course.student_count = studentCountRes.rows[0].student_count;
    res.json({ course, lessons: lessonsRes.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getStudentProfile,
  getCourseStudents,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getProfile,
  updateProfile,
  getConversations,
  getConversation,
  sendMessage,
  listCourses,
  getCourse,
};