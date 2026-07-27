const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const quizzesController = require('../controllers/quizzesController');

const router = express.Router({ mergeParams: true });

router.post('/', requireAuth, authorize('instructor', 'admin'), quizzesController.createQuiz);
router.get('/', requireAuth, quizzesController.listQuizzesForLesson);

module.exports = router;
