const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const coursesController = require('../controllers/coursesController');
const lessonsController = require('../controllers/lessonsController');

const router = express.Router();

router.post('/', requireAuth, authorize('instructor'), coursesController.createCourse);
router.get('/', requireAuth, coursesController.listCourses);
router.get('/:id', requireAuth, coursesController.getCourse);
router.put('/:id', requireAuth, authorize('instructor', 'admin'), coursesController.updateCourse);
router.patch(
  '/:id/status',
  requireAuth,
  authorize('instructor', 'admin'),
  coursesController.updateCourseStatus
);
router.delete('/:id', requireAuth, authorize('instructor', 'admin'), coursesController.deleteCourse);

// Nested lesson routes
router.post(
  '/:courseId/lessons',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonsController.createLesson
);
router.get('/:courseId/lessons', requireAuth, lessonsController.listLessons);
router.put(
  '/:courseId/lessons/reorder',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonsController.reorderLessons
);

module.exports = router;
