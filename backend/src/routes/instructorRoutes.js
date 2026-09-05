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

// ── Assignments ────────────────────────────────────────────────────────────
router.get('/assignments', guard, ctrl.listAssignments);
router.get('/assignments/:id', guard, ctrl.getAssignment);

// ── Students (per assignment) ──────────────────────────────────────────────
router.get('/assignments/:id/students', guard, ctrl.getAssignmentStudents);
router.get('/students/:studentId', guard, ctrl.getStudentProfile);

// ── Lessons ────────────────────────────────────────────────────────────────
router.get('/assignments/:id/lessons', guard, ctrl.getAssignmentLessons);
router.post('/assignments/:id/lessons', guard, ctrl.createLesson);

// ── Materials ──────────────────────────────────────────────────────────────
router.get('/assignments/:id/materials', guard, ctrl.getAssignmentMaterials);

// ── Activities ─────────────────────────────────────────────────────────────
router.get('/assignments/:id/activities', guard, ctrl.getAssignmentActivities);

// ── Submissions ────────────────────────────────────────────────────────────
router.get('/assignments/:id/submissions', guard, ctrl.getAssignmentSubmissions);

// ── Attendance ─────────────────────────────────────────────────────────────
router.get('/assignments/:id/attendance', guard, ctrl.getAttendance);
router.post('/assignments/:id/attendance', guard, ctrl.saveAttendance);

// ── Progress ───────────────────────────────────────────────────────────────
router.get('/assignments/:id/progress', guard, ctrl.getAssignmentProgress);

// ── Announcements ──────────────────────────────────────────────────────────
router.get('/assignments/:id/announcements', guard, ctrl.getAnnouncements);
router.post('/assignments/:id/announcements', guard, ctrl.createAnnouncement);

// ── Notifications ──────────────────────────────────────────────────────────
router.get('/notifications', guard, ctrl.getNotifications);
router.patch('/notifications/:id/read', guard, ctrl.markNotificationRead);
router.patch('/notifications/read-all', guard, ctrl.markAllNotificationsRead);

// ── Messages ───────────────────────────────────────────────────────────────
router.get('/messages/conversations', guard, ctrl.getConversations);
router.get('/messages/conversations/:otherId', guard, ctrl.getConversation);
router.post('/messages', guard, ctrl.sendMessage);

module.exports = router;
