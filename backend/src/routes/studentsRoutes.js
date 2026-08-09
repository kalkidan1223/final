const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const studentsController = require('../controllers/studentsController');

const router = express.Router();

// A child is never created directly. The administrator must approve the request first.
router.post('/registration-requests', requireAuth, authorize('parent'), studentsController.createChildRegistrationRequest);
router.get('/registration-requests', requireAuth, authorize('parent'), studentsController.listMyChildRegistrationRequests);
router.get('/children', requireAuth, authorize('parent'), studentsController.listMyChildren);

module.exports = router;
