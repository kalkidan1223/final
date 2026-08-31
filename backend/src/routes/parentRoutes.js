/**
 * parentRoutes.js
 * Routes for Parent Portal
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
// PARENT PROFILE
// ============================================================================

router.get('/profile', parentController.getProfile);
router.patch('/profile', parentController.updateProfile);

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

// ============================================================================
// CHILD LEARNING DATA
// ============================================================================

router.get('/children/:id/courses', parentController.getChildCourses);
router.get('/children/:id/lessons', parentController.getChildLessons);
router.get('/children/:id/materials', parentController.getChildMaterials);
router.get('/children/:id/activities', parentController.getChildActivities);
router.post('/children/:childId/activities/:activityId/submit', parentController.submitChildActivity);
router.get('/children/:id/quizzes', parentController.getChildQuizzes);
router.get('/children/:id/progress', parentController.getChildProgress);
router.get('/children/:id/attendance', parentController.getChildAttendance);
router.get('/children/:id/feedback', parentController.getChildFeedback);
router.get('/children/:id/recommendations', parentController.getChildRecommendations);
router.get('/children/:id/achievements', parentController.getChildAchievements);
router.get('/children/:id/certificates', parentController.getChildCertificates);

module.exports = router;
