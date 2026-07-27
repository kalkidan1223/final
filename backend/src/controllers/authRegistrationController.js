const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool, query } = require('../config/db');
const { isValidEmail, isValidPassword, validateRegisterParent } = require('../utils/validators');
const { signAccessToken, signRefreshToken, hashToken } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  const base = { id: row.id, email: row.email, full_name: row.full_name, role: row.role, is_active: row.is_active };
  return base;
}

async function logAudit(userId, action, entityType, entityId, oldValues, newValues, metadata) {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [userId, action, entityType, entityId, oldValues || null, newValues || null, null, null, metadata || null]
  );
}

// ============================================================================
// PARENT REGISTRATION (with approval workflow)
// ============================================================================

async function registerParent(req, res, next) {
  try {
    const validationErrors = validateRegisterParent(req.body);
    if (validationErrors.length) {
      return res.status(400).json({ errors: validationErrors });
    }

    const {
      full_name, email, password, phone, alt_phone,
      date_of_birth, gender, nationality, occupation,
      relationship_to_child, national_id, profile_image_url,
      country, region, city, sub_city, woreda, house_number, postal_code,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      terms_agreed, guardian_confirmed,
    } = req.body;

    if (!terms_agreed) {
      return res.status(400).json({ errors: ['You must agree to the Terms and Conditions'] });
    }
    if (!guardian_confirmed) {
      return res.status(400).json({ errors: ['You must confirm you are the legal guardian'] });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO registration_requests (
          full_name, email, password_hash, phone, alt_phone, date_of_birth, gender,
          nationality, occupation, relationship_to_child, national_id, profile_image_url,
          country, region, city, sub_city, woreda, house_number, postal_code,
          emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
          terms_agreed, guardian_confirmed, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'pending')
        RETURNING id, full_name, email, phone, status`,
        [
          full_name, email.toLowerCase(), passwordHash, phone, alt_phone || null,
          date_of_birth, gender, nationality, occupation, relationship_to_child,
          national_id || null, profile_image_url || null, country, region, city,
          sub_city || null, woreda || null, house_number || null, postal_code || null,
          emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
          terms_agreed, guardian_confirmed,
        ]
      );

      await logAudit(null, 'PARENT_REGISTRATION', 'registration_request', result.rows[0].id, null, {
        full_name: result.rows[0].full_name, email: result.rows[0].email,
      });

      await client.query('COMMIT');
      res.status(201).json({
        message: 'Registration submitted successfully. Your account is now pending administrator approval.',
        registration_id: result.rows[0].id,
        status: 'pending',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ errors: ['An account with this email already exists'] });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// LOGIN (with account status check)
// ============================================================================

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
      // Check if it's a pending registration request
      const regResult = await query(
        'SELECT id, full_name, email, status FROM registration_requests WHERE email = $1',
        [email.toLowerCase()]
      );
      if (regResult.rows.length > 0) {
        const reg = regResult.rows[0];
        if (reg.status === 'pending') {
          return res.status(403).json({ error: 'Account pending administrator approval', code: 'PENDING_APPROVAL' });
        }
        if (reg.status === 'rejected') {
          return res.status(403).json({ error: 'Your registration was rejected. Please contact the administrator.', code: 'REJECTED' });
        }
        if (reg.status === 'suspended') {
          return res.status(403).json({ error: 'Your account has been suspended.', code: 'SUSPENDED' });
        }
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated', code: 'DEACTIVATED' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    await logAudit(user.id, 'LOGIN', 'user', user.id, null, { email: user.email });

    const accessToken = await issueTokenPair(res, user);
    res.json({ user: await publicUser(user), access_token: accessToken });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const userResult = await query('SELECT id, full_name FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    }

    const user = userResult.rows[0];
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    await logAudit(user.id, 'PASSWORD_RESET_REQUEST', 'user', user.id, null, { email: user.email });

    // In production, send email here. For now, return the token for testing.
    res.json({
      message: 'Password reset link has been sent to your email.',
      reset_token: token, // Remove in production — only for testing
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const tokenResult = await query(
      `SELECT pt.*, u.id AS user_id, u.email, u.full_name, u.role, u.is_active
       FROM password_reset_tokens pt
       JOIN users u ON u.id = pt.user_id
       WHERE pt.token = $1 AND pt.used = FALSE AND pt.expires_at > now()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const pwRecord = tokenResult.rows[0];
    const passwordHash = await bcrypt.hash(new_password, SALT_ROUNDS);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, pwRecord.user_id]);
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [pwRecord.id]);
    await logAudit(pwRecord.user_id, 'PASSWORD_RESET', 'user', pwRecord.user_id, null, { email: pwRecord.email });

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

async function sendVerificationToken(req, res, next) {
  try {
    const user = req.user;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS);

    await query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // In production, send email with verification link
    res.json({ message: 'Verification email sent', verification_token: token }); // Remove token in production
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const result = await query(
      'SELECT * FROM email_verification_tokens WHERE token = $1 AND used = FALSE AND expires_at > now()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const record = result.rows[0];
    await query('UPDATE users SET is_active = TRUE WHERE id = $1', [record.user_id]);
    await query('UPDATE email_verification_tokens SET verified = TRUE WHERE id = $1', [record.id]);
    await logAudit(record.user_id, 'EMAIL_VERIFIED', 'user', record.user_id, null, {});

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerParent,
  login,
  forgotPassword,
  resetPassword,
  sendVerificationToken,
  verifyEmail,
  logAudit,
};