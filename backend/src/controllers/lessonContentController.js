const { query } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { canReadCourse } = require('../utils/courseAccess');

async function assertLessonOwnership(req, res, lessonId) {
  const result = await query(
    `SELECT c.instructor_id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
    [lessonId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Lesson not found' });
    return false;
  }
  if (req.user.role === 'admin') return true;

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || instructorId !== result.rows[0].instructor_id) {
    res.status(403).json({ error: 'You do not have permission to modify this lesson' });
    return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// GET /api/lessons/:id  — full lesson detail: materials, videos, quizzes, activities
// ----------------------------------------------------------------------------
async function getLessonDetail(req, res, next) {
  try {
    const { id } = req.params;
    const lessonResult = await query(
      `SELECT l.*, c.title AS course_title, c.id AS course_id, c.status,
              c.instructor_id, c.age_group_id
       FROM lessons l JOIN courses c ON c.id = l.course_id
       WHERE l.id = $1`,
      [id]
    );
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (!(await canReadCourse(req.user, lessonResult.rows[0]))) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const [materials, videos, quizzes, activities] = await Promise.all([
      query('SELECT * FROM learning_materials WHERE lesson_id = $1 ORDER BY created_at', [id]),
      query('SELECT * FROM videos WHERE lesson_id = $1 ORDER BY created_at', [id]),
      query('SELECT id, title, description, time_limit_seconds FROM quizzes WHERE lesson_id = $1 ORDER BY created_at', [id]),
      query('SELECT id, title, activity_type, max_score, requires_upload FROM activities WHERE lesson_id = $1 ORDER BY created_at', [id]),
    ]);

    res.json({
      lesson: lessonResult.rows[0],
      materials: materials.rows,
      videos: videos.rows,
      quizzes: quizzes.rows,
      activities: activities.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/lessons/:lessonId/materials  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function createMaterial(req, res, next) {
  try {
    const { lessonId } = req.params;
    const ok = await assertLessonOwnership(req, res, lessonId);
    if (!ok) return;

    const { type, title, file_url } = req.body;
    const VALID_TYPES = ['video', 'image', 'pdf', 'document', 'audio'];
    if (!VALID_TYPES.includes(type) || !title || !file_url) {
      return res.status(400).json({ error: `title, file_url and a valid type (one of ${VALID_TYPES.join(', ')}) are required` });
    }

    const instructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `INSERT INTO learning_materials (lesson_id, type, title, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lessonId, type, title, file_url, instructorId]
    );
    res.status(201).json({ material: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/materials/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function deleteMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const materialResult = await query(
      `SELECT m.*, c.instructor_id AS owner_instructor_id
       FROM learning_materials m
       JOIN lessons l ON l.id = m.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE m.id = $1`,
      [id]
    );
    if (materialResult.rows.length === 0) return res.status(404).json({ error: 'Material not found' });

    if (req.user.role !== 'admin') {
      const instructorId = await getInstructorIdForUser(req.user.id);
      if (instructorId !== materialResult.rows[0].owner_instructor_id) {
        return res.status(403).json({ error: 'You do not have permission to delete this material' });
      }
    }
    await query('DELETE FROM learning_materials WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/lessons/:lessonId/videos  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function createVideo(req, res, next) {
  try {
    const { lessonId } = req.params;
    const ok = await assertLessonOwnership(req, res, lessonId);
    if (!ok) return;

    const { title, video_url, thumbnail_url, duration_seconds } = req.body;
    if (!title || !video_url) {
      return res.status(400).json({ error: 'title and video_url are required' });
    }

    const instructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `INSERT INTO videos (lesson_id, title, video_url, thumbnail_url, duration_seconds, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [lessonId, title, video_url, thumbnail_url || null, duration_seconds || null, instructorId]
    );
    res.status(201).json({ video: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/videos/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function deleteVideo(req, res, next) {
  try {
    const { id } = req.params;
    const videoResult = await query(
      `SELECT v.*, c.instructor_id AS owner_instructor_id
       FROM videos v
       JOIN lessons l ON l.id = v.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE v.id = $1`,
      [id]
    );
    if (videoResult.rows.length === 0) return res.status(404).json({ error: 'Video not found' });

    if (req.user.role !== 'admin') {
      const instructorId = await getInstructorIdForUser(req.user.id);
      if (instructorId !== videoResult.rows[0].owner_instructor_id) {
        return res.status(403).json({ error: 'You do not have permission to delete this video' });
      }
    }
    await query('DELETE FROM videos WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLessonDetail,
  createMaterial,
  deleteMaterial,
  createVideo,
  deleteVideo,
};
