const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const quizzesController = require('../controllers/quizzesController');

const router = express.Router();

router.delete('/:id', requireAuth, authorize('instructor', 'admin'), quizzesController.deleteQuestion);

module.exports = router;
