const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { uploadFile } = require('../controllers/uploadsController');

const router = express.Router();

router.post('/file', requireAuth, authorize('instructor', 'admin'), uploadFile);

module.exports = router;