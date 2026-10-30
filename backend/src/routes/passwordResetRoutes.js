const express = require('express');
const router = express.Router();
const {
  requestPasswordReset,
  verifyResetToken,
  resetPassword
} = require('../controllers/passwordResetController');

// Request password reset (sends email with token)
router.post('/request', requestPasswordReset);

// Verify if a token is valid
router.get('/verify/:token', verifyResetToken);

// Reset password using token
router.post('/reset/:token', resetPassword);

module.exports = router;
