const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const referenceController = require('../controllers/referenceDataController');

const router = express.Router();

// ---------------------------------------------------------------------------
// Reference data: the constants of Ethiopian early-childhood teaching.
// Read by the child portal, the instructor activity builder, and admins.
// ---------------------------------------------------------------------------

// Instructor & Admin maintenance of the reference datasets (words, phrases, fidel, numerals).
// Registered BEFORE '/:kind' so that the literal 'admin' or 'words' segments are not
// swallowed by the single-segment read route.
router.get('/admin/:kind', requireAuth, authorize('admin', 'instructor'), referenceController.listForAdmin);
router.post('/admin/:kind', requireAuth, authorize('admin', 'instructor'), referenceController.createReference);
router.patch('/admin/:kind/:id', requireAuth, authorize('admin', 'instructor'), referenceController.updateReference);
router.delete('/admin/:kind/:id', requireAuth, authorize('admin', 'instructor'), referenceController.deactivateReference);

// Dedicated endpoints for vocabulary words (accessible to instructors and admins)
router.get('/words', requireAuth, (req, res, next) => {
  req.params.kind = 'words';
  return referenceController.listReference(req, res, next);
});
router.post('/words', requireAuth, authorize('admin', 'instructor'), (req, res, next) => {
  req.params.kind = 'words';
  return referenceController.createReference(req, res, next);
});
router.patch('/words/:id', requireAuth, authorize('admin', 'instructor'), (req, res, next) => {
  req.params.kind = 'words';
  return referenceController.updateReference(req, res, next);
});
router.delete('/words/:id', requireAuth, authorize('admin', 'instructor'), (req, res, next) => {
  req.params.kind = 'words';
  return referenceController.deactivateReference(req, res, next);
});

// The whole kit in one request - what the child portal and the instructor
// picker both need.
router.get('/early-learner-kit', requireAuth, referenceController.getEarlyLearnerKit);

// Read one dataset, e.g. /api/reference/fidel
router.get('/:kind', requireAuth, referenceController.listReference);

module.exports = router;
