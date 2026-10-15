const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const childResultsController = require('../controllers/childResultsController');

const router = express.Router();

// All child results endpoints require authentication and allow either student or parent role
const authChild = [requireAuth, authorize('student', 'parent')];

// Results Summary
router.get('/summary', ...authChild, childResultsController.getResultsSummary);

// Activity Results
router.get('/activities', ...authChild, childResultsController.getActivityResults);
router.get('/activities/:submissionId', ...authChild, childResultsController.getActivityResultDetail);

// Quiz Results
router.get('/quizzes', ...authChild, childResultsController.getQuizResults);
router.get('/quizzes/:resultId', ...authChild, childResultsController.getQuizResultDetail);

module.exports = router;
