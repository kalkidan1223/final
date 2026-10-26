const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { rateLimit } = require('../middleware/rateLimit');
const ctrl = require('../controllers/instructorController');
const questionCtrl = require('../controllers/studentQuestionsController');

const router = express.Router();

// All routes require authentication + instructor role
const guard = [requireAuth, authorize('instructor')];

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', guard, ctrl.getDashboard);

// ── Profile ────────────────────────────────────────────────────────────────
router.get('/profile', guard, ctrl.getProfile);
router.patch('/profile', guard, ctrl.updateProfile);

// ── Courses (Instructor LMS workspace) ────────────────────────────────────
router.get('/courses', guard, ctrl.listCourses);
router.get('/courses/:id', guard, ctrl.getCourse);

// ── Students (per course) ──────────────────────────────────────────────────
router.get('/courses/:id/students', guard, ctrl.getCourseStudents);
router.get('/students/:studentId', guard, ctrl.getStudentProfile);

// ── Lessons, Materials, Activities, Quizzes ──────────────────────────────
router.get('/lessons', guard, ctrl.listLessons);
router.get('/materials', guard, ctrl.listMaterials);
router.get('/activities', guard, ctrl.listActivities);
router.get('/quizzes', guard, ctrl.listQuizzes);

// ── Student Progress & Submissions ────────────────────────────────────────
router.get('/progress', guard, ctrl.getStudentProgress);
router.get('/submissions', guard, ctrl.listSubmissions);

// ── Notifications ──────────────────────────────────────────────────────────
router.get('/notifications', guard, ctrl.getNotifications);
router.patch('/notifications/read-all', guard, ctrl.markAllNotificationsRead);
router.patch('/notifications/:id/read', guard, ctrl.markNotificationRead);

// ── Student Questions (Ask My Teacher inbox) ──────────────────────────────
// NOTE: '/questions/summary' must be declared before '/questions/:questionId'
const answerLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: 'Too many answers submitted at once. Please wait a moment and try again.',
});
router.get('/questions/summary', guard, questionCtrl.getInstructorSummary);
router.get('/questions', guard, questionCtrl.listInstructorQuestions);
router.get('/questions/:questionId', guard, questionCtrl.getInstructorQuestion);
router.post('/questions/:questionId/answer', guard, answerLimiter, questionCtrl.answerQuestion);
router.patch('/questions/:questionId/answer', guard, answerLimiter, questionCtrl.updateAnswer);

// ── Messages ───────────────────────────────────────────────────────────────
router.get('/messages/conversations', guard, ctrl.getConversations);
router.get('/messages/conversations/:otherId', guard, ctrl.getConversation);
router.post('/messages', guard, ctrl.sendMessage);

module.exports = router;