const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const quizzesController = require('../controllers/quizzesController');

const router = express.Router();

router.get('/:id', requireAuth, quizzesController.getQuiz);
router.put('/:id', requireAuth, authorize('instructor', 'admin'), quizzesController.updateQuiz);
router.delete('/:id', requireAuth, authorize('instructor', 'admin'), quizzesController.deleteQuiz);

router.post(
  '/:id/questions',
  requireAuth,
  authorize('instructor', 'admin'),
  quizzesController.addQuestion
);

router.post('/:id/submit', requireAuth, authorize('student'), quizzesController.submitQuiz);
router.get('/:id/results', requireAuth, quizzesController.getQuizResults);

module.exports = router;
