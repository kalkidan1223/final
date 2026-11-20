const bcrypt = require('bcrypt');
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendRegistrationPendingEmail,
} = require('../services/emailService');
const crypto = require('crypto');
const { pool, query } = require('../config/db');
const { isValidEmail, isValidPassword, validateRegisterParent, validateLogin } = require('../utils/validators');
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
  const base = {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_active: row.is_active,
    google_id: row.google_id || null,
  };
  return base;
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
// PARENT REGISTRATION (with approval workflow)
// ============================================================================

async function registerParent(req, res, next) {
  try {
    const emailToCheck = req.body?.email ? String(req.body.email).toLowerCase() : '';
    const existingCheck = emailToCheck ? await query(
      `SELECT id, google_id, role FROM users WHERE email = $1`,
      [emailToCheck]
    ) : { rows: [] };
    const isGoogle = Boolean(
      req.user?.google_id ||
      req.body.is_google ||
      (existingCheck.rows.length > 0 && existingCheck.rows[0].google_id)
    );

    const validationErrors = validateRegisterParent(req.body, isGoogle);
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

    const occupationVal = occupation || 'Not Specified';
    const relationshipVal = relationship_to_child || 'Parent';
    const emName = emergency_contact_name || null;
    const emRel = emergency_contact_relationship || null;
    const emPhone = emergency_contact_phone || null;

    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user already exists (from Google OAuth)
      const existingUser = await client.query(
        `SELECT id, email, full_name, google_id, role FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      let userId;

      if (existingUser.rows.length > 0) {
        // User exists from Google OAuth - update role and create parent record
        userId = existingUser.rows[0].id;

        // Update user role to parent
        await client.query(
          `UPDATE users SET role = 'parent', full_name = $1, updated_at = now() WHERE id = $2`,
          [full_name, userId]
        );

        // Create parent record
        await client.query(
          `INSERT INTO parents (user_id, phone, alt_phone, date_of_birth, gender, nationality,
            occupation, relationship_to_child, national_id, profile_image_url,
            country, region, city, sub_city, woreda, house_number, postal_code,
            emergency_contact_name, emergency_contact_relationship, emergency_contact_phone)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            userId, phone, alt_phone || null, date_of_birth, gender, nationality,
            occupationVal, relationshipVal, national_id || null, profile_image_url || null,
            country, region, city, sub_city || null, woreda || null, house_number || null, postal_code || null,
            emName, emRel, emPhone
          ]
        );

        // Create registration request
        const regResult = await client.query(
          `INSERT INTO registration_requests (user_id, full_name, email, phone, status, email_verified)
           VALUES ($1, $2, $3, $4, 'pending', TRUE)
           RETURNING id, full_name, email, phone, status`,
          [userId, full_name, email.toLowerCase(), phone]
        );

        // Notify admins
        const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
        for (const admin of adminResult.rows) {
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, 'alert', 'New Parent Registration Pending Approval', $2)`,
            [admin.id, `Parent "${full_name}" (${email}) submitted registration via Google and requires administrator approval.`]
          );
        }

        await client.query('COMMIT');

        // Send registration pending notification
        sendRegistrationPendingEmail({ email: email.toLowerCase(), full_name, role: 'parent' }).catch(e => {
          console.error('Failed to send registration pending email:', e);
        });

        res.status(201).json({
          message: 'Registration submitted successfully. Your account is now pending administrator approval.',
          registration_id: regResult.rows[0].id,
          status: 'pending',
          email_verified: true,
        });
      } else {
        // New user - generate verification token and 6-digit code
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS);

        const result = await client.query(
          `INSERT INTO registration_requests (
            full_name, email, password_hash, phone, alt_phone, date_of_birth, gender,
            nationality, occupation, relationship_to_child, national_id, profile_image_url,
            country, region, city, sub_city, woreda, house_number, postal_code,
            emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
            terms_agreed, guardian_confirmed, status, email_verified
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'pending', FALSE)
          RETURNING id, full_name, email, phone, status`,
          [
            full_name, email.toLowerCase(), passwordHash, phone, alt_phone || null,
            date_of_birth, gender, nationality, occupationVal, relationshipVal,
            national_id || null, profile_image_url || null, country, region, city,
            sub_city || null, woreda || null, house_number || null, postal_code || null,
            emName, emRel, emPhone,
            terms_agreed, guardian_confirmed,
          ]
        );

        await client.query(
          `INSERT INTO email_verification_tokens (email, token, code, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [email.toLowerCase(), verificationToken, verificationCode, verificationExpiry]
        );

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [null, 'PARENT_REGISTRATION', 'registration_request', result.rows[0].id, null, {
            full_name: result.rows[0].full_name, email: result.rows[0].email,
          }, null, null, null]
        );

        // Notify all active administrators about the new registration
        const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
        for (const admin of adminResult.rows) {
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, 'alert', 'New Parent Registration Pending Approval', $2)`,
            [admin.id, `Parent "${result.rows[0].full_name}" (${result.rows[0].email}) submitted registration and requires administrator approval.`]
          );
        }

        await client.query('COMMIT');

        // Send verification email to parent
        sendVerificationEmail({
          email: email.toLowerCase(),
          full_name,
          token: verificationToken,
          code: verificationCode,
        }).catch(e => {
          console.error('Failed to send verification email:', e);
        });

        res.status(201).json({
          message: 'Registration received! Please check your email to verify your email address.',
          registration_id: result.rows[0].id,
          requires_email_verification: true,
          email: email.toLowerCase(),
          status: 'pending',
        });
      }
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
    await logAudit(null, user.id, 'LOGIN', 'user', user.id, null, { email: user.email });

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

    await logAudit(null, user.id, 'PASSWORD_RESET_REQUEST', 'user', user.id, null, { email: user.email });

    // Send the reset email
    const emailResult = await sendPasswordResetEmail(
      { email: email.toLowerCase(), full_name: user.full_name },
      token
    );
    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
    }
    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
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
    await logAudit(null, pwRecord.user_id, 'PASSWORD_RESET', 'user', pwRecord.user_id, null, { email: pwRecord.email });

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
    const token = crypto.randomBytes(32).toString('hex');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS);

    await query(
      'INSERT INTO email_verification_tokens (user_id, email, token, code, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.email, token, code, expiresAt]
    );

    sendVerificationEmail({
      email: user.email,
      full_name: user.full_name,
      token,
      code,
    }).catch(err => console.error('Failed to send verification email:', err));

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const token = req.body?.token || req.query?.token || (req.body?.token_or_code && req.body.token_or_code.length > 10 ? req.body.token_or_code : null);
    const code = req.body?.code || (req.body?.token_or_code && req.body.token_or_code.length <= 10 ? req.body.token_or_code : null);
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : null;

    if (!token && !code) {
      return res.status(400).json({ error: 'Verification token or code is required' });
    }

    let tokenResult;
    if (token) {
      tokenResult = await query(
        `SELECT * FROM email_verification_tokens 
         WHERE token = $1 AND verified = FALSE AND expires_at > now() 
         ORDER BY created_at DESC LIMIT 1`,
        [token.trim()]
      );
    } else if (code) {
      const params = [code.trim()];
      let whereClause = 'code = $1 AND verified = FALSE AND expires_at > now()';
      if (email) {
        params.push(email);
        whereClause += ' AND LOWER(email) = LOWER($2)';
      }
      tokenResult = await query(
        `SELECT * FROM email_verification_tokens 
         WHERE ${whereClause}
         ORDER BY created_at DESC LIMIT 1`,
        params
      );
    }

    if (!tokenResult || tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification link or code. Please check your code or request a new one.' });
    }

    const record = tokenResult.rows[0];
    const targetEmail = (record.email || '').toLowerCase().trim();

    // Mark token verified
    await query('UPDATE email_verification_tokens SET verified = TRUE WHERE id = $1', [record.id]);

    let applicantName = 'User';
    let applicantRole = 'user';

    // Update parent registration if exists
    const parentReg = await query(
      `UPDATE registration_requests 
       SET email_verified = TRUE 
       WHERE LOWER(email) = $1 
       RETURNING id, full_name, status`,
      [targetEmail]
    );
    if (parentReg.rows.length > 0) {
      applicantName = parentReg.rows[0].full_name;
      applicantRole = 'parent';
    }

    // Update instructor registration if exists
    const instReg = await query(
      `UPDATE instructor_registration_requests 
       SET email_verified = TRUE 
       WHERE LOWER(email) = $1 
       RETURNING id, full_name, status`,
      [targetEmail]
    );
    if (instReg.rows.length > 0) {
      applicantName = instReg.rows[0].full_name;
      applicantRole = 'instructor';
    }

    // Update users table if user exists
    if (record.user_id) {
      const userRes = await query(
        `UPDATE users 
         SET email_verified = TRUE 
         WHERE id = $1 
         RETURNING id, full_name, role`,
        [record.user_id]
      );
      if (userRes.rows.length > 0) {
        applicantName = userRes.rows[0].full_name || applicantName;
        applicantRole = userRes.rows[0].role || applicantRole;
      }
    } else if (targetEmail) {
      await query(
        `UPDATE users 
         SET email_verified = TRUE 
         WHERE LOWER(email) = $1`,
        [targetEmail]
      );
    }

    await logAudit(null, record.user_id || null, 'EMAIL_VERIFIED', 'email_verification', record.id, null, { email: targetEmail });

    // Send the notification confirming email is verified and registration is pending administrator approval
    sendRegistrationPendingEmail({
      email: targetEmail,
      full_name: applicantName,
      role: applicantRole,
    }).catch(err => {
      console.error('Failed to send registration pending email:', err);
    });

    res.json({
      message: 'Email verified successfully! Your registration is submitted and pending administrator approval. You will receive an email once approved.',
      email: targetEmail,
      email_verified: true,
      status: 'pending',
    });
  } catch (err) {
    next(err);
  }
}

async function resendVerificationToken(req, res, next) {
  try {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : null;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const parentReq = await query('SELECT full_name, email_verified FROM registration_requests WHERE LOWER(email) = $1', [email]);
    const instReq = await query('SELECT full_name, email_verified FROM instructor_registration_requests WHERE LOWER(email) = $1', [email]);
    const userReq = await query('SELECT full_name, email_verified FROM users WHERE LOWER(email) = $1', [email]);

    let fullName = 'User';
    let found = false;

    if (parentReq.rows.length > 0) {
      fullName = parentReq.rows[0].full_name;
      found = true;
      if (parentReq.rows[0].email_verified) {
        return res.json({ message: 'Your email has already been verified and your registration is awaiting administrator approval.' });
      }
    } else if (instReq.rows.length > 0) {
      fullName = instReq.rows[0].full_name;
      found = true;
      if (instReq.rows[0].email_verified) {
        return res.json({ message: 'Your email has already been verified and your application is awaiting administrator approval.' });
      }
    } else if (userReq.rows.length > 0) {
      fullName = userReq.rows[0].full_name;
      found = true;
      if (userReq.rows[0].email_verified) {
        return res.json({ message: 'Your email has already been verified.' });
      }
    }

    if (!found) {
      return res.json({ message: 'If a matching pending registration exists, a verification link has been sent to your inbox.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS);

    await query(
      `INSERT INTO email_verification_tokens (email, token, code, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, token, code, expiresAt]
    );

    sendVerificationEmail({
      email,
      full_name: fullName,
      token,
      code,
    }).catch(err => console.error('Failed to send verification email:', err));

    res.json({ message: 'A new verification email has been sent. Please check your inbox.' });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// INSTRUCTOR REGISTRATION (self-signup with approval workflow)
// ============================================================================

async function registerInstructor(req, res, next) {
  try {
    const {
      full_name, email, password, phone,
      specialization, education_level, years_of_experience, bio,
      terms_agreed,
    } = req.body;

    // Basic validation
    const errs = [];
    if (!full_name || full_name.trim().length < 2) errs.push('Full name is required');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Valid email is required');
    if (!password && !req.user?.google_id && !req.body.is_google) errs.push('Password is required (unless using Google OAuth)');
    if (password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password))
      errs.push('Password must be 8+ chars with uppercase, lowercase, number and special character');
    if (!phone || !/^\d{10,15}$/.test(phone)) errs.push('Phone must be 10-15 digits');
    if (!terms_agreed) errs.push('You must agree to the Terms and Conditions');
    if (errs.length) return res.status(400).json({ errors: errs });

    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user already exists (from Google OAuth)
      const existingUser = await client.query(
        `SELECT id, email, full_name, google_id, role FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      let result;

      if (existingUser.rows.length > 0) {
        // User exists from Google OAuth - update role and create instructor record
        const userId = existingUser.rows[0].id;

        // Update user role to instructor and store phone in users table
        await client.query(
          `UPDATE users SET role = 'instructor', full_name = $1, phone = $2, updated_at = now() WHERE id = $3`,
          [full_name.trim(), phone || null, userId]
        );

        // Create instructor record using actual DB columns: user_id, bio, qualification, specialty
        result = await client.query(
          `INSERT INTO instructors (user_id, bio, qualification, specialty)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [
            userId,
            bio || null,
            education_level || null,
            specialization || null,
          ]
        );

        // Create registration request
        const regResult = await client.query(
          `INSERT INTO instructor_registration_requests (full_name, email, password_hash, phone, specialization, education_level, years_of_experience, bio, terms_agreed, status, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', TRUE)
           ON CONFLICT (email) DO UPDATE SET
             full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
             specialization = EXCLUDED.specialization, education_level = EXCLUDED.education_level,
             years_of_experience = EXCLUDED.years_of_experience, bio = EXCLUDED.bio,
             status = 'pending', submitted_at = now()
           RETURNING id`,
          [
            full_name.trim(), email.toLowerCase(),
            'google-oauth',
            phone || '',
            specialization || null, education_level || null,
            years_of_experience ? parseInt(years_of_experience, 10) : null,
            bio || null, terms_agreed,
          ]
        );

        // Notify admins
        const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
        for (const admin of adminResult.rows) {
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, 'alert', 'New Instructor Application Pending Review', $2)`,
            [admin.id, `Instructor candidate "${full_name}" (${email}, Specialization: ${specialization || 'General'}) submitted an application via Google.`]
          );
        }

        await client.query('COMMIT');

        // Send registration pending email
        sendRegistrationPendingEmail({ email: email.toLowerCase(), full_name: full_name.trim(), role: 'instructor' }).catch(e => {
          console.error('Failed to send instructor registration pending email:', e);
        });

        res.status(201).json({
          message: 'Instructor application submitted. Your account is pending administrator review.',
          registration_id: regResult.rows[0].id,
          status: 'pending',
          email_verified: true,
        });
      } else {
        // New user - generate verification token and 6-digit code
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS);

        result = await client.query(
          `INSERT INTO instructor_registration_requests
             (full_name, email, password_hash, phone, specialization, education_level, years_of_experience, bio, terms_agreed, status, email_verified)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending', FALSE)
           RETURNING id, full_name, email, status`,
          [
            full_name.trim(), email.toLowerCase(), passwordHash, phone,
            specialization || null, education_level || null,
            years_of_experience ? parseInt(years_of_experience, 10) : null,
            bio || null, terms_agreed,
          ]
        );

        await client.query(
          `INSERT INTO email_verification_tokens (email, token, code, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [email.toLowerCase(), verificationToken, verificationCode, verificationExpiry]
        );

        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [null, 'INSTRUCTOR_REGISTRATION', 'instructor_registration_request', result.rows[0].id,
           null, { full_name: result.rows[0].full_name, email: result.rows[0].email }, null, null, null]
        );

        // Notify all active administrators about the new instructor application
        const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE");
        for (const admin of adminResult.rows) {
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, 'alert', 'New Instructor Application Pending Review', $2)`,
            [admin.id, `Instructor candidate "${result.rows[0].full_name}" (${result.rows[0].email}, Specialization: ${specialization || 'General'}) submitted an application.`]
          );
        }

        await client.query('COMMIT');

        // Send verification email to instructor
        sendVerificationEmail({
          email: email.toLowerCase(),
          full_name: full_name.trim(),
          token: verificationToken,
          code: verificationCode,
        }).catch(e => {
          console.error('Failed to send instructor verification email:', e);
        });

        res.status(201).json({
          message: 'Instructor application received! Please check your email to verify your email address.',
          registration_id: result.rows[0].id,
          requires_email_verification: true,
          email: email.toLowerCase(),
          status: 'pending',
        });
      }
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

module.exports = {
  registerParent,
  registerInstructor,
  login,
  forgotPassword,
  resetPassword,
  sendVerificationToken,
  verifyEmail,
  resendVerificationToken,
  logAudit,
};
