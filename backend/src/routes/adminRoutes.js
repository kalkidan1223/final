const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const adminController = require('../controllers/adminController');
const adminDashboardController = require('../controllers/adminDashboardController');
const ageGroupsController = require('../controllers/ageGroupsController');

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
router.patch('/students/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateStudent);
router.patch('/students/:id/activate', requireAuth, authorize('admin'), adminController.activateStudent);

// --- Parent Management ---
router.get('/parents', requireAuth, authorize('admin'), adminController.listParents);
router.patch('/parents/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateParent);
router.patch('/parents/:id/activate', requireAuth, authorize('admin'), adminController.activateParent);

// --- Instructor Management ---
router.get('/instructors', requireAuth, authorize('admin'), adminController.listInstructors);
router.patch('/instructors/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateInstructor);
router.patch('/instructors/:id/activate', requireAuth, authorize('admin'), adminController.activateInstructor);
router.post('/instructors', requireAuth, authorize('admin'), adminController.createInstructor);

// --- Course Management ---
router.get('/courses', requireAuth, authorize('admin'), adminController.listCourses);
router.patch('/courses/:id/status', requireAuth, authorize('admin'), adminController.updateCourseStatus);
router.delete('/courses/:id', requireAuth, authorize('admin'), adminController.deleteCourse);

// --- Age Group Management ---
router.get('/age-groups', requireAuth, authorize('admin'), ageGroupsController.listAgeGroups);
router.post('/age-groups', requireAuth, authorize('admin'), ageGroupsController.createAgeGroup);
router.put('/age-groups/:id', requireAuth, authorize('admin'), adminController.updateAgeGroup);
router.delete('/age-groups/:id', requireAuth, authorize('admin'), adminController.deleteAgeGroup);

// --- Reports ---
router.get('/reports', requireAuth, authorize('admin'), adminController.listReports);

// --- Notifications ---
router.get('/notifications', requireAuth, authorize('admin'), adminController.listAllNotifications);

module.exports = router;