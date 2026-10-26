const express = require('express');
const { requireAuth } = require('../middleware/auth');
const adminExtController = require('../controllers/adminExtController');

const router = express.Router();

// GET /api/announcements - Available to all authenticated users (students, parents, instructors, admins)
router.get('/', requireAuth, adminExtController.listUserAnnouncements);

module.exports = router;
