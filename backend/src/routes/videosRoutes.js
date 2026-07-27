const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const lessonContentController = require('../controllers/lessonContentController');

const router = express.Router();

router.delete('/:id', requireAuth, authorize('instructor', 'admin'), lessonContentController.deleteVideo);

module.exports = router;
