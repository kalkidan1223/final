const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const studentsController = require('../controllers/studentsController');

const router = express.Router();

// Parent routes - Child registration and management
router.post('/registration-requests', requireAuth, authorize('parent'), studentsController.createChildRegistrationRequest);
router.get('/registration-requests', requireAuth, authorize('parent'), studentsController.listMyChildRegistrationRequests);
router.get('/children', requireAuth, authorize('parent'), studentsController.listMyChildren);
router.get('/children/:id/learning-space', requireAuth, authorize('parent'), studentsController.getChildLearningSpace);

// Student learning portal routes - Child/Student access
router.get('/profile', requireAuth, authorize('student'), studentsController.getProfile);
router.get('/dashboard', requireAuth, authorize('student'), studentsController.getDashboard);
router.get('/courses', requireAuth, authorize('student'), studentsController.listCourses);
router.get('/courses/:id', requireAuth, authorize('student'), studentsController.getCourse);
router.get('/lessons/:id', requireAuth, authorize('student'), studentsController.getLesson);
router.get('/activities/:id', requireAuth, authorize('student'), studentsController.getActivity);
router.post('/activities/:id/submit', requireAuth, authorize('student'), studentsController.submitActivity);
router.get('/quizzes/:id', requireAuth, authorize('student'), studentsController.getQuiz);
router.post('/quizzes/:id/submit', requireAuth, authorize('student'), studentsController.submitQuiz);
router.get('/progress', requireAuth, authorize('student'), studentsController.getProgress);
router.get('/notifications', requireAuth, authorize('student'), studentsController.getNotifications);
router.patch('/notifications/:id/read', requireAuth, authorize('student'), studentsController.markNotificationRead);

module.exports = router;
