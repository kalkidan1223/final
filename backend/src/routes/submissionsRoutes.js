const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const submissionsController = require('../controllers/activitySubmissionsController');

const router = express.Router();

router.put(
  '/:id/review',
  requireAuth,
  authorize('instructor', 'admin'),
  submissionsController.reviewSubmission
);

module.exports = router;
