const { pool, query } = require('../config/db');
const { signAccessToken, signRefreshToken, hashToken } = require('../utils/jwt');

const SALT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/auth',
  };
}

async function logAudit(client, userId, action, entityType, entityId, oldValues, newValues, metadata) {
  const q = client ? client.query : query;
  await q(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, action, entityType, entityId, oldValues || null, newValues || null, null, null, metadata || null]
  );
}

// ============================================================================
// REGISTRATION REQUESTS — ADMIN VIEW
// ============================================================================

async function listRegistrationRequests(req, res, next) {
  try {
    const { status } = req.query;
    const conditions = [];
    const params = [];

    if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT * FROM registration_requests ${where} ORDER BY submitted_at DESC LIMIT 100`,
      params
    );

    res.json({ registration_requests: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getRegistrationRequest(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM registration_requests WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }
    res.json({ registration_request: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// APPROVE PARENT REGISTRATION
// ============================================================================

async function approveParentRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const regResult = await query(
      'SELECT * FROM registration_requests WHERE id = $1',
      [id]
    );
    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }
    const reg = regResult.rows[0];

    if (reg.status !== 'pending') {
      return res.status(400).json({ error: `Registration is already ${reg.status}` });
    }

    const passwordHash = reg.password_hash;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone, profile_image_url)
         VALUES ($1, $2, 'parent', $3, $4, $5)
         RETURNING id, email, full_name, role, is_active`,
        [reg.email, passwordHash, reg.full_name, reg.phone, reg.profile_image_url || null]
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO parents (user_id, address, emergency_contact)
         VALUES ($1, $2, $3)`,
        [user.id, JSON.stringify({
          country: reg.country, region: reg.region, city: reg.city,
          sub_city: reg.sub_city, woreda: reg.woreda, house_number: reg.house_number,
          postal_code: reg.postal_code,
        }), reg.emergency_contact_phone || null]
      );

      await client.query(
        `UPDATE registration_requests SET status = 'approved', reviewed_by = $1, reviewed_at = now(), reviewed_notes = $2
         WHERE id = $3`,
        [req.user.id, notes || null, id]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.user.id, 'APPROVE_PARENT_REGISTRATION', 'registration_request', id,
         { status: 'pending' }, { status: 'approved', user_id: user.id }, null, null, null]
      );

      await client.query('COMMIT');
      res.json({ message: 'Parent registration approved', user: user, registration_id: id });
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

// ============================================================================
// REJECT PARENT REGISTRATION
// ============================================================================

async function rejectParentRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Rejection reason must be at least 10 characters' });
    }

    const regResult = await query(
      'SELECT * FROM registration_requests WHERE id = $1',
      [id]
    );
    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }
    const reg = regResult.rows[0];

    if (reg.status !== 'pending') {
      return res.status(400).json({ error: `Registration is already ${reg.status}` });
    }

    await query(
      `UPDATE registration_requests SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3`,
      [reason, req.user.id, id]
    );

    await logAudit(null, req.user.id, 'REJECT_PARENT_REGISTRATION', 'registration_request', id,
      { status: 'pending' }, { status: 'rejected', reason }
    );

    res.json({ message: 'Registration rejected', registration_id: id });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// SUSPEND PARENT REGISTRATION
// ============================================================================

async function suspendParentRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Suspension reason must be at least 10 characters' });
    }

    const regResult = await query(
      'SELECT * FROM registration_requests WHERE id = $1',
      [id]
    );
    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }
    const reg = regResult.rows[0];

    if (reg.status !== 'pending') {
      return res.status(400).json({ error: `Registration is already ${reg.status}` });
    }

    await query(
      `UPDATE registration_requests SET status = 'suspended', rejection_reason = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3`,
      [reason, req.user.id, id]
    );

    await logAudit(null, req.user.id, 'SUSPEND_PARENT_REGISTRATION', 'registration_request', id,
      { status: 'pending' }, { status: 'suspended', reason }
    );

    res.json({ message: 'Registration suspended', registration_id: id });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// CHILD REGISTRATION REQUESTS — ADMIN VIEW
// ============================================================================

async function listStudentRegistrationRequests(req, res, next) {
  try {
    const { status } = req.query;
    const conditions = [];
    const params = [];

    if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      params.push(status);
      conditions.push(`sr.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT sr.*, rr.full_name AS parent_name, rr.email AS parent_email
       FROM student_registration_requests sr
       JOIN registration_requests rr ON rr.id = sr.parent_id
       ${where}
       ORDER BY sr.submitted_at DESC
       LIMIT 100`,
      params
    );

    res.json({ student_registration_requests: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getStudentRegistrationRequest(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT sr.*, rr.full_name AS parent_name, rr.email AS parent_email
       FROM student_registration_requests sr
       JOIN registration_requests rr ON rr.id = sr.parent_id
       WHERE sr.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student registration request not found' });
    }
    res.json({ student_registration_request: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// APPROVE STUDENT REGISTRATION
// ============================================================================

async function approveStudentRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const regResult = await query(
      'SELECT * FROM student_registration_requests WHERE id = $1',
      [id]
    );
    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student registration request not found' });
    }
    const reg = regResult.rows[0];

    if (reg.status !== 'pending') {
      return res.status(400).json({ error: `Registration is already ${reg.status}` });
    }

    if (reg.age < 10 || reg.age > 12) {
      return res.status(400).json({ error: 'Student age must be between 10 and 12 for account creation' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, is_active)
         VALUES ($1, $2, 'student', $3, TRUE)
         RETURNING id, email, full_name, role, is_active`,
        [reg.student_email, reg.password_hash, reg.student_full_name]
      );
      const user = userResult.rows[0];

      const parentReg = await client.query(
        'SELECT id FROM registration_requests WHERE id = $1',
        [reg.parent_id]
      );
      const parentId = parentReg.rows[0]?.id;

      if (!parentId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Parent registration not found' });
      }

      const parentResult = await client.query(
        'SELECT id FROM parents WHERE user_id = $1',
        [parentId]
      );
      const parentRow = parentResult.rows[0];

      if (!parentRow) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Parent account not found' });
      }

      const ageGroupResult = await client.query(
        `SELECT id FROM age_groups WHERE min_age <= $1 AND max_age >= $1 AND requires_account = TRUE
         LIMIT 1`,
        [reg.age]
      );
      const ageGroupId = ageGroupResult.rows[0]?.id;

      if (!ageGroupId) {
        // Fallback to 11-12 age group
        const fallback = await client.query(
          "SELECT id FROM age_groups WHERE name = '11-12'"
        );
        if (fallback.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(500).json({ error: 'Required age group not found in database' });
        }
      }

      await client.query(
        `INSERT INTO students (user_id, parent_id, age_group_id, full_name, date_of_birth, gender)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [user.id, parentRow.id, ageGroupId || (await client.query("SELECT id FROM age_groups WHERE name = '11-12'")).rows[0].id,
         reg.student_full_name, reg.date_of_birth, reg.gender]
      );

      await client.query(
        `UPDATE student_registration_requests SET status = 'approved', reviewed_by = $1, reviewed_at = now(), reviewed_notes = $2
         WHERE id = $3`,
        [req.user.id, notes || null, id]
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.user.id, 'APPROVE_STUDENT_REGISTRATION', 'student_registration_request', id,
         { status: 'pending' }, { status: 'approved', user_id: user.id }, null, null, null]
      );

      await client.query('COMMIT');
      res.json({ message: 'Student registration approved', user: user, registration_id: id });
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

async function rejectStudentRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Rejection reason must be at least 10 characters' });
    }

    const regResult = await query(
      'SELECT * FROM student_registration_requests WHERE id = $1',
      [id]
    );
    if (regResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student registration request not found' });
    }
    const reg = regResult.rows[0];

    if (reg.status !== 'pending') {
      return res.status(400).json({ error: `Registration is already ${reg.status}` });
    }

    await query(
      `UPDATE student_registration_requests SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3`,
      [reason, req.user.id, id]
    );

    await logAudit(null, req.user.id, 'REJECT_STUDENT_REGISTRATION', 'student_registration_request', id,
      { status: 'pending' }, { status: 'rejected', reason }
    );

    res.json({ message: 'Student registration rejected', registration_id: id });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

async function listAuditLogs(req, res, next) {
  try {
    const { action, entity_type, user_id, limit } = req.query;
    const conditions = [];
    const params = [];
    let idx = 0;

    if (action) { params.push(action); conditions.push(`action = $${++idx}`); }
    if (entity_type) { params.push(entity_type); conditions.push(`entity_type = $${++idx}`); }
    if (user_id) { params.push(user_id); conditions.push(`user_id = $${++idx}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${++idx}`,
      [...params, parseInt(limit) || 100]
    );

    res.json({ audit_logs: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRegistrationRequests,
  getRegistrationRequest,
  approveParentRegistration,
  rejectParentRegistration,
  suspendParentRegistration,
  listStudentRegistrationRequests,
  getStudentRegistrationRequest,
  approveStudentRegistration,
  rejectStudentRegistration,
  listAuditLogs,
};