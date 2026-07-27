const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const studentsController = require('../controllers/studentsController');

const router = express.Router();

router.post('/children', requireAuth, authorize('parent'), studentsController.addChild);
router.get('/children', requireAuth, authorize('parent'), studentsController.listMyChildren);

module.exports = router;
