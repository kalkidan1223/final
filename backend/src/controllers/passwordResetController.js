const { pool } = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * Request a password reset - generates token and sends email
 */
async function requestPasswordReset(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, full_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success even if user doesn't exist (security best practice)
    if (userResult.rows.length === 0) {
      return res.json({ 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      });
    }

    const user = userResult.rows[0];

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // Send reset email — signature: sendPasswordResetEmail(user_object, token)
    const emailResult = await sendPasswordResetEmail(
      { email: user.email, full_name: user.full_name },
      token
    );

    if (!emailResult.success) {
      console.error('❌ Failed to send reset email:', emailResult.error);
      // Still log the URL as a fallback in development
      console.log(`🔗 Reset URL (dev fallback): ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`);
    }

    res.json({ 
      message: 'If an account exists with that email, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
}

/**
 * Verify reset token validity
 */
async function verifyResetToken(req, res) {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, user_id, expires_at, used
       FROM password_reset_tokens
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = result.rows[0];

    // Check if token is expired
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Check if token was already used
    if (resetToken.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    res.json({ valid: true, message: 'Token is valid' });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    res.status(500).json({ error: 'Failed to verify reset token' });
  }
}

/**
 * Reset password using token
 */
async function resetPassword(req, res) {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    // Get token and validate
    const tokenResult = await pool.query(
      `SELECT id, user_id, expires_at, used
       FROM password_reset_tokens
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = tokenResult.rows[0];

    // Check if token is expired
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Check if token was already used
    if (resetToken.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [resetToken.id]
    );

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

module.exports = {
  requestPasswordReset,
  verifyResetToken,
  resetPassword
};
