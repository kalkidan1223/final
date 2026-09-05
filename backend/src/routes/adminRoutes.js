const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const adminController = require('../controllers/adminController');
const adminDashboardController = require('../controllers/adminDashboardController');
const ageGroupsController = require('../controllers/ageGroupsController');
const ageGroupCoursesController = require('../controllers/ageGroupCoursesController');
const adminExtController = require('../controllers/adminExtController');

const router = express.Router();

// --- Dashboard ---
router.get('/dashboard', requireAuth, authorize('admin'), adminDashboardController.getDashboardStats);
router.get('/analytics', requireAuth, authorize('admin'), adminController.getAnalytics);

// --- User Management ---
router.get('/users', requireAuth, authorize('admin'), adminController.listUsers);
router.get('/users/:id', requireAuth, authorize('admin'), adminController.getUser);
router.patch('/users/:id', requireAuth, authorize('admin'), adminController.updateUser);
router.patch('/users/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateUser);
router.patch('/users/:id/activate', requireAuth, authorize('admin'), adminController.activateUser);

// --- Student Management ---
router.get('/students', requireAuth, authorize('admin'), adminController.listStudents);
router.patch('/students/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateStudent);
router.patch('/students/:id/activate', requireAuth, authorize('admin'), adminController.activateStudent);

// --- Parent Management ---
router.get('/parents', requireAuth, authorize('admin'), adminController.listParents);
router.post('/parents', requireAuth, authorize('admin'), adminController.createParent);
router.patch('/parents/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateParent);
router.patch('/parents/:id/activate', requireAuth, authorize('admin'), adminController.activateParent);

// --- Instructor Management ---
router.get('/instructors', requireAuth, authorize('admin'), adminController.listInstructors);
router.patch('/instructors/:id/deactivate', requireAuth, authorize('admin'), adminController.deactivateInstructor);
router.patch('/instructors/:id/activate', requireAuth, authorize('admin'), adminController.activateInstructor);
router.patch('/instructors/:id/assignments', requireAuth, authorize('admin'), adminController.updateInstructorAssignments);
router.post('/instructors', requireAuth, authorize('admin'), adminController.createInstructor);

// --- Course Management ---
router.get('/courses', requireAuth, authorize('admin'), adminController.listCourses);
router.patch('/courses/:id/status', requireAuth, authorize('admin'), adminController.updateCourseStatus);
router.delete('/courses/:id', requireAuth, authorize('admin'), adminController.deleteCourse);

// --- Age Group Management ---
router.get('/age-groups', requireAuth, authorize('admin'), ageGroupsController.listAgeGroups);
router.post('/age-groups', requireAuth, authorize('admin'), ageGroupsController.createAgeGroup);
router.put('/age-groups/:id', requireAuth, authorize('admin'), adminController.updateAgeGroup);
router.delete('/age-groups/:id', requireAuth, authorize('admin'), adminController.deleteAgeGroup);

// --- Age Group Available Courses ---
router.get('/age-groups/:id/available-courses', requireAuth, authorize('admin'), ageGroupCoursesController.listAvailableCourses);
router.post('/age-groups/:id/available-courses', requireAuth, authorize('admin'), ageGroupCoursesController.addAvailableCourse);
router.post('/age-groups/:id/available-courses/bulk', requireAuth, authorize('admin'), ageGroupCoursesController.bulkAddAvailableCourses);
router.patch('/age-groups/:ageGroupId/available-courses/:courseId', requireAuth, authorize('admin'), ageGroupCoursesController.updateAvailableCourse);
router.delete('/age-groups/:ageGroupId/available-courses/:courseId', requireAuth, authorize('admin'), ageGroupCoursesController.deleteAvailableCourse);

// --- Reports ---
router.get('/reports', requireAuth, authorize('admin'), adminController.listReports);

// --- Notifications ---
router.get('/notifications', requireAuth, authorize('admin'), adminController.listAllNotifications);
router.post('/notifications/send', requireAuth, authorize('admin'), adminExtController.sendNotification);

// --- Lessons (admin supervise) ---
router.get('/lessons', requireAuth, authorize('admin'), adminExtController.listLessons);
router.patch('/lessons/:id/status', requireAuth, authorize('admin'), adminExtController.updateLessonStatus);

// --- Progress (admin view all) ---
router.get('/progress', requireAuth, authorize('admin'), adminExtController.listProgress);

// --- AI Recommendations (admin view all) ---
router.get('/ai-recommendations', requireAuth, authorize('admin'), adminExtController.listAIRecommendations);
router.patch('/ai-recommendations/:id/view', requireAuth, authorize('admin'), adminExtController.markRecommendationViewed);

// --- Announcements ---
router.get('/announcements', requireAuth, authorize('admin'), adminExtController.listAnnouncements);
router.post('/announcements', requireAuth, authorize('admin'), adminExtController.createAnnouncement);
router.delete('/announcements/:id', requireAuth, authorize('admin'), adminExtController.deleteAnnouncement);

// --- Reports (generate) ---
router.post('/reports/generate', requireAuth, authorize('admin'), adminExtController.generateReport);

// --- Instructor Assignments (admin manages which instructor teaches which course) ---
const { listInstructorAssignments, createInstructorAssignment, updateInstructorAssignment, deleteInstructorAssignment } = require('../controllers/instructorAssignmentController');
router.get('/instructor-assignments',     requireAuth, authorize('admin'), listInstructorAssignments);
router.post('/instructor-assignments',    requireAuth, authorize('admin'), createInstructorAssignment);
router.patch('/instructor-assignments/:id', requireAuth, authorize('admin'), updateInstructorAssignment);
router.delete('/instructor-assignments/:id', requireAuth, authorize('admin'), deleteInstructorAssignment);

// --- Academic Years ---
router.get('/academic-years', requireAuth, authorize('admin'), async (req, res, next) => {
  try {
    const { query } = require('../config/db');
    const { rows } = await query('SELECT * FROM academic_years ORDER BY id DESC');
    res.json({ academic_years: rows });
  } catch (err) { next(err); }
});
router.post('/academic-years', requireAuth, authorize('admin'), async (req, res, next) => {
  try {
    const { query } = require('../config/db');
    const { label, is_current } = req.body;
    if (!label) return res.status(400).json({ error: 'label is required' });
    const { rows } = await query(
      'INSERT INTO academic_years (label, is_current) VALUES ($1, $2) ON CONFLICT (label) DO UPDATE SET is_current = EXCLUDED.is_current RETURNING *',
      [label, !!is_current]
    );
    res.status(201).json({ academic_year: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
