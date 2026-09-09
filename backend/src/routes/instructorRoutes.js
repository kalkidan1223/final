const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/instructorController');

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

// ── Notifications ──────────────────────────────────────────────────────────
router.get('/notifications', guard, ctrl.getNotifications);
router.patch('/notifications/:id/read', guard, ctrl.markNotificationRead);
router.patch('/notifications/read-all', guard, ctrl.markAllNotificationsRead);

// ── Messages ───────────────────────────────────────────────────────────────
router.get('/messages/conversations', guard, ctrl.getConversations);
router.get('/messages/conversations/:otherId', guard, ctrl.getConversation);
router.post('/messages', guard, ctrl.sendMessage);

module.exports = router;