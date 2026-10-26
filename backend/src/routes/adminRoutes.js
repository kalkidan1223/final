const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const adminController = require('../controllers/adminController');
const adminDashboardController = require('../controllers/adminDashboardController');
const adminExtController = require('../controllers/adminExtController');

const router = express.Router();

// --- Dashboard ---
router.get('/dashboard', requireAuth, authorize('admin'), adminDashboardController.getDashboardStats);
router.get('/analytics', requireAuth, authorize('admin'), adminController.getAnalytics);

// --- User Management ---
router.get('/users', requireAuth, authorize('admin'), adminController.listUsers);
router.get('/users/:id', requireAuth, authorize('admin'), adminController.getUser);
router.patch('/users/:id', requireAuth, authorize('admin'), adminController.updateUser);
router.patch('/users/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateUser);
router.patch('/users/:id/activate', requireAuth, authorize('admin'), adminController.activateUser);

// --- Student Management ---
router.get('/students', requireAuth, authorize('admin'), adminController.listStudents);
router.patch('/students/:id/grade-level', requireAuth, authorize('admin'), adminController.updateStudentGradeLevel);
router.patch('/students/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateStudent);
router.patch('/students/:id/activate', requireAuth, authorize('admin'), adminController.activateStudent);

// --- Parent Management ---
router.get('/parents', requireAuth, authorize('admin'), adminController.listParents);
router.post('/parents', requireAuth, authorize('admin'), adminController.createParent);
router.patch('/parents/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateParent);
router.patch('/parents/:id/activate', requireAuth, authorize('admin'), adminController.activateParent);

// --- Instructor Management ---
router.get('/instructors', requireAuth, authorize('admin'), adminController.listInstructors);
router.patch('/instructors/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateInstructor);
router.patch('/instructors/:id/activate', requireAuth, authorize('admin'), adminController.activateInstructor);
router.patch('/instructors/:id/assignments', requireAuth, authorize('admin'), adminController.updateInstructorAssignments);
router.post('/instructors', requireAuth, authorize('admin'), adminController.createInstructor);

// --- Course Management ---
router.get('/courses', requireAuth, authorize('admin'), adminController.listCourses);
router.patch('/courses/:id/status', requireAuth, authorize('admin'), adminController.updateCourseStatus);
router.patch('/courses/:id', requireAuth, authorize('admin'), adminController.updateCourse);
router.delete('/courses/:id', requireAuth, authorize('admin'), adminController.deleteCourse);

// --- Reports ---
router.get('/reports', requireAuth, authorize('admin'), adminController.listReports);

// --- Notifications ---
router.get('/notifications', requireAuth, authorize('admin'), adminController.listAllNotifications);
router.get('/notifications/unread', requireAuth, authorize('admin'), adminController.getUnreadNotifications);
router.patch('/notifications/read-all', requireAuth, authorize('admin'), adminController.markAllNotificationsRead);
router.patch('/notifications/:id/read', requireAuth, authorize('admin'), adminController.markNotificationRead);
router.post('/notifications/send', requireAuth, authorize('admin'), adminExtController.sendNotification);

// --- Lessons (admin supervise) ---
router.get('/lessons', requireAuth, authorize('admin'), adminExtController.listLessons);
router.patch('/lessons/:id/status', requireAuth, authorize('admin'), adminExtController.updateLessonStatus);

// --- Progress (admin view all) ---
router.get('/progress', requireAuth, authorize('admin'), adminExtController.listProgress);

// --- AI Recommendations (admin view all) ---
router.get('/ai-recommendations', requireAuth, authorize('admin'), adminExtController.listAIRecommendations);
router.patch('/ai-recommendations/:id/view', requireAuth, authorize('admin'), adminExtController.markRecommendationViewed);

// --- Announcements ---
router.get('/announcements', requireAuth, authorize('admin'), adminExtController.listAnnouncements);
router.post('/announcements', requireAuth, authorize('admin'), adminExtController.createAnnouncement);
router.delete('/announcements/:id', requireAuth, authorize('admin'), adminExtController.deleteAnnouncement);

module.exports = router;
