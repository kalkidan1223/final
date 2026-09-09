const { query } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { canReadCourse } = require('../utils/courseAccess');

const VALID_ACTIVITY_TYPES = [
  'writing', 'reading', 'drawing', 'speaking', 'worksheet',
  'matching', 'coloring', 'counting', 'fill_in_the_blank',
  'drag_and_drop', 'multiple_choice', 'true_false', 'puzzle',
  'story_reading', 'pronunciation', 'vocabulary_practice',
  'letter_tracing', 'number_tracing',
  'listening', 'picture_selection', 'file_submission', 'short_answer',
];

const VALID_ACTIVITY_STATUSES = ['active', 'inactive', 'archived'];

const VALID_DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'advanced'];

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
      difficulty, estimated_time_minutes, start_date, due_date,
      display_order, allow_resubmission, activity_config, status,
    } = req.body;

    if (!title || !VALID_ACTIVITY_TYPES.includes(activity_type) || !instructions) {
      return res.status(400).json({
        error: `title, instructions and a valid activity_type (one of ${VALID_ACTIVITY_TYPES.join(', ')}) are required`,
      });
    }
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: `difficulty must be one of ${VALID_DIFFICULTIES.join(', ')}` });
    }
    if (status !== undefined && !VALID_ACTIVITY_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_ACTIVITY_STATUSES.join(', ')}` });
    }

    // The activity inherits its course/lesson age group automatically —
    // the instructor never has to pick it again.
    const lessonAgeGroup = await query(
      `SELECT c.age_group_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
      [lessonId]
    );
    if (!lessonAgeGroup.rows[0]?.age_group_id) {
      return res.status(400).json({ error: 'Lesson is not linked to an age group' });
    }
    const resolvedAgeGroupId = String(lessonAgeGroup.rows[0].age_group_id);
    if (age_group_id && String(age_group_id) !== resolvedAgeGroupId) {
      return res.status(400).json({ error: 'Activity age group must match the course age group' });
    }

    const instructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `INSERT INTO activities
         (lesson_id, instructor_id, age_group_id, title, activity_type, instructions,
          resource_url, max_score, requires_upload, auto_gradable,
          difficulty, estimated_time_minutes, start_date, due_date,
          display_order, allow_resubmission, activity_config, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        lessonId,
        req.user.role === 'admin' ? (await getLessonOwnerInstructorId(lessonId)) : instructorId,
        resolvedAgeGroupId,
        title,
        activity_type,
        instructions,
        resource_url || null,
        max_score || 100,
        requires_upload ?? false,
        auto_gradable ?? false,
        difficulty || 'beginner',
        estimated_time_minutes || null,
        start_date || null,
        due_date || null,
        display_order ?? 0,
        allow_resubmission ?? false,
        activity_config ? JSON.stringify(activity_config) : null,
        status || 'active',
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
      'SELECT * FROM activities WHERE lesson_id = $1 ORDER BY display_order, created_at',
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
    }
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

    const {
      title, instructions, resource_url, max_score, requires_upload,
      auto_gradable, difficulty, estimated_time_minutes, start_date,
      due_date, display_order, allow_resubmission, activity_config, status,
    } = req.body;

    if (status !== undefined && !VALID_ACTIVITY_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_ACTIVITY_STATUSES.join(', ')}` });
    }
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: `difficulty must be one of ${VALID_DIFFICULTIES.join(', ')}` });
    }

    const result = await query(
      `UPDATE activities
       SET title = COALESCE($1, title),
           instructions = COALESCE($2, instructions),
           resource_url = COALESCE($3, resource_url),
           max_score = COALESCE($4, max_score),
           requires_upload = $5,
           auto_gradable = COALESCE($6, auto_gradable),
           difficulty = COALESCE($7, difficulty),
           estimated_time_minutes = COALESCE($8, estimated_time_minutes),
           start_date = COALESCE($9, start_date),
           due_date = COALESCE($10, due_date),
           display_order = COALESCE($11, display_order),
           allow_resubmission = $12,
           activity_config = COALESCE($13::jsonb, activity_config),
           status = COALESCE($14, status),
           updated_at = now()
       WHERE id = $15
       RETURNING *`,
      [
        title || null,
        instructions || null,
        resource_url || null,
        max_score || null,
        requires_upload ?? activity.requires_upload,
        auto_gradable ?? activity.auto_gradable,
        difficulty || null,
        estimated_time_minutes || null,
        start_date || null,
        due_date || null,
        display_order ?? null,
        allow_resubmission ?? activity.allow_resubmission,
        activity_config ? JSON.stringify(activity_config) : null,
        status || null,
        activity.id,
      ]
    );

    res.json({ activity: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/activities/:id/status  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateActivityStatus(req, res, next) {
  try {
    const activity = await assertActivityOwnership(req, res, req.params.id);
    if (!activity) return;

    const { status } = req.body;
    if (!VALID_ACTIVITY_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_ACTIVITY_STATUSES.join(', ')}` });
    }

    const result = await query(
      'UPDATE activities SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, activity.id]
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

    // Never lose student history: activities with submissions are preserved.
    const submissions = await query(
      'SELECT 1 FROM activity_submissions WHERE activity_id = $1 LIMIT 1',
      [activity.id]
    );
    if (submissions.rows.length > 0) {
      return res.status(409).json({
        error: 'This activity has student submissions. Deactivate or archive it instead to keep the results.',
      });
    }

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
  updateActivityStatus,
  deleteActivity,
  loadActivityWithContext,
  assertActivityOwnership,
};
