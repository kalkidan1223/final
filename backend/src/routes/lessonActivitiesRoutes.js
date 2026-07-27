const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const activitiesController = require('../controllers/activitiesController');

const router = express.Router({ mergeParams: true });

router.post('/', requireAuth, authorize('instructor', 'admin'), activitiesController.createActivity);
router.get('/', requireAuth, activitiesController.listActivitiesForLesson);

module.exports = router;
