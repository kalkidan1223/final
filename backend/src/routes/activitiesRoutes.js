const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const activitiesController = require('../controllers/activitiesController');
const submissionsController = require('../controllers/activitySubmissionsController');

const router = express.Router();

router.get('/:id', requireAuth, activitiesController.getActivity);
router.put('/:id', requireAuth, authorize('instructor', 'admin'), activitiesController.updateActivity);
router.patch('/:id/status', requireAuth, authorize('instructor', 'admin'), activitiesController.updateActivityStatus);
router.delete('/:id', requireAuth, authorize('instructor', 'admin'), activitiesController.deleteActivity);

router.post(
  '/:id/submissions',
  requireAuth,
  authorize('student', 'parent'),
  submissionsController.createSubmission
);
router.get('/:id/submissions', requireAuth, submissionsController.listSubmissionsForActivity);

module.exports = router;
