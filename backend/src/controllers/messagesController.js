const { query } = require('../config/db');

/**
 * GET /api/messages/conversations
 * Get all conversations for the authenticated user
 */
async function getConversations(req, res, next) {
  try {
    const currentUserId = req.user.id;

    const { rows } = await query(
      `SELECT DISTINCT ON (thread_key)
         thread_key,
         m.id,
         CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
         CASE WHEN m.sender_id = $1 THEN ru.full_name ELSE su.full_name END AS other_name,
         CASE WHEN m.sender_id = $1 THEN ru.role ELSE su.role END AS other_role,
         CASE WHEN m.sender_id = $1 THEN ru.email ELSE su.email END AS other_email,
         m.body AS last_message,
         m.sent_at AS created_at,
         m.is_read,
         m.sender_id = $1 AS is_mine,
         (SELECT COUNT(*)::int FROM messages unread_m
          WHERE unread_m.sender_id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
            AND unread_m.receiver_id = $1
            AND unread_m.is_read = FALSE
         ) AS unread_count,
         (SELECT COALESCE(
            json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.full_name))
            FILTER (WHERE s.id IS NOT NULL),
            '[]'::json
          )
          FROM parents p
          JOIN students s ON s.parent_id = p.id
          WHERE p.user_id = (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
            AND s.is_active = TRUE
         ) AS children
       FROM (
         SELECT *,
                LEAST(sender_id, receiver_id)::text || ':' || GREATEST(sender_id, receiver_id)::text AS thread_key
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
       ) m
       JOIN users su ON su.id = m.sender_id
       JOIN users ru ON ru.id = m.receiver_id
       ORDER BY thread_key, m.sent_at DESC`,
      [currentUserId]
    );

    // Sort by most recent message
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ conversations: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/messages/conversations/:otherUserId
 * Get messages between logged-in user and otherUserId
 */
async function getConversation(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;

    // Mark unread messages from otherUser as read
    await query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherUserId, currentUserId]
    );

    const { rows } = await query(
      `SELECT m.*,
              m.body AS message,
              (m.sender_id = $1) AS is_mine,
              su.full_name AS sender_name,
              ru.full_name AS receiver_name,
              s.full_name AS student_name
       FROM messages m
       JOIN users su ON su.id = m.sender_id
       JOIN users ru ON ru.id = m.receiver_id
       LEFT JOIN students s ON s.id = m.student_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.sent_at ASC`,
      [currentUserId, otherUserId]
    );

    res.json({ messages: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/messages
 * Send a message to another user (instructor, parent, admin)
 */
async function sendMessage(req, res, next) {
  try {
    let { receiver_id, recipient_id, body, message, student_id } = req.body;
    let targetUserId = receiver_id || recipient_id;
    const content = (body || message || '').trim();

    if (!targetUserId || !content) {
      return res.status(400).json({ error: 'Recipient and message body are required' });
    }

    // Check if targetUserId is an instructor profile ID rather than users.id
    const userCheck = await query('SELECT id, role, full_name FROM users WHERE id = $1', [targetUserId]);
    if (userCheck.rows.length === 0) {
      const instCheck = await query('SELECT user_id FROM instructors WHERE id = $1', [targetUserId]);
      if (instCheck.rows.length > 0) {
        targetUserId = instCheck.rows[0].user_id;
      } else {
        return res.status(404).json({ error: 'Recipient user not found' });
      }
    }

    const parsedStudentId = student_id ? parseInt(student_id, 10) : null;

    const { rows } = await query(
      `INSERT INTO messages (sender_id, receiver_id, student_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *, body AS message, sender_id = $1 AS is_mine`,
      [req.user.id, targetUserId, parsedStudentId || null, content]
    );

    // Get student name if student_id was provided
    let studentName = null;
    if (parsedStudentId) {
      const sRes = await query('SELECT full_name FROM students WHERE id = $1', [parsedStudentId]);
      studentName = sRes.rows[0]?.full_name || null;
    }

    // Push in-app notification to receiver
    const senderRole = req.user.role === 'parent' ? 'Parent' : req.user.role === 'instructor' ? 'Instructor' : 'Admin';
    const notifTitle = studentName
      ? `Message from ${senderRole} ${req.user.full_name || ''} regarding ${studentName}`
      : `New message from ${senderRole} ${req.user.full_name || ''}`.trim();
    const notifMessage = content.length > 120 ? content.slice(0, 117) + '...' : content;

    await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'message', $2, $3)`,
      [targetUserId, notifTitle, notifMessage]
    ).catch(err => console.warn('Failed to insert notification for message:', err.message));

    res.status(201).json({
      message: {
        ...rows[0],
        message: rows[0].body,
        is_mine: true,
        student_name: studentName,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/messages/admins
 * List administrators for support inquiries
 */
async function getAdmins(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, full_name, email, role
       FROM users
       WHERE role = 'admin' AND is_active = TRUE
       ORDER BY id ASC
       LIMIT 5`
    );
    res.json({ admins: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/messages/contacts
 * Get list of available contacts for messaging (Admins, Parents of students, or Teachers)
 * IMPORTANT: Groups uniquely per person so parents with multiple children or courses NEVER repeat!
 */
async function getContacts(req, res, next) {
  try {
    const role = req.user.role;
    const contacts = [];

    // Admins are always available to contact
    const adminRes = await query(
      `SELECT id, full_name, email, role
       FROM users
       WHERE role = 'admin' AND is_active = TRUE AND id != $1
       ORDER BY full_name ASC`,
      [req.user.id]
    );
    contacts.push(...adminRes.rows.map(u => ({
      ...u,
      contact_type: 'admin',
      description: 'System Administrator',
      children: [],
    })));

    if (role === 'instructor') {
      // Find parents of students in this instructor's courses - grouped uniquely per parent!
      const parentsRes = await query(
        `SELECT pu.id, pu.full_name, pu.email, 'parent' AS role,
                string_agg(DISTINCT s.full_name, ', ') AS children_names,
                COALESCE(
                  json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.full_name))
                  FILTER (WHERE s.id IS NOT NULL),
                  '[]'::json
                ) AS children
         FROM instructors i
         JOIN courses c ON c.instructor_id = i.id
         JOIN students s ON s.grade_level_id = c.grade_level_id
         JOIN parents p ON p.id = s.parent_id
         JOIN users pu ON pu.id = p.user_id
         WHERE i.user_id = $1 AND s.is_active = TRUE AND pu.id != $1
         GROUP BY pu.id, pu.full_name, pu.email
         ORDER BY pu.full_name ASC`,
        [req.user.id]
      );

      contacts.push(...parentsRes.rows.map(u => ({
        ...u,
        contact_type: 'parent',
        description: u.children_names ? `Parent of ${u.children_names}` : 'Parent',
        children: u.children || [],
      })));
    } else if (role === 'parent') {
      // Find instructors teaching the parent's children - grouped uniquely per instructor!
      const instRes = await query(
        `SELECT iu.id, iu.full_name, iu.email, 'instructor' AS role,
                string_agg(DISTINCT c.title, ', ') AS course_titles
         FROM parents p
         JOIN students s ON s.parent_id = p.id
         JOIN courses c ON c.grade_level_id = s.grade_level_id
         JOIN instructors i ON i.id = c.instructor_id
         JOIN users iu ON iu.id = i.user_id
         WHERE p.user_id = $1 AND s.is_active = TRUE AND iu.id != $1
         GROUP BY iu.id, iu.full_name, iu.email
         ORDER BY iu.full_name ASC`,
        [req.user.id]
      );

      contacts.push(...instRes.rows.map(u => ({
        ...u,
        contact_type: 'instructor',
        description: u.course_titles ? `Instructor (${u.course_titles})` : 'Course Instructor',
        children: [],
      })));
    }

    res.json({ contacts });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConversations,
  getConversation,
  sendMessage,
  getAdmins,
  getContacts,
};
