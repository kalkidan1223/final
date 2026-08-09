const { query } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { canReadCourse } = require('../utils/courseAccess');

const VALID_ACTIVITY_TYPES = [
  'writing', 'reading', 'drawing', 'speaking', 'worksheet',
  'matching', 'coloring', 'counting', 'fill_in_the_blank',
  'drag_and_drop', 'multiple_choice', 'true_false', 'puzzle',
  'story_reading', 'pronunciation', 'vocabulary_practice',
  'letter_tracing', 'number_tracing',
];

async function getLessonOwnerInstructorId(lessonId) {
  const result = await query(
    `SELECT c.instructor_id
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.id = $1`,
    [lessonId]
  );
  return result.rows[0]?.instructor_id || null;
}

async function assertLessonOwnership(req, res, lessonId) {
  const ownerInstructorId = await getLessonOwnerInstructorId(lessonId);
  if (ownerInstructorId === null) {
    res.status(404).json({ error: 'Lesson not found' });
    return false;
  }
  if (req.user.role === 'admin') return true;

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || instructorId !== ownerInstructorId) {
    res.status(403).json({ error: 'You do not have permission to modify this lesson' });
    return false;
  }
  return true;
}

// Loads an activity plus its lesson/course context, needed by both this
// controller and the submissions controller.
async function loadActivityWithContext(activityId) {
  const result = await query(
    `SELECT a.*, l.course_id, c.instructor_id AS owner_instructor_id, c.status, c.age_group_id AS course_age_group_id
     FROM activities a
     JOIN lessons l ON l.id = a.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE a.id = $1`,
    [activityId]
  );
  return result.rows[0] || null;
}

async function assertActivityOwnership(req, res, activityId) {
  const activity = await loadActivityWithContext(activityId);
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return null;
  }
  if (req.user.role === 'admin') return activity;

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || instructorId !== activity.owner_instructor_id) {
    res.status(403).json({ error: 'You do not have permission to modify this activity' });
    return null;
  }
  return activity;
}

// ----------------------------------------------------------------------------
// POST /api/lessons/:lessonId/activities  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function createActivity(req, res, next) {
  try {
    const { lessonId } = req.params;
    const ok = await assertLessonOwnership(req, res, lessonId);
    if (!ok) return;

    const {
      title, activity_type, instructions, age_group_id,
      resource_url, max_score, requires_upload, auto_gradable,
    } = req.body;

    if (!title || !VALID_ACTIVITY_TYPES.includes(activity_type) || !instructions || !age_group_id) {
      return res.status(400).json({
        error: `title, instructions, age_group_id and a valid activity_type (one of ${VALID_ACTIVITY_TYPES.join(', ')}) are required`,
      });
    }

    const lessonAgeGroup = await query(
      `SELECT c.age_group_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
      [lessonId]
    );
    if (String(lessonAgeGroup.rows[0]?.age_group_id) !== String(age_group_id)) {
      return res.status(400).json({ error: 'Activity age group must match the course age group' });
    }

    const instructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `INSERT INTO activities
         (lesson_id, instructor_id, age_group_id, title, activity_type, instructions,
          resource_url, max_score, requires_upload, auto_gradable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        lessonId,
        req.user.role === 'admin' ? (await getLessonOwnerInstructorId(lessonId)) : instructorId,
        age_group_id,
        title,
        activity_type,
        instructions,
        resource_url || null,
        max_score || 100,
        requires_upload ?? false,
        auto_gradable ?? false,
      ]
    );

    res.status(201).json({ activity: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/lessons/:lessonId/activities
// ----------------------------------------------------------------------------
async function listActivitiesForLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const lessonCourse = await query(
      `SELECT c.* FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
      [lessonId]
    );
    if (lessonCourse.rows.length === 0 || !(await canReadCourse(req.user, lessonCourse.rows[0]))) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const result = await query(
      'SELECT * FROM activities WHERE lesson_id = $1 ORDER BY created_at',
      [lessonId]
    );
    res.json({ activities: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/activities/:id
// ----------------------------------------------------------------------------
async function getActivity(req, res, next) {
  try {
    const activity = await loadActivityWithContext(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    if (!(await canReadCourse(req.user, { ...activity, age_group_id: activity.course_age_group_id }))) {
      return res.status(404).json({ error: 'Activity not found' });
    delete activity.owner_instructor_id;
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/activities/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateActivity(req, res, next) {
  try {
    const activity = await assertActivityOwnership(req, res, req.params.id);
    if (!activity) return;

    const { title, instructions, resource_url, max_score, requires_upload } = req.body;
    const result = await query(
      `UPDATE activities
       SET title = COALESCE($1, title),
           instructions = COALESCE($2, instructions),
           resource_url = COALESCE($3, resource_url),
           max_score = COALESCE($4, max_score),
           requires_upload = COALESCE($5, requires_upload),
           updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [title, instructions, resource_url, max_score, requires_upload, activity.id]
    );

    res.json({ activity: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/activities/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function deleteActivity(req, res, next) {
  try {
    const activity = await assertActivityOwnership(req, res, req.params.id);
    if (!activity) return;

    await query('DELETE FROM activities WHERE id = $1', [activity.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  VALID_ACTIVITY_TYPES,
  createActivity,
  listActivitiesForLesson,
  getActivity,
  updateActivity,
  deleteActivity,
  loadActivityWithContext,
  assertActivityOwnership,
};
