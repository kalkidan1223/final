const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const lessonsController = require('../controllers/lessonsController');
const lessonContentController = require('../controllers/lessonContentController');
const lessonQuizzesRoutes = require('./lessonQuizzesRoutes');
const lessonActivitiesRoutes = require('./lessonActivitiesRoutes');

const router = express.Router();

router.get('/:id', requireAuth, lessonContentController.getLessonDetail);
router.put('/:id', requireAuth, authorize('instructor', 'admin'), lessonsController.updateLesson);
router.delete('/:id', requireAuth, authorize('instructor', 'admin'), lessonsController.deleteLesson);

router.post(
  '/:lessonId/materials',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonContentController.createMaterial
);
router.post(
  '/:lessonId/videos',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonContentController.createVideo
);

router.use('/:lessonId/quizzes', lessonQuizzesRoutes);
router.use('/:lessonId/activities', lessonActivitiesRoutes);

module.exports = router;
