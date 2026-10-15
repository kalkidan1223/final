const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const authRegistrationController = require('../controllers/authRegistrationController');
const adminApprovalController = require('../controllers/adminApprovalController');
const passport = require('../config/passport');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

const router = express.Router();

// --- Authentication (existing) ---
router.post('/register/parent', authRegistrationController.registerParent);
router.post('/register/instructor', authRegistrationController.registerInstructor);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

// --- Password Reset ---
router.post('/forgot-password', authRegistrationController.forgotPassword);
router.post('/reset-password', authRegistrationController.resetPassword);

// --- Email Verification ---
router.post('/verify-email', requireAuth, authRegistrationController.sendVerificationToken);
router.post('/verify-email/confirm', authRegistrationController.verifyEmail);

// --- Google OAuth ---
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

function getClientOrigin() {
  const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim());
  return origins[0] || 'http://localhost:5173';
}

router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

router.get('/google/callback', (req, res, next) => {
  const clientOrigin = getClientOrigin();

  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) {
      console.error('Google OAuth callback error:', err);
      return res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent(err.message || 'Google authentication failed')}`
      );
    }

    if (!user) {
      return res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent('Google authentication was cancelled or failed')}`
      );
    }

    try {
      // Issue access and refresh tokens
      const token = signAccessToken(user);
      const refreshToken = signRefreshToken(user);
      const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);
      const { hashToken } = require('../utils/jwt');
      const { query } = require('../config/db');

      await query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, hashToken(refreshToken), expiresAt]
      );
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

      // If user role is 'pending', redirect to role selection page
      if (user.role === 'pending') {
        return res.redirect(
          `${clientOrigin}/auth/callback?token=${token}&refreshToken=${refreshToken}&redirect=/auth/role-selection`
        );
      }

      // Check if account is pending approval
      if (!user.is_active) {
        return res.redirect(
          `${clientOrigin}/login?status=pending&message=${encodeURIComponent('Your account is pending administrator approval.')}`
        );
      }

      // Redirect to frontend with tokens
      return res.redirect(
        `${clientOrigin}/auth/callback?token=${token}&refreshToken=${refreshToken}`
      );
    } catch (callbackErr) {
      console.error('Google callback error:', callbackErr);
      return res.redirect(
        `${clientOrigin}/login?error=${encodeURIComponent('Authentication failed')}`
      );
    }
  })(req, res, next);
});

module.exports = router;
