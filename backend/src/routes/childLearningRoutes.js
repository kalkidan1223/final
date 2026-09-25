const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const {
  getCourseOverview,
  getLessonJourney,
  getResourceDetail,
  updateVideoProgress,
  updateMaterialProgress,
  completeActivity,
  completeQuiz,
  getAchievements,
  startLearningSession,
  endLearningSession
} = require('../controllers/childLearningController');

// All routes require authentication and student or parent role
router.use(authenticate);
router.use(allowRoles(['student', 'parent']));

// Course overview with continue learning
router.get('/courses/:courseId', getCourseOverview);

// Lesson learning journey
router.get('/lessons/:lessonId', getLessonJourney);

// Resource details
router.get('/resources/:resourceType/:resourceId', getResourceDetail);

// Progress tracking
router.post('/progress/video/:videoId', updateVideoProgress);
router.post('/progress/material/:materialId', updateMaterialProgress);
router.post('/progress/activity/:activityId/complete', completeActivity);
router.post('/progress/quiz/:quizId/complete', completeQuiz);

// Achievements
router.get('/achievements', getAchievements);

// Learning sessions
router.post('/sessions/start', startLearningSession);
router.post('/sessions/:sessionId/end', endLearningSession);

module.exports = router;
