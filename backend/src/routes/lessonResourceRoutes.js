const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const {
  getLessonResources,
  getAvailableResources,
  addLessonResource,
  updateLessonResource,
  reorderLessonResources,
  removeLessonResource
} = require('../controllers/lessonResourceController');

// All routes require authentication and instructor or admin role
router.use(authenticate);
router.use(allowRoles(['instructor', 'admin']));

// Get lesson resources
router.get('/lessons/:lessonId/resources', getLessonResources);

// Get available resources that can be added
router.get('/lessons/:lessonId/available-resources', getAvailableResources);

// Add resource to lesson
router.post('/lessons/:lessonId/resources', addLessonResource);

// Update resource settings
router.put('/lessons/:lessonId/resources/:resourceId', updateLessonResource);

// Reorder resources
router.post('/lessons/:lessonId/resources/reorder', reorderLessonResources);

// Remove resource from lesson
router.delete('/lessons/:lessonId/resources/:resourceId', removeLessonResource);

module.exports = router;
