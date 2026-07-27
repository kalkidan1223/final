const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ageGroupsController = require('../controllers/ageGroupsController');

const router = express.Router();

router.get('/', requireAuth, ageGroupsController.listAgeGroups);
router.post('/', requireAuth, authorize('admin'), ageGroupsController.createAgeGroup);

module.exports = router;
