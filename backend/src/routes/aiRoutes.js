const express = require('express');
const { requireAuth } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

const router = express.Router();

router.post('/:studentId/generate', requireAuth, aiController.generateRecommendations);
router.get('/:studentId', requireAuth, aiController.listRecommendations);

module.exports = router;
