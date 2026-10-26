const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const homePinController = require('../controllers/homePinController');

const router = express.Router();

// The child home is a view over published course content organized by grade.
const guard = [requireAuth, authorize('instructor', 'admin')];

// What the instructor has published and could pin.
router.get('/candidates', ...guard, homePinController.listCandidates);

// The current home layout for a grade level.
router.get('/pins', ...guard, homePinController.listPins);

router.post('/pins', ...guard, homePinController.createPin);
router.patch('/pins/:id', ...guard, homePinController.updatePin);
router.delete('/pins/:id', ...guard, homePinController.removePin);

module.exports = router;
