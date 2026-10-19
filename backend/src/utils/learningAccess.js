const { query, pool } = require('../config/db');

// ============================================================================
// Learning access + ordering helpers.
//
// Single source of truth for "can this child reach this lesson / resource?".
// Both the lesson-journey controller and the legacy content controller use it
// so a child can never bypass the COURSE -> LESSON -> RESOURCE sequence by
// calling an endpoint directly (see prompt sections 18, 19 and 22).
// ============================================================================

// Maps a journey resource_type to its concrete content table.
const RESOURCE_TABLES = {
  video: 'videos',
  material: 'learning_materials',
  activity: 'activities',
  quiz: 'quizzes',
};

/**
 * Resolve the students.id for the authenticated request.
 * - student  -> their own students row
 * - parent   -> the child named by X-Child-Id / child_id, else their first child
 * Returns null when no usable child is found (or the parent does not own the
 * requested child, which is treated as "no access").
 */
async function resolveStudentId(req) {
  if (req.user.role === 'student') {
    const res = await query('SELECT id FROM students WHERE user_id = $1 AND is_active = TRUE', [req.user.id]);
    return res.rows[0]?.id || null;
  }

  if (req.user.role === 'parent') {
    const parentRes = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentRes.rows.length === 0) return null;
    const parentId = parentRes.rows[0].id;

    const requested = req.params?.studentId || req.headers['x-child-id'] || req.query?.child_id || req.body?.child_id;
    if (requested) {
      const res = await query(
        'SELECT id FROM students WHERE id = $1 AND parent_id = $2 AND is_active = TRUE',
        [requested, parentId]
      );
      return res.rows[0]?.id || null;
    }

    const res = await query(
      'SELECT id FROM students WHERE parent_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1',
      [parentId]
    );
    return res.rows[0]?.id || null;
  }

  return null;
}

/**
 * Access state for a lesson.
 * Returns { exists, courseId, isLocked }.
 * A lesson is locked when the course uses sequential learning and the previous
 * lesson (by order_index, then id) is not completed.
 */
async function getLessonAccess(studentId, lessonId) {
  const lessonRes = await query(
    `SELECT l.id, l.course_id, c.sequential_learning
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.id = $1`,
    [lessonId]
  );
  if (lessonRes.rows.length === 0) return { exists: false, courseId: null, isLocked: true };

  const lesson = lessonRes.rows[0];
  if (!lesson.sequential_learning) {
    return { exists: true, courseId: lesson.course_id, isLocked: false };
  }

  const prevRes = await query(
    `WITH ordered AS (
       SELECT l.id, ROW_NUMBER() OVER (ORDER BY l.order_index, l.id) AS rn
       FROM lessons l
       WHERE l.course_id = $1
     )
     SELECT p.id AS prev_id, COALESCE(slp.status, 'not_started') AS prev_status
     FROM ordered o
     LEFT JOIN ordered p ON p.rn = o.rn - 1
     LEFT JOIN student_lesson_progress slp ON slp.lesson_id = p.id AND slp.student_id = $2
     WHERE o.id = $3`,
    [lesson.course_id, studentId, lessonId]
  );

  const prev = prevRes.rows[0];
  const isLocked = !!(prev && prev.prev_id && prev.prev_status !== 'completed');
  return { exists: true, courseId: lesson.course_id, isLocked };
}

/**
 * Access state for a concrete resource instance.
 * Returns { exists, lessonId, courseId, lessonResourceId, isLocked }.
 * A resource is locked when its lesson is locked, or when an earlier required
 * resource in the same lesson is not yet completed. Optional resources are
 * never locked.
 */
async function getResourceAccess(studentId, resourceType, resourceId) {
  const table = RESOURCE_TABLES[resourceType];
  if (!table) return { exists: false, isLocked: true };

  const srcRes = await query(
    `SELECT t.lesson_id, l.course_id
     FROM ${table} t
     JOIN lessons l ON l.id = t.lesson_id
     WHERE t.id = $1`,
    [resourceId]
  );
  if (srcRes.rows.length === 0) return { exists: false, isLocked: true };

  const { lesson_id: lessonId, course_id: courseId } = srcRes.rows[0];

  const lessonAccess = await getLessonAccess(studentId, lessonId);
  if (lessonAccess.isLocked) {
    return { exists: true, lessonId, courseId, lessonResourceId: null, isLocked: true };
  }

  const lrRes = await query(
    `SELECT id FROM lesson_resources
     WHERE lesson_id = $1 AND resource_type = $2 AND resource_id = $3`,
    [lessonId, resourceType, resourceId]
  );

  // Resources are gated ONLY by their lesson, never by their position inside
  // the lesson: every video / material / activity / quiz in an open lesson is
  // accessible, in any order the child likes.
  return {
    exists: true,
    lessonId,
    courseId,
    lessonResourceId: lrRes.rows[0]?.id || null,
    isLocked: false,
  };
}

/**
 * Register a lesson's existing content into `lesson_resources` so the learning
 * order always comes from the database.
 *
 * This is idempotent and self-healing: every call appends any content that is
 * not yet part of the journey (a PDF/material, video, activity or quiz added
 * after the journey was first built) while leaving already-registered rows and
 * the instructor's saved order untouched. Without this, content created through
 * a path that does not register itself (e.g. a legacy material) would be
 * permanently invisible to children because the journey is read purely from
 * `lesson_resources`.
 */
async function ensureLessonResources(lessonId) {
  const sources = [
    ['activity', 'activities', 'Complete this activity to practice'],
    ['video', 'videos', 'Watch this video to learn'],
    ['material', 'learning_materials', 'Read and learn from this material'],
    ['quiz', 'quizzes', 'Test your knowledge with this quiz'],
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Continue numbering after the last saved position; existing rows keep the
    // order the instructor arranged them in.
    const orderRes = await client.query(
      'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM lesson_resources WHERE lesson_id = $1',
      [lessonId]
    );
    let displayOrder = orderRes.rows[0].next_order;

    for (const [type, table, description] of sources) {
      const rows = await client.query(
        `SELECT ct.id, ct.title
         FROM ${table} ct
         WHERE ct.lesson_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM lesson_resources lr
             WHERE lr.lesson_id = ct.lesson_id
               AND lr.resource_type = $2
               AND lr.resource_id = ct.id
           )
         ORDER BY ct.created_at, ct.id`,
        [lessonId, type]
      );
      for (const row of rows.rows) {
        await client.query(
          `INSERT INTO lesson_resources
             (lesson_id, resource_type, resource_id, display_order, is_required, title, description)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6)
           ON CONFLICT (lesson_id, resource_type, resource_id) DO NOTHING`,
          [lessonId, type, row.id, displayOrder++, row.title, description]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  RESOURCE_TABLES,
  resolveStudentId,
  getLessonAccess,
  getResourceAccess,
  ensureLessonResources,
};