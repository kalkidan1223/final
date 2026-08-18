/**
 * adminExtController.js
 * Extended admin endpoints for:
 *  - Lessons (list, publish/unpublish)
 *  - Progress (admin view all)
 *  - AI Recommendations (admin view all, mark viewed)
 *  - Announcements (create, list, delete)
 *  - Notifications (send to user/group)
 *  - Reports (generate)
 */

const { query, pool } = require('../config/db');

// ============================================================================
// LESSONS — Admin
// ============================================================================

/**
 * GET /api/admin/lessons
 * List all lessons with course, instructor, age-group info.
 * Optional: ?course_id=  ?limit=
 */
async function listLessons(req, res, next) {
  try {
    const { course_id, limit = 200 } = req.query;
    const conditions = [];
    const params = [];

    if (course_id) {
      params.push(course_id);
      conditions.push(`l.course_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
         l.id, l.title, l.description, l.order_index, l.created_at, l.updated_at,
         l.course_id,
         c.title  AS course_title,
         c.status AS course_status,
         u.full_name AS instructor_name,
         ag.name  AS age_group_name,
         COALESCE(l.is_published, c.status = 'published') AS is_published
       FROM lessons l
       JOIN courses c  ON c.id = l.course_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u    ON u.id = i.user_id
       JOIN age_groups ag ON ag.id = c.age_group_id
       ${where}
       ORDER BY c.title, l.order_index
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit) || 200]
    );

    res.json({ lessons: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/lessons/:id/status
 * action: publish | unpublish
 */
async function updateLessonStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['publish', 'unpublish'].includes(action)) {
      return res.status(400).json({ error: 'action must be publish or unpublish' });
    }

    const lessonResult = await query('SELECT id FROM lessons WHERE id = $1', [id]);
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Lessons table may not have is_published — add it gracefully
    // We attempt an update; if the column doesn't exist we handle it
    try {
      const result = await query(
        `UPDATE lessons SET is_published = $1, updated_at = now() WHERE id = $2 RETURNING id, title, is_published`,
        [action === 'publish', id]
      );
      res.json({ lesson: result.rows[0] });
    } catch (colErr) {
      // Column might not exist yet — add it then retry
      if (colErr.code === '42703') {
        await query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE`);
        const result = await query(
          `UPDATE lessons SET is_published = $1, updated_at = now() WHERE id = $2 RETURNING id, title, is_published`,
          [action === 'publish', id]
        );
        res.json({ lesson: result.rows[0] });
      } else {
        throw colErr;
      }
    }
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// PROGRESS — Admin view all
// ============================================================================

/**
 * GET /api/admin/progress
 * Returns all progress rows with student, course, parent info.
 * Optional: ?status=  ?limit=
 */
async function listProgress(req, res, next) {
  try {
    const { status, limit = 200 } = req.query;
    const conditions = [];
    const params = [];

    if (status && ['not_started', 'in_progress', 'completed'].includes(status)) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
         p.id, p.student_id, p.course_id, p.lesson_id,
         p.status, p.completion_percentage,
         p.last_accessed_at, p.updated_at,
         s.full_name  AS student_name,
         c.title      AS course_title,
         l.title      AS lesson_title,
         ag.name      AS age_group_name,
         pu.full_name AS parent_name
       FROM progress p
       JOIN students s ON s.id = p.student_id
       JOIN courses  c ON c.id = p.course_id
       LEFT JOIN lessons l ON l.id = p.lesson_id
       JOIN age_groups ag ON ag.id = s.age_group_id
       JOIN parents pa ON pa.id = s.parent_id
       JOIN users pu   ON pu.id = pa.user_id
       ${where}
       ORDER BY p.updated_at DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit) || 200]
    );

    res.json({ progress: result.rows });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// AI RECOMMENDATIONS — Admin
// ============================================================================

/**
 * GET /api/admin/ai-recommendations
 * Optional: ?type=  ?is_viewed=  ?limit=
 */
async function listAIRecommendations(req, res, next) {
  try {
    const { type, is_viewed, limit = 200 } = req.query;
    const conditions = [];
    const params = [];

    if (type) {
      params.push(type);
      conditions.push(`r.recommendation_type = $${params.length}`);
    }
    if (is_viewed !== undefined && is_viewed !== '') {
      params.push(is_viewed === 'true');
      conditions.push(`r.is_viewed = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
         r.*,
         s.full_name AS student_name
       FROM ai_recommendations r
       JOIN students s ON s.id = r.student_id
       ${where}
       ORDER BY r.generated_at DESC
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit) || 200]
    );

    res.json({ recommendations: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/ai-recommendations/:id/view
 * Mark a recommendation as viewed.
 */
async function markRecommendationViewed(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE ai_recommendations SET is_viewed = TRUE WHERE id = $1 RETURNING id, is_viewed`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    res.json({ recommendation: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

/**
 * GET /api/admin/announcements
 */
async function listAnnouncements(req, res, next) {
  try {
    const result = await query(
      `SELECT a.*, u.full_name AS created_by_name
       FROM announcements a
       JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC
       LIMIT 100`,
      []
    );
    res.json({ announcements: result.rows });
  } catch (err) {
    // Table might not exist yet — return empty
    if (err.code === '42P01') {
      return res.json({ announcements: [] });
    }
    next(err);
  }
}

/**
 * POST /api/admin/announcements
 * body: { title, message, audience, priority, start_date, end_date }
 */
async function createAnnouncement(req, res, next) {
  try {
    const { title, message, audience = 'all', priority = 'normal', start_date, end_date } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters' });
    }
    if (!['all', 'parents', 'students', 'instructors'].includes(audience)) {
      return res.status(400).json({ error: 'Invalid audience' });
    }

    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id          BIGSERIAL PRIMARY KEY,
        created_by  BIGINT NOT NULL REFERENCES users(id),
        title       VARCHAR(200) NOT NULL,
        message     TEXT NOT NULL,
        audience    VARCHAR(50) NOT NULL DEFAULT 'all',
        priority    VARCHAR(20) NOT NULL DEFAULT 'normal',
        start_date  DATE,
        end_date    DATE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const result = await query(
      `INSERT INTO announcements (created_by, title, message, audience, priority, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, title.trim(), message.trim(), audience, priority,
       start_date || null, end_date || null]
    );

    const announcement = result.rows[0];

    // Also create notifications for the target audience
    try {
      let usersToNotify = [];
      if (audience === 'all') {
        const r = await query(`SELECT id FROM users WHERE is_active = TRUE`);
        usersToNotify = r.rows.map(u => u.id);
      } else {
        const roleMap = { parents: 'parent', students: 'student', instructors: 'instructor' };
        const role = roleMap[audience];
        if (role) {
          const r = await query(`SELECT id FROM users WHERE role = $1 AND is_active = TRUE`, [role]);
          usersToNotify = r.rows.map(u => u.id);
        }
      }

      if (usersToNotify.length > 0) {
        // Batch insert notifications (max 500 at a time)
        const batch = usersToNotify.slice(0, 500);
        const values = batch.map((uid, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(',');
        const params = batch.flatMap(uid => [uid, 'info', title.trim(), message.trim()]);
        await query(
          `INSERT INTO notifications (user_id, type, title, message) VALUES ${values}`,
          params
        );
      }
    } catch (notifErr) {
      // Notification delivery failure should not fail the announcement creation
      console.error('Notification batch error:', notifErr.message);
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'CREATE_ANNOUNCEMENT', 'announcement', $2, $3)`,
      [req.user.id, announcement.id, { title: title.trim(), audience, priority }]
    );

    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/announcements/:id
 */
async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT id, title FROM announcements WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    await query('DELETE FROM announcements WHERE id = $1', [id]);
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
       VALUES ($1, 'DELETE_ANNOUNCEMENT', 'announcement', $2, $3)`,
      [req.user.id, id, { title: existing.rows[0].title }]
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// NOTIFICATIONS — Send (admin-initiated)
// ============================================================================

/**
 * POST /api/admin/notifications/send
 * body: { title, message, type, target: 'all'|'parents'|'students'|'instructors'|'user', user_id }
 */
async function sendNotification(req, res, next) {
  try {
    const { title, message, type = 'info', target = 'all', user_id } = req.body;

    if (!title || title.trim().length < 3) return res.status(400).json({ error: 'Title is required (min 3 chars)' });
    if (!message || message.trim().length < 5) return res.status(400).json({ error: 'Message is required (min 5 chars)' });
    if (!['info', 'alert', 'reminder', 'feedback', 'message'].includes(type)) return res.status(400).json({ error: 'Invalid notification type' });
    if (!['all', 'parents', 'students', 'instructors', 'user'].includes(target)) return res.status(400).json({ error: 'Invalid target' });
    if (target === 'user' && !user_id) return res.status(400).json({ error: 'user_id is required when target is user' });

    let recipients = [];

    if (target === 'user') {
      const r = await query('SELECT id FROM users WHERE id = $1 AND is_active = TRUE', [user_id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'User not found or inactive' });
      recipients = [parseInt(user_id)];
    } else if (target === 'all') {
      const r = await query('SELECT id FROM users WHERE is_active = TRUE');
      recipients = r.rows.map(u => u.id);
    } else {
      const roleMap = { parents: 'parent', students: 'student', instructors: 'instructor' };
      const role = roleMap[target];
      const r = await query('SELECT id FROM users WHERE role = $1 AND is_active = TRUE', [role]);
      recipients = r.rows.map(u => u.id);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No active recipients found for this target' });
    }

    // Batch insert (cap at 500)
    const batch = recipients.slice(0, 500);
    const values = batch.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(',');
    const params = batch.flatMap(uid => [uid, type, title.trim(), message.trim()]);
    await query(`INSERT INTO notifications (user_id, type, title, message) VALUES ${values}`, params);

    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'SEND_NOTIFICATION', 'notification', NULL, $2)`,
      [req.user.id, { target, type, title: title.trim(), recipients_count: batch.length }]
    );

    res.status(201).json({ sent: batch.length, message: `Notification sent to ${batch.length} user(s)` });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// REPORTS — Generate
// ============================================================================

/**
 * POST /api/admin/reports/generate
 * body: { report_type }
 * Generates and stores a report in the reports table.
 */
async function generateReport(req, res, next) {
  try {
    const { report_type } = req.body;
    const validTypes = ['student_performance', 'course_summary', 'attendance_report', 'instructor_activity', 'ai_recommendation', 'registration_summary'];
    if (!report_type || !validTypes.includes(report_type)) {
      return res.status(400).json({ error: `report_type must be one of: ${validTypes.join(', ')}` });
    }

    let data = {};

    switch (report_type) {
      case 'student_performance': {
        const [quizStats, activityStats, progressStats] = await Promise.all([
          query(`SELECT s.id, s.full_name,
                        COUNT(qr.id)::int AS quizzes_taken,
                        ROUND(AVG(qr.score / NULLIF(qr.total_points, 0)) * 100, 1) AS avg_quiz_score
                 FROM students s
                 LEFT JOIN quiz_results qr ON qr.student_id = s.id
                 GROUP BY s.id, s.full_name
                 ORDER BY avg_quiz_score DESC NULLS LAST
                 LIMIT 50`),
          query(`SELECT s.id, s.full_name,
                        COUNT(sub.id) FILTER (WHERE sub.status = 'graded')::int AS graded_activities,
                        ROUND(AVG(sub.score / NULLIF(a.max_score, 0)) * 100, 1) AS avg_activity_score
                 FROM students s
                 LEFT JOIN activity_submissions sub ON sub.student_id = s.id
                 LEFT JOIN activities a ON a.id = sub.activity_id
                 GROUP BY s.id, s.full_name
                 ORDER BY avg_activity_score DESC NULLS LAST
                 LIMIT 50`),
          query(`SELECT status, COUNT(*)::int AS count FROM progress GROUP BY status`),
        ]);
        data = { quiz_performance: quizStats.rows, activity_performance: activityStats.rows, progress_summary: progressStats.rows };
        break;
      }
      case 'course_summary': {
        const r = await query(
          `SELECT c.id, c.title, c.status, ag.name AS age_group,
                  u.full_name AS instructor,
                  COUNT(DISTINCT l.id)::int AS lesson_count,
                  COUNT(DISTINCT p.student_id)::int AS enrolled_students
           FROM courses c
           JOIN instructors i ON i.id = c.instructor_id
           JOIN users u ON u.id = i.user_id
           JOIN age_groups ag ON ag.id = c.age_group_id
           LEFT JOIN lessons l ON l.course_id = c.id
           LEFT JOIN progress p ON p.course_id = c.id
           GROUP BY c.id, c.title, c.status, ag.name, u.full_name
           ORDER BY c.created_at DESC`
        );
        data = { courses: r.rows };
        break;
      }
      case 'attendance_report': {
        const r = await query(
          `SELECT DATE(session_date) AS date,
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE present = TRUE)::int AS present,
                  COUNT(*) FILTER (WHERE present = FALSE)::int AS absent
           FROM attendance
           WHERE session_date >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY DATE(session_date)
           ORDER BY date DESC`
        );
        data = { attendance: r.rows };
        break;
      }
      case 'instructor_activity': {
        const r = await query(
          `SELECT u.full_name, u.email, i.specialty, i.qualification,
                  COUNT(DISTINCT c.id)::int AS courses_created,
                  COUNT(DISTINCT l.id)::int AS lessons_created,
                  COUNT(DISTINCT a.id)::int AS activities_created
           FROM instructors i
           JOIN users u ON u.id = i.user_id
           LEFT JOIN courses c ON c.instructor_id = i.id
           LEFT JOIN lessons l ON l.course_id = c.id
           LEFT JOIN activities a ON a.instructor_id = i.id
           GROUP BY u.full_name, u.email, i.specialty, i.qualification
           ORDER BY courses_created DESC`
        );
        data = { instructors: r.rows };
        break;
      }
      case 'ai_recommendation': {
        const [summary, byType] = await Promise.all([
          query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_viewed)::int AS viewed FROM ai_recommendations`),
          query(`SELECT recommendation_type, COUNT(*)::int AS count FROM ai_recommendations GROUP BY recommendation_type`),
        ]);
        data = { summary: summary.rows[0], by_type: byType.rows };
        break;
      }
      case 'registration_summary': {
        const [parents, students] = await Promise.all([
          query(`SELECT status, COUNT(*)::int AS count FROM registration_requests GROUP BY status`),
          query(`SELECT status, COUNT(*)::int AS count FROM student_registration_requests GROUP BY status`),
        ]);
        data = { parent_registrations: parents.rows, student_registrations: students.rows };
        break;
      }
    }

    const result = await query(
      `INSERT INTO reports (generated_by, report_type, data)
       VALUES ($1, $2, $3)
       RETURNING id, report_type, created_at`,
      [req.user.id, report_type, JSON.stringify(data)]
    );

    res.status(201).json({ report: result.rows[0], data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLessons,
  updateLessonStatus,
  listProgress,
  listAIRecommendations,
  markRecommendationViewed,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  sendNotification,
  generateReport,
};
