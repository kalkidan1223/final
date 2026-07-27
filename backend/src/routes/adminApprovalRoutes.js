const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const adminApprovalController = require('../controllers/adminApprovalController');

const router = express.Router();

// --- Parent Registration Requests ---
router.get('/registration-requests', requireAuth, authorize('admin'), adminApprovalController.listRegistrationRequests);
router.get('/registration-requests/:id', requireAuth, authorize('admin'), adminApprovalController.getRegistrationRequest);
router.patch('/registration-requests/:id/approve', requireAuth, authorize('admin'), adminApprovalController.approveParentRegistration);
router.patch('/registration-requests/:id/reject', requireAuth, authorize('admin'), adminApprovalController.rejectParentRegistration);
router.patch('/registration-requests/:id/suspend', requireAuth, authorize('admin'), adminApprovalController.suspendParentRegistration);

// --- Student Registration Requests ---
router.get('/student-registration-requests', requireAuth, authorize('admin'), adminApprovalController.listStudentRegistrationRequests);
router.get('/student-registration-requests/:id', requireAuth, authorize('admin'), adminApprovalController.getStudentRegistrationRequest);
router.patch('/student-registration-requests/:id/approve', requireAuth, authorize('admin'), adminApprovalController.approveStudentRegistration);
router.patch('/student-registration-requests/:id/reject', requireAuth, authorize('admin'), adminApprovalController.rejectStudentRegistration);

// --- Audit Logs ---
router.get('/audit-logs', requireAuth, authorize('admin'), adminApprovalController.listAuditLogs);

module.exports = router;