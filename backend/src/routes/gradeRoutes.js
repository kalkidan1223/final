/**
 * gradeRoutes.js
 * Routes for grade levels, subjects, and curriculum
 */

const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Grade Levels
router.get('/grades', gradeController.getGradeLevels);
router.get('/admin/grades', requireAuth, authorize('admin'), (req, res, next) => {
  req.query.include_inactive = 'true';
  return gradeController.getGradeLevels(req, res, next);
});
router.get('/grades/:id', gradeController.getGradeLevel);
router.post('/grades', requireAuth, authorize('admin'), gradeController.createGradeLevel);
router.put('/grades/:id', requireAuth, authorize('admin'), gradeController.updateGradeLevel);
router.delete('/grades/:id', requireAuth, authorize('admin'), gradeController.deleteGradeLevel);

// Subjects
router.get('/subjects', gradeController.getSubjects);
router.get('/subjects/:id', gradeController.getSubject);
router.post('/subjects', requireAuth, authorize('admin'), gradeController.createSubject);
router.put('/subjects/:id', requireAuth, authorize('admin'), gradeController.updateSubject);
router.delete('/subjects/:id', requireAuth, authorize('admin'), gradeController.deleteSubject);

// Subject-Grade Assignments
router.get('/subject-grade-assignments', gradeController.getSubjectGradeAssignments);
router.post('/subject-grade-assignments', requireAuth, authorize('admin'), gradeController.createSubjectGradeAssignment);
router.delete('/subject-grade-assignments/:id', requireAuth, authorize('admin'), gradeController.deleteSubjectGradeAssignment);

// Curriculum
router.get('/curriculum-versions', gradeController.getCurriculumVersions);
router.get('/curriculum-objectives', gradeController.getCurriculumObjectives);

module.exports = router;
