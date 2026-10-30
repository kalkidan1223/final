const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getResultsOverview,
  getActivitySubmissions,
  getQuizResults,
  getStudentResults
} = require('../controllers/instructorResultsController');

// All routes require instructor or admin authentication
const guard = [requireAuth, authorize('instructor', 'admin')];

// GET /api/instructor/results/overview - Get aggregated statistics
router.get('/overview', guard, getResultsOverview);

// GET /api/instructor/results/activity-submissions - Get all activity submissions
router.get('/activity-submissions', guard, getActivitySubmissions);

// GET /api/instructor/results/quiz-results - Get all quiz results
router.get('/quiz-results', guard, getQuizResults);

// GET /api/instructor/results/student/:studentId - Get specific student's results
router.get('/student/:studentId', guard, getStudentResults);

module.exports = router;
