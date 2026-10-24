/**
 * gradeRoutes.js
 * Routes for grade levels, subjects, and curriculum
 */

const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const { requireAuth } = require('../middleware/auth');

// Grade Levels
router.get('/grades', gradeController.getGradeLevels);
router.get('/grades/:id', gradeController.getGradeLevel);
router.post('/grades', requireAuth, gradeController.createGradeLevel);
router.put('/grades/:id', requireAuth, gradeController.updateGradeLevel);
router.delete('/grades/:id', requireAuth, gradeController.deleteGradeLevel);

// Subjects
router.get('/subjects', gradeController.getSubjects);
router.get('/subjects/:id', gradeController.getSubject);
router.post('/subjects', requireAuth, gradeController.createSubject);
router.put('/subjects/:id', requireAuth, gradeController.updateSubject);
router.delete('/subjects/:id', requireAuth, gradeController.deleteSubject);

// Curriculum
router.get('/curriculum-versions', gradeController.getCurriculumVersions);
router.get('/curriculum-objectives', gradeController.getCurriculumObjectives);

module.exports = router;
