const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const authRegistrationController = require('../controllers/authRegistrationController');
const adminApprovalController = require('../controllers/adminApprovalController');

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

module.exports = router;
