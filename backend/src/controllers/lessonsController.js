const { query, pool } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { canReadCourse } = require('../utils/courseAccess');

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const VALID_LESSON_STATUSES = ['active', 'inactive', 'archived'];

function isValidDifficulty(value) {
  return value === undefined || value === null || VALID_DIFFICULTIES.includes(value);
}

// Returns true when a lesson already has learner engagement (progress rows or
// activity submissions), which makes permanent deletion unsafe. Prefer
// deactivating the lesson instead.
async function lessonHasEngagement(lessonId) {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM progress WHERE lesson_id = $1
       UNION ALL
       SELECT 1
         FROM activity_submissions s
         JOIN activities a ON a.id = s.activity_id
        WHERE a.lesson_id = $1
       LIMIT 1
     ) AS engaged`,
    [lessonId]
  );
  return result.rows[0].engaged;
}

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

    const {
      title,
      description,
      learning_objectives,
      instructions,
      estimated_duration_minutes,
      difficulty_level,
      order_index,
    } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!isValidDifficulty(difficulty_level)) {
      return res.status(400).json({ error: `difficulty_level must be one of ${VALID_DIFFICULTIES.join(', ')}` });
    }
    if (estimated_duration_minutes !== undefined && estimated_duration_minutes !== null) {
      const mins = Number(estimated_duration_minutes);
      if (!Number.isFinite(mins) || mins <= 0) {
        return res.status(400).json({ error: 'estimated_duration_minutes must be a positive number' });
      }
    }
    const requestedOrder =
      order_index !== undefined && order_index !== null && order_index !== ''
        ? Number(order_index)
        : null;
    if (requestedOrder !== null && (!Number.isFinite(requestedOrder) || requestedOrder < 0)) {
      return res.status(400).json({ error: 'order_index must be a non-negative integer' });
    }

    // Inherit classroom metadata (grade, section, academic year) from the first
    // active assignment for this course — never entered manually.
    const assignmentResult = await query(
      `SELECT grade, section, academic_year_id
       FROM instructor_assignments
       WHERE course_id = $1 AND status = 'active'
       ORDER BY id
       LIMIT 1`,
      [courseId]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let nextOrder = requestedOrder;
      if (nextOrder === null) {
        const maxOrder = await client.query(
          'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM lessons WHERE course_id = $1 FOR UPDATE',
          [courseId]
        );
        nextOrder = maxOrder.rows[0].max_order + 1;
      } else {
        // Insert at the requested position, shifting later lessons down by one.
        await client.query(
          'UPDATE lessons SET order_index = order_index + 1 WHERE course_id = $1 AND order_index >= $2',
          [courseId, nextOrder]
        );
      }

      const result = await client.query(
        `INSERT INTO lessons (course_id, title, description, order_index,
                              learning_objectives, instructions,
                              estimated_duration_minutes, difficulty_level,
                              grade, section, academic_year_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          courseId,
          title,
          description || null,
          nextOrder,
          learning_objectives || null,
          instructions || null,
          estimated_duration_minutes ? Number(estimated_duration_minutes) : null,
          difficulty_level || 'beginner',
          assignmentResult.rows[0]?.grade || null,
          assignmentResult.rows[0]?.section || null,
          assignmentResult.rows[0]?.academic_year_id || null,
        ]
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
    const courseResult = await query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (courseResult.rows.length === 0 || !(await canReadCourse(req.user, courseResult.rows[0]))) {
      return res.status(404).json({ error: 'Course not found' });
    }
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

    const {
      title,
      description,
      learning_objectives,
      instructions,
      estimated_duration_minutes,
      difficulty_level,
    } = req.body;

    if (!isValidDifficulty(difficulty_level)) {
      return res.status(400).json({ error: `difficulty_level must be one of ${VALID_DIFFICULTIES.join(', ')}` });
    }
    if (estimated_duration_minutes !== undefined && estimated_duration_minutes !== null) {
      const mins = Number(estimated_duration_minutes);
      if (!Number.isFinite(mins) || mins <= 0) {
        return res.status(400).json({ error: 'estimated_duration_minutes must be a positive number' });
      }
    }

    const result = await query(
      `UPDATE lessons
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           learning_objectives = COALESCE($3, learning_objectives),
           instructions = COALESCE($4, instructions),
           estimated_duration_minutes = COALESCE($5, estimated_duration_minutes),
           difficulty_level = COALESCE($6, difficulty_level),
           updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [
        title,
        description,
        learning_objectives,
        instructions,
        estimated_duration_minutes !== undefined && estimated_duration_minutes !== null
          ? Number(estimated_duration_minutes)
          : null,
        difficulty_level,
        lesson.id,
      ]
    );

    res.json({ lesson: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/instructor/lessons/:id/status  (owning instructor or admin)
// Body: { status: 'active' | 'inactive' | 'archived' }
// ----------------------------------------------------------------------------
async function updateLessonStatus(req, res, next) {
  try {
    const lesson = await loadOwnedLesson(req, res);
    if (!lesson) return;

    const { status } = req.body;
    if (!VALID_LESSON_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_LESSON_STATUSES.join(', ')}` });
    }

    const result = await query(
      `UPDATE lessons
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, lesson.id]
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
    if (!Array.isArray(ordered_lesson_ids)) {
      return res.status(400).json({ error: 'ordered_lesson_ids must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id FROM lessons WHERE course_id = $1 ORDER BY id', [courseId]);
      const existingIds = existing.rows.map((lesson) => String(lesson.id)).sort();
      const requestedIds = ordered_lesson_ids.map(String).sort();
      if (existingIds.length !== requestedIds.length || existingIds.some((id, index) => id !== requestedIds[index])) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'ordered_lesson_ids must contain every lesson in this course exactly once' });
      }

      // Move rows to unique temporary positions first so swaps do not violate
      // the UNIQUE(course_id, order_index) database constraint.
      await client.query('UPDATE lessons SET order_index = -id WHERE course_id = $1', [courseId]);
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

    if (await lessonHasEngagement(lesson.id)) {
      return res.status(409).json({
        error: 'This lesson already has learner progress or submissions. Deactivate it instead of deleting it permanently.',
        suggestion: 'deactivate',
      });
    }

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
  updateLessonStatus,
  reorderLessons,
  deleteLesson,
};
