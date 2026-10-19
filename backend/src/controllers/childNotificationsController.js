const { query } = require('../config/db');

/**
 * Helper: Resolve the active student record
 */
async function resolveChild(req) {
  if (req.user.role === 'student') {
    const res = await query(
      `SELECT s.*, ag.name as age_group_name, ag.min_age, ag.max_age,
              u.email, u.full_name as user_full_name,
              p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone,
              COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 10)::int as age
       FROM students s
       JOIN age_groups ag ON ag.id = s.age_group_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN users pu ON pu.id = p.user_id
       WHERE s.user_id = $1 AND s.is_active = TRUE`,
      [req.user.id]
    );
    return res.rows[0] || null;
  }

  if (req.user.role === 'parent') {
    const parentRes = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentRes.rows.length === 0) return null;
    const parentId = parentRes.rows[0].id;

    const requestedChildId = req.headers['x-child-id'] || req.query.child_id || req.body?.child_id;

    let child = null;
    if (requestedChildId) {
      const res = await query(
        `SELECT s.*, ag.name as age_group_name, ag.min_age, ag.max_age,
                s.full_name as user_full_name,
                p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone,
                COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 7)::int as age
         FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         LEFT JOIN parents p ON p.id = s.parent_id
         LEFT JOIN users pu ON pu.id = p.user_id
         WHERE s.id = $1 AND s.parent_id = $2 AND s.is_active = TRUE`,
        [requestedChildId, parentId]
      );
      if (res.rows.length > 0) {
        child = res.rows[0];
      }
    }

    if (!child) {
      const res = await query(
        `SELECT s.*, ag.name as age_group_name, ag.min_age, ag.max_age,
                s.full_name as user_full_name,
                p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone,
                COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 7)::int as age
         FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         LEFT JOIN parents p ON p.id = s.parent_id
         LEFT JOIN users pu ON pu.id = p.user_id
         WHERE s.parent_id = $1 AND s.is_active = TRUE
         ORDER BY s.created_at ASC
         LIMIT 1`,
        [parentId]
      );
      child = res.rows[0] || null;
    }

    return child;
  }

  return null;
}

// GET /api/child/notifications
async function getChildNotifications(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const result = await query(
      `SELECT 
        cn.id,
        cn.type,
        cn.title,
        cn.message,
        cn.related_course_id,
        cn.related_lesson_id,
        cn.related_activity_id,
        cn.related_quiz_id,
        cn.related_result_id,
        cn.related_question_id,
        cn.is_read,
        cn.created_at,
        c.title as course_title,
        l.title as lesson_title,
        a.title as activity_title,
        q.title as quiz_title
      FROM child_notifications cn
      LEFT JOIN courses c ON c.id = cn.related_course_id
      LEFT JOIN lessons l ON l.id = cn.related_lesson_id
      LEFT JOIN activities a ON a.id = cn.related_activity_id
      LEFT JOIN quizzes q ON q.id = cn.related_quiz_id
      WHERE cn.student_id = $1
      ORDER BY cn.created_at DESC`,
      [child.id]
    );

    const unreadCount = await query(
      'SELECT COUNT(*) as count FROM child_notifications WHERE student_id = $1 AND is_read = FALSE',
      [child.id]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count)
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/child/notifications/:id/read
async function markNotificationRead(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { id } = req.params;

    const result = await query(
      'UPDATE child_notifications SET is_read = TRUE WHERE id = $1 AND student_id = $2 RETURNING *',
      [id, child.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      notification: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/child/notifications/read-all
async function markAllNotificationsRead(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    await query(
      'UPDATE child_notifications SET is_read = TRUE WHERE student_id = $1',
      [child.id]
    );

    res.json({
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
}

// Helper function to create a notification (used by other controllers)
async function createNotification(studentId, type, title, message, relatedData = {}) {
  try {
    const result = await query(
      `INSERT INTO child_notifications (
        student_id, type, title, message,
        related_course_id, related_lesson_id, related_activity_id,
        related_quiz_id, related_result_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        studentId,
        type,
        title,
        message,
        relatedData.course_id || null,
        relatedData.lesson_id || null,
        relatedData.activity_id || null,
        relatedData.quiz_id || null,
        relatedData.result_id || null
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

module.exports = {
  getChildNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification
};
