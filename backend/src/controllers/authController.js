const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query, pool } = require('../config/db');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/jwt');
const {
  validateRegisterParent,
  validateLogin,
  validateStudentInvite,
  validateStudentRegister,
} = require('../utils/validators');

const SALT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/auth',
  };
}

async function issueTokenPair(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, hashToken(refreshToken), expiresAt]
  );

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  return accessToken;
}

async function publicUser(row) {
  const base = { id: row.id, email: row.email, full_name: row.full_name, role: row.role };
  if (row.role === 'student') {
    const r = await query('SELECT id FROM students WHERE user_id = $1', [row.id]);
    base.student_id = r.rows[0]?.id || null;
  } else if (row.role === 'parent') {
    const r = await query('SELECT id FROM parents WHERE user_id = $1', [row.id]);
    base.parent_id = r.rows[0]?.id || null;
  } else if (row.role === 'instructor') {
    const r = await query('SELECT id FROM instructors WHERE user_id = $1', [row.id]);
    base.instructor_id = r.rows[0]?.id || null;
  }
  return base;
}

// ----------------------------------------------------------------------------
// POST /api/auth/register/parent
// ----------------------------------------------------------------------------
async function registerParent(req, res, next) {
  try {
    const errors = validateRegisterParent(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { full_name, email, password, phone, address } = req.body;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES ($1, $2, 'parent', $3, $4)
         RETURNING id, email, full_name, role`,
        [email.toLowerCase(), passwordHash, full_name, phone || null]
      );
      const user = userResult.rows[0];

      await client.query(
        'INSERT INTO parents (user_id, address) VALUES ($1, $2)',
        [user.id, address || null]
      );

      await client.query('COMMIT');

      const accessToken = await issueTokenPair(res, user);
      res.status(201).json({ user: await publicUser(user), access_token: accessToken });
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

// ----------------------------------------------------------------------------
// POST /api/auth/login  (works for admin, instructor, parent, student)
// ----------------------------------------------------------------------------
async function login(req, res, next) {
  try {
    const errors = validateLogin(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { email, password } = req.body;
    const result = await query(
      'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

    const accessToken = await issueTokenPair(res, user);
    res.json({ user: await publicUser(user), access_token: accessToken });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/auth/refresh — rotates the refresh token and issues a new access token
// ----------------------------------------------------------------------------
async function refresh(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'No refresh token provided' });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenHash = hashToken(token);
    const stored = await query(
      `SELECT id FROM refresh_tokens
       WHERE user_id = $1 AND token_hash = $2 AND revoked = FALSE AND expires_at > now()`,
      [payload.sub, tokenHash]
    );
    if (stored.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token has been revoked or expired' });
    }

    // Rotate: revoke the used token, issue a brand new pair
    await query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [stored.rows[0].id]);

    const userResult = await query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'Account not available' });
    }

    const accessToken = await issueTokenPair(res, user);
    res.json({ user: await publicUser(user), access_token: accessToken });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/auth/logout
// ----------------------------------------------------------------------------
async function logout(req, res, next) {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];
    if (token) {
      await query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
        [hashToken(token)]
      );
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/auth/me
// ----------------------------------------------------------------------------
async function me(req, res, next) {
  try {
    const result = await query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: await publicUser(result.rows[0]) });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/auth/students/invite  (parent only)
// Creates a pending student profile + a one-time invite code for an 11-12
// year old to claim by creating their own account.
// ----------------------------------------------------------------------------
async function createStudentInvite(req, res, next) {
  try {
    const errors = validateStudentInvite(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { full_name, date_of_birth, age_group_id } = req.body;

    const ageGroupResult = await query(
      'SELECT requires_account FROM age_groups WHERE id = $1',
      [age_group_id]
    );
    if (ageGroupResult.rows.length === 0) {
      return res.status(400).json({ error: 'Unknown age_group_id' });
    }
    if (!ageGroupResult.rows[0].requires_account) {
      return res.status(400).json({
        error: 'This age group does not create accounts — use POST /api/students/children instead',
      });
    }

    const parentResult = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only parents can invite a student' });
    }
    const parentId = parentResult.rows[0].id;

    const inviteCode = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

    await query(
      `INSERT INTO student_invites (parent_id, age_group_id, full_name, date_of_birth, invite_code, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [parentId, age_group_id, full_name, date_of_birth, inviteCode, expiresAt]
    );

    res.status(201).json({ invite_code: inviteCode, expires_at: expiresAt });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/auth/students/register  (public — the child completes their own signup)
// ----------------------------------------------------------------------------
async function registerStudentWithInvite(req, res, next) {
  try {
    const errors = validateStudentRegister(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const { invite_code, email, password } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inviteResult = await client.query(
        `SELECT * FROM student_invites
         WHERE invite_code = $1 AND used = FALSE AND expires_at > now()
         FOR UPDATE`,
        [invite_code]
      );
      if (inviteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invite code is invalid, used, or expired' });
      }
      const invite = inviteResult.rows[0];

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'student', $3)
         RETURNING id, email, full_name, role`,
        [email.toLowerCase(), passwordHash, invite.full_name]
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO students (user_id, parent_id, age_group_id, full_name, date_of_birth)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, invite.parent_id, invite.age_group_id, invite.full_name, invite.date_of_birth]
      );

      await client.query('UPDATE student_invites SET used = TRUE WHERE id = $1', [invite.id]);

      await client.query('COMMIT');

      const accessToken = await issueTokenPair(res, user);
      res.status(201).json({ user: await publicUser(user), access_token: accessToken });
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

module.exports = {
  registerParent,
  login,
  refresh,
  logout,
  me,
  createStudentInvite,
  registerStudentWithInvite,
};
