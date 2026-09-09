const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const lessonContentController = require('../controllers/lessonContentController');

const router = express.Router();

router.patch('/:id/status', requireAuth, authorize('instructor', 'admin'), lessonContentController.updateVideoStatus);
router.patch('/:id', requireAuth, authorize('instructor', 'admin'), lessonContentController.updateVideo);
router.delete('/:id', requireAuth, authorize('instructor', 'admin'), lessonContentController.deleteVideo);

module.exports = router;