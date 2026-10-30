const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const ctrl = require('../controllers/englishLessonController');

const router = express.Router();

// Reference data (any authenticated user can read)
router.get('/english-letters', requireAuth, ctrl.listLetters);

// Instructor authoring
router.post('/instructor/courses/:courseId/english-lessons', requireAuth, authorize('instructor', 'admin'), ctrl.createEnglishLesson);
router.get('/instructor/english-lessons/:lessonId', requireAuth, authorize('instructor', 'admin'), ctrl.getEnglishLessonDetail);
router.post('/instructor/english-letters/:letterId/audio-preview', requireAuth, authorize('instructor', 'admin'), ctrl.previewLetterAudio);

// Child learning
router.get('/student/lessons/:lessonId/english-content', requireAuth, ctrl.getChildEnglishContent);
router.post('/student/lessons/:lessonId/english-progress', requireAuth, ctrl.recordEnglishProgress);

module.exports = router;