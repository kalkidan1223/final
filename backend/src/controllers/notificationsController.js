const { query } = require('../config/db');

// Internal helper — other controllers call this directly (not exposed as a route).
async function createNotification(userId, type, title, message) {
  await query(
    `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
    [userId, type, title, message]
  );
}

// ----------------------------------------------------------------------------
// GET /api/notifications  (authenticated — own notifications only)
// ----------------------------------------------------------------------------
async function listMyNotifications(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/notifications/:id/read
// ----------------------------------------------------------------------------
async function markRead(req, res, next) {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { createNotification, listMyNotifications, markRead };
