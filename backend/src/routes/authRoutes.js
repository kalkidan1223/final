const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const authRegistrationController = require('../controllers/authRegistrationController');
const adminApprovalController = require('../controllers/adminApprovalController');
const passport = require('../config/passport');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

// --- Authentication (existing) ---
router.post('/register/parent', authRegistrationController.registerParent);
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
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?error=google_auth_failed`
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // Check if account is pending approval
      if (!user.is_active) {
        return res.redirect(
          `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?status=pending&message=${encodeURIComponent('Your account is pending administrator approval.')}`
        );
      }

      // Generate JWT tokens
      const token = generateToken(user);
      const refreshToken = generateToken(user, true);

      // Redirect to frontend with tokens
      res.redirect(
        `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/auth/callback?token=${token}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(
        `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?error=${encodeURIComponent('Authentication failed')}`
      );
    }
  }
);

module.exports = router;
