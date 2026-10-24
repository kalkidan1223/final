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
    `SELECT ia.*, c.title AS course_title, gl.name AS grade_level_name,
            ay.label AS academic_year
     FROM instructor_assignments ia
     JOIN courses c ON c.id = ia.course_id
     JOIN grade_levels gl ON gl.id = ia.grade_level_id
     LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
     WHERE ia.course_id = $1 AND ia.instructor_id = $2 AND ia.status = 'active'
     LIMIT 1`,
    [courseId, instructorId]
  );
  if (!r.rows.length) throw Object.assign(new Error('Course not found or access denied'), { status: 403 });
  return r.rows[0];
}

/* ─── Dashboard ─── */

/* ─── Dashboard ─── */

async function getDashboard(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);

    // Get assigned courses
    const coursesRes = await query(
      `SELECT
         c.id AS course_id,
         c.title AS course_title,
         c.description AS course_description,
         c.thumbnail_url,
         c.status AS course_status,
         gl.name AS grade_level_name,
         ay.label AS academic_year,
         ia.grade,
         ia.section,
         ia.id AS assignment_id,
         COUNT(DISTINCT l.id)::int AS lesson_count,
         COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active')::int AS published_lesson_count,
         COUNT(DISTINCT m.id)::int AS material_count,
         COUNT(DISTINCT a.id)::int AS activity_count,
         COUNT(DISTINCT q.id)::int AS quiz_count,
         COUNT(DISTINCT s.id)::int AS student_count,
         COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending')::int AS pending_count
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN grade_levels gl ON gl.id = ia.grade_level_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN learning_materials m ON m.lesson_id = l.id
       LEFT JOIN activities a ON a.lesson_id = l.id
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN students s ON s.grade_level_id = ia.grade_level_id AND s.is_active = TRUE
       LEFT JOIN activity_submissions sub ON sub.activity_id = a.id AND sub.student_id = s.id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'
       GROUP BY c.id, c.title, c.description, c.thumbnail_url, c.status,
                gl.name, ay.label, ia.grade, ia.section, ia.id
       ORDER BY ia.created_at DESC`,
      [instructorId]
    );

    const courseIds = coursesRes.rows.map(r => r.course_id);

    // If no courses assigned yet
    if (courseIds.length === 0) {
      return res.json({
        summary: {
          courses: 0,
          students: 0,
          lessons: 0,
          published_lessons: 0,
          materials: 0,
          activities: 0,
          quizzes: 0,
          pending_submissions: 0,
          avg_score: 0,
        },
        courses: [],
        recent_submissions: [],
        recent_quiz_results: [],
        progress_overview: {
          active_students: 0,
          completed_students: 0,
          avg_progress: 0,
        }
      });
    }

    // Consolidated database statistics across all assigned courses
    const [statsRes, recentSubsRes, recentQuizzesRes, progressRes] = await Promise.all([
      query(
        `SELECT
           COUNT(DISTINCT ia.id)::int AS courses,
           COUNT(DISTINCT s.id)::int AS students,
           COUNT(DISTINCT l.id)::int AS lessons,
           COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active')::int AS published_lessons,
           COUNT(DISTINCT m.id)::int AS materials,
           COUNT(DISTINCT a.id)::int AS activities,
           COUNT(DISTINCT q.id)::int AS quizzes,
           COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending')::int AS pending_submissions
         FROM instructor_assignments ia
         JOIN courses c ON c.id = ia.course_id
         LEFT JOIN students s ON s.grade_level_id = ia.grade_level_id AND s.is_active = TRUE
         LEFT JOIN lessons l ON l.course_id = ia.course_id
         LEFT JOIN learning_materials m ON m.lesson_id = l.id
         LEFT JOIN activities a ON a.lesson_id = l.id
         LEFT JOIN quizzes q ON q.lesson_id = l.id
         LEFT JOIN activity_submissions sub ON sub.activity_id = a.id AND sub.student_id = s.id
         WHERE ia.instructor_id = $1 AND ia.status = 'active'`,
        [instructorId]
      ),
      query(
        `SELECT
           sub.id,
           sub.activity_id,
           sub.student_id,
           sub.status,
           sub.score,
           sub.percentage,
           sub.submitted_at,
           sub.submission_url,
           sub.submission_text,
           s.full_name AS student_name,
           a.title AS activity_title,
           a.activity_type,
           a.max_score,
           l.title AS lesson_title,
           c.title AS course_title,
           c.id AS course_id
         FROM activity_submissions sub
         JOIN activities a ON a.id = sub.activity_id
         JOIN students s ON s.id = sub.student_id
         JOIN lessons l ON l.id = a.lesson_id
         JOIN courses c ON c.id = l.course_id
         WHERE l.course_id = ANY($1)
         ORDER BY sub.submitted_at DESC
         LIMIT 6`,
        [courseIds]
      ),
      query(
        `SELECT
           qr.id,
           qr.quiz_id,
           qr.student_id,
           qr.score,
           qr.total_points,
           qr.percentage,
           qr.submitted_at,
           s.full_name AS student_name,
           q.title AS quiz_title,
           q.passing_score,
           l.title AS lesson_title,
           c.title AS course_title,
           c.id AS course_id,
           CASE WHEN qr.percentage >= COALESCE(q.passing_score, 70) THEN true ELSE false END AS is_passed
         FROM quiz_results qr
         JOIN quizzes q ON q.id = qr.quiz_id
         JOIN students s ON s.id = qr.student_id
         JOIN lessons l ON l.id = q.lesson_id
         JOIN courses c ON c.id = l.course_id
         WHERE l.course_id = ANY($1)
         ORDER BY qr.submitted_at DESC
         LIMIT 6`,
        [courseIds]
      ),
      query(
        `SELECT
           COUNT(DISTINCT p.student_id)::int AS active_students,
           COUNT(DISTINCT p.student_id) FILTER (WHERE p.status = 'completed')::int AS completed_students,
           COALESCE(AVG(p.completion_percentage), 0)::numeric(5,1) AS avg_progress
         FROM progress p
         WHERE p.course_id = ANY($1)`,
        [courseIds]
      )
    ]);

    const stats = statsRes.rows[0] || {};
    const prog = progressRes.rows[0] || {};

    const summary = {
      courses: parseInt(stats.courses || 0),
      students: parseInt(stats.students || 0),
      lessons: parseInt(stats.lessons || 0),
      published_lessons: parseInt(stats.published_lessons || 0),
      materials: parseInt(stats.materials || 0),
      activities: parseInt(stats.activities || 0),
      quizzes: parseInt(stats.quizzes || 0),
      pending_submissions: parseInt(stats.pending_submissions || 0),
      avg_score: parseFloat(prog.avg_progress || 0),
    };

    res.json({
      summary,
      courses: coursesRes.rows,
      recent_submissions: recentSubsRes.rows,
      recent_quiz_results: recentQuizzesRes.rows,
      progress_overview: {
        active_students: parseInt(prog.active_students || 0),
        completed_students: parseInt(prog.completed_students || 0),
        avg_progress: parseFloat(prog.avg_progress || 0),
      }
    });
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
              gl.name AS grade_level_name,
              CASE WHEN s.user_id IS NULL THEN 'parent-managed' ELSE 'individual' END AS account_type
       FROM students s
       JOIN grade_levels gl ON gl.id = s.grade_level_id
       WHERE s.grade_level_id = $1
         AND s.is_active = TRUE
         AND ($2::varchar IS NULL OR s.grade = $2)
         AND ($3::varchar IS NULL OR s.section = $3)
       ORDER BY s.full_name`,
      [ia.grade_level_id, ia.grade || null, ia.section || null]
    );

    res.json({
      course: {
        course_id: id,
        course_title: ia.course_title,
        grade_level_name: ia.grade_level_name,
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
       JOIN instructor_assignments ia ON ia.instructor_id = $1 AND ia.grade_level_id = s.grade_level_id
       WHERE s.id = $2 LIMIT 1`,
      [instructorId, studentId]
    );
    if (!accessCheck.rows.length) return res.status(403).json({ error: 'Student does not belong to your classes' });

    const [studentRes, submissionsRes, feedbackRes] = await Promise.all([
      query(
        `SELECT s.id, s.full_name, s.date_of_birth, s.gender,
                gl.name AS grade_level_name,
                CASE WHEN s.user_id IS NULL THEN 'parent-managed' ELSE 'individual' END AS account_type
         FROM students s
         JOIN grade_levels gl ON gl.id = s.grade_level_id
         WHERE s.id = $1`,
        [studentId]
      ),
      query(
        `SELECT sub.id, sub.status, sub.score, sub.submitted_at,
                a.title AS activity_title, a.max_score
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
              gl.name AS grade_level_name, ia.grade
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN grade_levels gl ON gl.id = ia.grade_level_id
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
         c.grade_level_id,
         gl.name AS grade_level_name,
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
       JOIN grade_levels gl ON gl.id = ia.grade_level_id
       LEFT JOIN academic_years ay ON ay.id = ia.academic_year_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN learning_materials m ON m.lesson_id = l.id
       LEFT JOIN videos v ON v.lesson_id = l.id
       LEFT JOIN students s ON s.grade_level_id = ia.grade_level_id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'
       GROUP BY c.id, c.title, c.description, c.thumbnail_url, c.status,
                c.created_at, c.grade_level_id, gl.name, ay.label, ia.grade, ia.section,
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
              c.*, gl.name AS grade_level_name, ay.label AS academic_year
       FROM instructor_assignments ia
       JOIN courses c ON c.id = ia.course_id
       JOIN grade_levels gl ON gl.id = ia.grade_level_id
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
         WHERE s.grade_level_id = $1
           AND ($2::varchar IS NULL OR s.grade = $2)
           AND ($3::varchar IS NULL OR s.section = $3)`,
        [course.grade_level_id, course.grade || null, course.section || null]
      ),
    ]);

    course.student_count = studentCountRes.rows[0].student_count;
    res.json({ course, lessons: lessonsRes.rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Lessons Management ─── */

async function listLessons(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { course_id, status, search } = req.query;

    const { rows } = await query(
      `SELECT
         l.id,
         l.course_id,
         l.title,
         l.description,
         l.order_index,
         l.status,
         l.difficulty_level,
         l.estimated_duration_minutes AS duration_minutes,
         l.created_at,
         l.updated_at,
         c.title AS course_title,
         c.thumbnail_url AS course_thumbnail,
         gl.name AS grade_level_name,
         COUNT(DISTINCT m.id)::int AS material_count,
         COUNT(DISTINCT a.id)::int AS activity_count,
         COUNT(DISTINCT q.id)::int AS quiz_count,
         COUNT(DISTINCT v.id)::int AS video_count
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN grade_levels gl ON gl.id = c.grade_level_id
       LEFT JOIN learning_materials m ON m.lesson_id = l.id
       LEFT JOIN activities a ON a.lesson_id = l.id
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN videos v ON v.lesson_id = l.id
       WHERE c.id IN (
         SELECT course_id FROM instructor_assignments
         WHERE instructor_id = $1 AND status = 'active'
       )
         AND ($2::int IS NULL OR l.course_id = $2)
         AND ($3::varchar IS NULL OR l.status = $3)
         AND ($4::varchar IS NULL OR l.title ILIKE '%' || $4 || '%' OR l.description ILIKE '%' || $4 || '%')
       GROUP BY l.id, l.course_id, l.title, l.description, l.order_index, l.status,
                l.difficulty_level, l.estimated_duration_minutes, l.created_at, l.updated_at,
                c.title, c.thumbnail_url, gl.name
       ORDER BY c.title ASC, l.order_index ASC, l.id ASC`,
      [instructorId, course_id ? parseInt(course_id) : null, status || null, search ? search.trim() : null]
    );

    res.json({ lessons: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Materials Management ─── */

async function listMaterials(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { course_id, lesson_id, material_type, search } = req.query;

    const { rows } = await query(
      `SELECT
         m.id,
         m.lesson_id,
         m.title,
         m.description,
         m.type AS material_type,
         m.file_url,
         m.thumbnail_url,
         m.status,
         m.display_order AS order_index,
         m.created_at,
         l.title AS lesson_title,
         c.id AS course_id,
         c.title AS course_title,
         gl.name AS grade_level_name
       FROM learning_materials m
       JOIN lessons l ON l.id = m.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN grade_levels gl ON gl.id = c.grade_level_id
       WHERE c.id IN (
         SELECT course_id FROM instructor_assignments
         WHERE instructor_id = $1 AND status = 'active'
       )
         AND ($2::int IS NULL OR c.id = $2)
         AND ($3::int IS NULL OR l.id = $3)
         AND ($4::varchar IS NULL OR m.type::varchar = $4)
         AND ($5::varchar IS NULL OR m.title ILIKE '%' || $5 || '%' OR m.description ILIKE '%' || $5 || '%')
       ORDER BY m.created_at DESC`,
      [
        instructorId,
        course_id ? parseInt(course_id) : null,
        lesson_id ? parseInt(lesson_id) : null,
        material_type || null,
        search ? search.trim() : null
      ]
    );

    res.json({ materials: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Activities Management ─── */

async function listActivities(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { course_id, lesson_id, activity_type, search } = req.query;

    const { rows } = await query(
      `SELECT
         a.id,
         a.lesson_id,
         a.title,
         a.instructions AS description,
         a.activity_type,
         a.max_score,
         a.display_order AS order_index,
         a.status,
         a.difficulty,
         a.created_at,
         a.activity_config,
         l.title AS lesson_title,
         c.id AS course_id,
         c.title AS course_title,
         gl.name AS grade_level_name,
         COUNT(DISTINCT sub.id)::int AS submission_count,
         COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'pending')::int AS pending_submissions,
         COALESCE(AVG(sub.percentage) FILTER (WHERE sub.status IN ('reviewed', 'graded')), 0)::numeric(5,1) AS avg_score
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN grade_levels gl ON gl.id = c.grade_level_id
       LEFT JOIN activity_submissions sub ON sub.activity_id = a.id
       WHERE c.id IN (
         SELECT course_id FROM instructor_assignments
         WHERE instructor_id = $1 AND status = 'active'
       )
         AND ($2::int IS NULL OR c.id = $2)
         AND ($3::int IS NULL OR l.id = $3)
         AND ($4::varchar IS NULL OR a.activity_type::varchar = $4)
         AND ($5::varchar IS NULL OR a.title ILIKE '%' || $5 || '%' OR a.instructions ILIKE '%' || $5 || '%')
       GROUP BY a.id, a.lesson_id, a.title, a.instructions, a.activity_type, a.max_score,
                a.display_order, a.status, a.difficulty, a.created_at, a.activity_config,
                l.title, c.id, c.title, gl.name
       ORDER BY a.created_at DESC`,
      [
        instructorId,
        course_id ? parseInt(course_id) : null,
        lesson_id ? parseInt(lesson_id) : null,
        activity_type || null,
        search ? search.trim() : null
      ]
    );

    res.json({ activities: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Quizzes Management ─── */

async function listQuizzes(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { course_id, lesson_id, search } = req.query;

    const { rows } = await query(
      `SELECT
         q.id,
         q.lesson_id,
         q.title,
         q.description,
         q.instructions,
         q.passing_score,
         q.max_score,
         q.status,
         q.time_limit_seconds,
         q.created_at,
         l.title AS lesson_title,
         c.id AS course_id,
         c.title AS course_title,
         gl.name AS grade_level_name,
         COUNT(DISTINCT qq.id)::int AS question_count,
         COUNT(DISTINCT qr.id)::int AS attempt_count,
         COUNT(DISTINCT qr.id) FILTER (WHERE qr.percentage >= COALESCE(q.passing_score, 70))::int AS passed_count,
         COALESCE(AVG(qr.percentage), 0)::numeric(5,1) AS avg_percentage
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN grade_levels gl ON gl.id = c.grade_level_id
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id
       WHERE c.id IN (
         SELECT course_id FROM instructor_assignments
         WHERE instructor_id = $1 AND status = 'active'
       )
         AND ($2::int IS NULL OR c.id = $2)
         AND ($3::int IS NULL OR l.id = $3)
         AND ($4::varchar IS NULL OR q.title ILIKE '%' || $4 || '%' OR q.description ILIKE '%' || $4 || '%')
       GROUP BY q.id, q.lesson_id, q.title, q.description, q.instructions, q.passing_score,
                q.max_score, q.status, q.time_limit_seconds, q.created_at,
                l.title, c.id, c.title, gl.name
       ORDER BY q.created_at DESC`,
      [
        instructorId,
        course_id ? parseInt(course_id) : null,
        lesson_id ? parseInt(lesson_id) : null,
        search ? search.trim() : null
      ]
    );

    res.json({ quizzes: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Student Learning Progress Matrix ─── */

async function getStudentProgress(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { course_id, grade, section, search } = req.query;

    const { rows } = await query(
      `SELECT
         s.id AS student_id,
         s.full_name AS student_name,
         s.gender,
         s.grade,
         s.section,
         gl.name AS grade_level_name,
         c.id AS course_id,
         c.title AS course_title,
         COALESCE(p.status, 'not_started') AS progress_status,
         COALESCE(p.completion_percentage, 0)::numeric(5,1) AS completion_percentage,
         p.last_accessed_at,
         COUNT(DISTINCT sub.id) FILTER (WHERE sub.status IN ('reviewed', 'graded'))::int AS activities_completed,
         COUNT(DISTINCT qr.id) FILTER (WHERE qr.percentage >= 70)::int AS quizzes_passed,
         COALESCE(AVG(qr.percentage), 0)::numeric(5,1) AS avg_quiz_score,
         COALESCE(AVG(sub.percentage) FILTER (WHERE sub.status IN ('reviewed', 'graded')), 0)::numeric(5,1) AS avg_activity_score
       FROM (
         SELECT DISTINCT ia.course_id, ia.grade_level_id
         FROM instructor_assignments ia
         WHERE ia.instructor_id = $1 AND ia.status = 'active'
       ) my_courses
       JOIN courses c ON c.id = my_courses.course_id
       JOIN grade_levels gl ON gl.id = my_courses.grade_level_id
       JOIN students s ON s.grade_level_id = my_courses.grade_level_id AND s.is_active = TRUE
       LEFT JOIN progress p ON p.student_id = s.id AND p.course_id = c.id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN activities a ON a.lesson_id = l.id
       LEFT JOIN activity_submissions sub ON sub.activity_id = a.id AND sub.student_id = s.id
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = s.id
       WHERE ($2::int IS NULL OR c.id = $2)
         AND ($3::varchar IS NULL OR s.grade = $3)
         AND ($4::varchar IS NULL OR s.section = $4)
         AND ($5::varchar IS NULL OR s.full_name ILIKE '%' || $5 || '%')
       GROUP BY s.id, s.full_name, s.gender, s.grade, s.section, gl.name, c.id, c.title,
                p.status, p.completion_percentage, p.last_accessed_at
       ORDER BY c.title ASC, s.full_name ASC`,
      [
        instructorId,
        course_id ? parseInt(course_id) : null,
        grade || null,
        section || null,
        search ? search.trim() : null
      ]
    );

    res.json({ progress: rows });
  } catch (err) {
    next(err);
  }
}

/* ─── Activity Submissions & Grading ─── */

async function listSubmissions(req, res, next) {
  try {
    const instructorId = await getInstructorId(req.user.id);
    const { status, course_id, activity_id, search } = req.query;

    const { rows } = await query(
      `SELECT
         sub.id,
         sub.activity_id,
         sub.student_id,
         sub.status,
         sub.score,
         sub.percentage,
         sub.submitted_at,
         sub.graded_at,
         sub.feedback,
         sub.submission_url,
         sub.submission_text,
         sub.submitted_by,
         s.full_name AS student_name,
         s.grade AS student_grade,
         s.section AS student_section,
         a.title AS activity_title,
         a.activity_type,
         a.max_score,
         l.id AS lesson_id,
         l.title AS lesson_title,
         c.id AS course_id,
         c.title AS course_title
       FROM activity_submissions sub
       JOIN activities a ON a.id = sub.activity_id
       JOIN students s ON s.id = sub.student_id
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE c.id IN (
         SELECT course_id FROM instructor_assignments
         WHERE instructor_id = $1 AND status = 'active'
       )
         AND ($2::varchar IS NULL OR sub.status::varchar = $2)
         AND ($3::int IS NULL OR c.id = $3)
         AND ($4::int IS NULL OR a.id = $4)
         AND ($5::varchar IS NULL OR s.full_name ILIKE '%' || $5 || '%' OR a.title ILIKE '%' || $5 || '%')
       ORDER BY
         CASE WHEN sub.status::varchar = 'pending' THEN 0 ELSE 1 END,
         sub.submitted_at DESC`,
      [
        instructorId,
        status && status !== 'all' ? status : null,
        course_id ? parseInt(course_id) : null,
        activity_id ? parseInt(activity_id) : null,
        search ? search.trim() : null
      ]
    );

    res.json({ submissions: rows });
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
  listLessons,
  listMaterials,
  listActivities,
  listQuizzes,
  getStudentProgress,
  listSubmissions,
};