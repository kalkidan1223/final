const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const childController = require('../controllers/childController');

const router = express.Router();

// All child portal endpoints require authentication and allow either student or parent role
const authChild = [requireAuth, authorize('student', 'parent')];

// Profile & Dashboard
router.get('/profile', ...authChild, childController.getProfile);
router.get('/dashboard', ...authChild, childController.getDashboard);

// Courses & Lessons
router.get('/courses', ...authChild, childController.listCourses);
router.get('/courses/:courseId', ...authChild, childController.getCourse);
router.get('/courses/:courseId/lessons', ...authChild, childController.getCourse);
router.get('/lessons/:lessonId', ...authChild, childController.getLesson);
router.get('/lessons/:lessonId/materials', ...authChild, childController.getLesson);
router.get('/lessons/:lessonId/activities', ...authChild, childController.getLesson);
router.get('/lessons/:lessonId/quizzes', ...authChild, childController.getLesson);

// Media Tracking
router.post('/videos/:id/watch', ...authChild, childController.watchVideo);
router.post('/materials/:id/listen', ...authChild, childController.listenMaterial);

// Activities
router.get('/activities', ...authChild, childController.listAllActivities);
router.get('/activities/:activityId', ...authChild, childController.getActivity);
router.post('/activities/:activityId/submit', ...authChild, childController.submitActivity);

// Quizzes
router.get('/quizzes', ...authChild, childController.listAllQuizzes);
router.get('/quizzes/:quizId', ...authChild, childController.getQuiz);
router.post('/quizzes/:quizId/submit', ...authChild, childController.submitQuiz);

// Progress, Achievements & Notifications
router.get('/progress', ...authChild, childController.getProgress);
router.get('/achievements', ...authChild, childController.getAchievements);
router.get('/notifications', ...authChild, childController.getNotifications);
router.patch('/notifications/:id/read', ...authChild, childController.markNotificationRead);

module.exports = router;
