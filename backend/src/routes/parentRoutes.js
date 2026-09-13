/**
 * parentRoutes.js
 * Complete Routes for Parent Portal
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const parentController = require('../controllers/parentController');

// All parent routes require authentication and parent role
router.use(requireAuth);
router.use(requireRole(['parent']));

// ============================================================================
// PARENT PROFILE & SECURITY
// ============================================================================
router.get('/profile', parentController.getProfile);
router.patch('/profile', parentController.updateProfile);
router.post('/change-password', parentController.changePassword);

// ============================================================================
// DASHBOARD
// ============================================================================
router.get('/dashboard-stats', parentController.getDashboardStats);

// ============================================================================
// CHILDREN MANAGEMENT
// ============================================================================
router.get('/children', parentController.getChildren);
router.post('/children', parentController.registerChild);
router.get('/children/:id', parentController.getChildById);
router.patch('/children/:id', parentController.updateChild);

// ============================================================================
// CHILD LEARNING DATA (COURSES, LESSONS, MATERIALS, ACTIVITIES, QUIZZES)
// ============================================================================
router.get('/children/:id/courses', parentController.getChildCourses);
router.get('/children/:id/lessons', parentController.getChildLessons);
router.get('/children/:id/materials', parentController.getChildMaterials);
router.get('/children/:id/activities', parentController.getChildActivities);
router.post('/children/:childId/activities/:activityId/submit', parentController.submitChildActivity);
router.get('/children/:id/quizzes', parentController.getChildQuizzes);
router.get('/children/:id/progress', parentController.getChildProgress);
router.get('/children/:id/feedback', parentController.getChildFeedback);
router.get('/children/:id/achievements', parentController.getChildAchievements);

// ============================================================================
// NOTIFICATIONS & INSTRUCTORS
// ============================================================================
router.get('/notifications', parentController.getNotifications);
router.patch('/notifications/:id/read', parentController.markNotificationRead);
router.get('/instructors', parentController.getInstructorsForParent);

module.exports = router;
