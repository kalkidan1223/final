const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const lessonContentController = require('../controllers/lessonContentController');

const router = express.Router();

router.patch('/:id/status', requireAuth, authorize('instructor', 'admin'), lessonContentController.updateMaterialStatus);
router.patch('/:id', requireAuth, authorize('instructor', 'admin'), lessonContentController.updateMaterial);
router.delete('/:id', requireAuth, authorize('instructor', 'admin'), lessonContentController.deleteMaterial);

module.exports = router;