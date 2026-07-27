const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const progressController = require('../controllers/progressController');

const router = express.Router();

router.get('/me', requireAuth, authorize('student'), progressController.getMyProgress);
router.get('/student/:studentId', requireAuth, progressController.getStudentProgress);

module.exports = router;
