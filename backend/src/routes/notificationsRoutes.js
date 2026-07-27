const express = require('express');
const { requireAuth } = require('../middleware/auth');
const notificationsController = require('../controllers/notificationsController');

const router = express.Router();

router.get('/', requireAuth, notificationsController.listMyNotifications);
router.patch('/:id/read', requireAuth, notificationsController.markRead);

module.exports = router;
