const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const catalogueController = require('../controllers/fidelCatalogueController');
const lessonController = require('../controllers/fidelLessonController');
const childController = require('../controllers/fidelChildController');

// ============================================================================
// 1. CATALOGUE ROUTES
// ============================================================================
router.get('/fidel-families', requireAuth, catalogueController.listFamilies);
router.get('/fidel-families/:familyId', requireAuth, catalogueController.getFamily);
router.get('/fidel-families/:familyId/characters', requireAuth, catalogueController.getFamilyCharacters);

// Global Pronunciation Catalogue Maintenance (Admin only)
router.put('/admin/fidel-characters/:characterId', requireAuth, authorize('admin'), catalogueController.updateCharacterSpeechConfig);

// ============================================================================
// 2. INSTRUCTOR LESSON AUTHORING ROUTES
// ============================================================================
router.get(
  '/instructor/courses/:courseId/fidel-lessons',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.listCourseFidelLessons
);

router.post(
  '/instructor/courses/:courseId/fidel-lessons',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.createFidelLesson
);

router.get(
  '/instructor/fidel-lessons/:lessonId',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.getFidelLessonDetail
);

router.put(
  '/instructor/fidel-lessons/:lessonId',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.updateFidelLesson
);

router.post(
  '/instructor/fidel-lessons/:lessonId/preview',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.previewFidelLesson
);

router.post(
  '/instructor/fidel-lessons/:lessonId/publish',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.publishFidelLesson
);

// ============================================================================
// 3. AUDIO PREVIEW & ASSET MANAGEMENT ROUTES
// ============================================================================
router.post(
  '/instructor/fidel-characters/:characterId/audio-preview',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.previewCharacterAudio
);

router.get(
  '/fidel-characters/:characterId/audio',
  requireAuth,
  lessonController.getCharacterAudio
);

router.post(
  '/instructor/fidel-audio-assets/:assetId/retry',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.retryAudioAsset
);

router.post(
  '/instructor/fidel-audio-assets/:assetId/report-issue',
  requireAuth,
  authorize('instructor', 'admin'),
  lessonController.reportAudioIssue
);

// ============================================================================
// 4. CHILD LEARNING & PROGRESS ROUTES
// ============================================================================
router.get(
  '/student/lessons/:lessonId/fidel-content',
  requireAuth,
  authorize('student', 'parent', 'instructor', 'admin'),
  childController.getFidelLessonContent
);

router.post(
  '/student/lessons/:lessonId/fidel-progress',
  requireAuth,
  authorize('student', 'parent'),
  childController.recordListenProgress
);

router.get(
  '/student/lessons/:lessonId/fidel-progress',
  requireAuth,
  authorize('student', 'parent', 'instructor', 'admin'),
  childController.getStudentFidelProgress
);

router.post(
  '/student/lessons/:lessonId/fidel-practice-complete',
  requireAuth,
  authorize('student', 'parent'),
  childController.completePracticeActivity
);

module.exports = router;
