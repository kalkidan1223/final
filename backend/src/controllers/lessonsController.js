const { query, pool } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');

// Loads a lesson plus its parent course, and confirms the current user may
// modify it (owning instructor or admin). Writes error responses itself.
async function loadOwnedLesson(req, res) {
  const { id } = req.params;
  const result = await query(
    `SELECT l.*, c.instructor_id AS course_instructor_id
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Lesson not found' });
    return null;
  }
  const lesson = result.rows[0];

  if (req.user.role === 'admin') return lesson;

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || lesson.course_instructor_id !== instructorId) {
    res.status(403).json({ error: 'You do not have permission to modify this lesson' });
    return null;
  }
  return lesson;
}

async function assertCourseOwnership(req, res, courseId) {
  const courseResult = await query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
  if (courseResult.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return false;
  }
  if (req.user.role === 'admin') return true;

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || courseResult.rows[0].instructor_id !== instructorId) {
    res.status(403).json({ error: 'You do not have permission to modify this course' });
    return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// POST /api/courses/:courseId/lessons  (owning instructor or admin)
// Appends to the end of the course by default (order_index = current max + 1).
// ----------------------------------------------------------------------------
async function createLesson(req, res, next) {
  try {
    const { courseId } = req.params;
    const ok = await assertCourseOwnership(req, res, courseId);
    if (!ok) return;

    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const maxOrder = await client.query(
        'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM lessons WHERE course_id = $1 FOR UPDATE',
        [courseId]
      );
      const nextOrder = maxOrder.rows[0].max_order + 1;

      const result = await client.query(
        `INSERT INTO lessons (course_id, title, description, order_index)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [courseId, title, description || null, nextOrder]
      );
      await client.query('COMMIT');
      res.status(201).json({ lesson: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/courses/:courseId/lessons
// ----------------------------------------------------------------------------
async function listLessons(req, res, next) {
  try {
    const { courseId } = req.params;
    const result = await query(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
      [courseId]
    );
    res.json({ lessons: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/lessons/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateLesson(req, res, next) {
  try {
    const lesson = await loadOwnedLesson(req, res);
    if (!lesson) return;

    const { title, description } = req.body;
    const result = await query(
      `UPDATE lessons
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [title, description, lesson.id]
    );

    res.json({ lesson: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/courses/:courseId/lessons/reorder  (owning instructor or admin)
// Body: { ordered_lesson_ids: [id, id, id, ...] }
// ----------------------------------------------------------------------------
async function reorderLessons(req, res, next) {
  try {
    const { courseId } = req.params;
    const ok = await assertCourseOwnership(req, res, courseId);
    if (!ok) return;

    const { ordered_lesson_ids } = req.body;
    if (!Array.isArray(ordered_lesson_ids) || ordered_lesson_ids.length === 0) {
      return res.status(400).json({ error: 'ordered_lesson_ids must be a non-empty array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ordered_lesson_ids.length; i += 1) {
        await client.query(
          'UPDATE lessons SET order_index = $1, updated_at = now() WHERE id = $2 AND course_id = $3',
          [i, ordered_lesson_ids[i], courseId]
        );
      }
      await client.query('COMMIT');

      const result = await client.query(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
        [courseId]
      );
      res.json({ lessons: result.rows });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/lessons/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function deleteLesson(req, res, next) {
  try {
    const lesson = await loadOwnedLesson(req, res);
    if (!lesson) return;

    await query('DELETE FROM lessons WHERE id = $1', [lesson.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createLesson,
  listLessons,
  updateLesson,
  reorderLessons,
  deleteLesson,
};
