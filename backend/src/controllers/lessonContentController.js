const { query, pool } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { canReadCourse } = require('../utils/courseAccess');
const { isValidVideoUrl } = require('../utils/videoValidation');

const VALID_STATUSES = ['active', 'inactive', 'archived'];
const VALID_MATERIAL_TYPES = ['video', 'image', 'pdf', 'document', 'presentation', 'audio', 'other'];

function validateVideoSource(sourceType, url) {
  if (sourceType === 'upload') {
    if (!url.startsWith('/uploads/')) {
      return { valid: false, reason: 'Uploaded videos must use the file URL returned by the upload endpoint' };
    }
    return { valid: true };
  }
  return isValidVideoUrl(url);
}

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

// Loads a row from `table` joined to its lesson's owning course instructor,
// verifying ownership. Writes error responses itself. Returns the row or null.
async function loadOwnedContent(req, res, table) {
  const { id } = req.params;
  const result = await query(
    `SELECT ct.*, c.instructor_id AS owner_instructor_id
     FROM ${table} ct
     JOIN lessons l ON l.id = ct.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE ct.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: `${table} item not found` });
    return null;
  }
  if (req.user.role === 'admin') return result.rows[0];

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || instructorId !== result.rows[0].owner_instructor_id) {
    res.status(403).json({ error: 'You do not have permission to modify this content' });
    return null;
  }
  return result.rows[0];
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

    const [materials, videos, quizzes, activities, statsRes] = await Promise.all([
      query('SELECT * FROM learning_materials WHERE lesson_id = $1 ORDER BY display_order, created_at', [id]),
      query('SELECT * FROM videos WHERE lesson_id = $1 ORDER BY created_at', [id]),
      query(
        'SELECT id, title, description, instructions, time_limit_seconds, passing_score, max_score, status, attempt_limit, shuffle_questions, show_result_immediately FROM quizzes WHERE lesson_id = $1 ORDER BY created_at',
        [id]
      ),
      query('SELECT * FROM activities WHERE lesson_id = $1 ORDER BY display_order, created_at', [id]),
      query(
        `SELECT
           (SELECT COUNT(*) FROM progress WHERE lesson_id = $1 AND status = 'completed')::int AS completed_students,
           (SELECT COUNT(*) FROM students WHERE age_group_id = $2 AND is_active = TRUE)::int AS total_students`,
        [id, lessonResult.rows[0].age_group_id]
      ),
    ]);

    res.json({
      lesson: lessonResult.rows[0],
      materials: materials.rows,
      videos: videos.rows,
      quizzes: quizzes.rows,
      activities: activities.rows,
      summary: {
        materials: materials.rows.length,
        videos: videos.rows.length,
        activities: activities.rows.length,
        quizzes: quizzes.rows.length,
        completed_students: parseInt(statsRes.rows[0]?.completed_students || 0, 10),
        total_students: parseInt(statsRes.rows[0]?.total_students || 0, 10),
      },
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

    const { type, title, file_url, description, thumbnail_url, display_order } = req.body;
    if (!VALID_MATERIAL_TYPES.includes(type) || !title || !file_url) {
      return res.status(400).json({ error: `title, file_url and a valid type (one of ${VALID_MATERIAL_TYPES.join(', ')}) are required` });
    }

    const maxOrder = await query(
      'SELECT COALESCE(MAX(display_order), -1) AS max_order FROM learning_materials WHERE lesson_id = $1',
      [lessonId]
    );

    const instructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `INSERT INTO learning_materials (lesson_id, type, title, file_url, description, display_order, thumbnail_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        lessonId,
        type,
        title,
        file_url,
        description || null,
        display_order ?? maxOrder.rows[0].max_order + 1,
        thumbnail_url || null,
        instructorId,
      ]
    );
    res.status(201).json({ material: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/materials/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateMaterial(req, res, next) {
  try {
    const material = await loadOwnedContent(req, res, 'learning_materials');
    if (!material) return;

    const { type, title, file_url, description, display_order, thumbnail_url } = req.body;
    if (type && !VALID_MATERIAL_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of ${VALID_MATERIAL_TYPES.join(', ')}` });
    }

    const result = await query(
      `UPDATE learning_materials
       SET type = COALESCE($1, type),
           title = COALESCE($2, title),
           file_url = COALESCE($3, file_url),
           description = COALESCE($4, description),
           display_order = COALESCE($5, display_order),
           thumbnail_url = COALESCE($6, thumbnail_url)
       WHERE id = $7
       RETURNING *`,
      [type || null, title || null, file_url || null, description || null, display_order || null, thumbnail_url || null, material.id]
    );
    res.json({ material: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/materials/:id/status  (owning instructor or admin)
// Body: { status: 'active' | 'inactive' | 'archived' }
// ----------------------------------------------------------------------------
async function updateMaterialStatus(req, res, next) {
  try {
    const material = await loadOwnedContent(req, res, 'learning_materials');
    if (!material) return;

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    const result = await query(
      'UPDATE learning_materials SET status = $1 WHERE id = $2 RETURNING *',
      [status, material.id]
    );
    res.json({ material: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/lessons/:lessonId/materials/reorder  (owning instructor or admin)
// Body: { ordered_material_ids: [id, id, ...] }
// ----------------------------------------------------------------------------
async function reorderMaterials(req, res, next) {
  try {
    const { lessonId } = req.params;
    const ok = await assertLessonOwnership(req, res, lessonId);
    if (!ok) return;

    const { ordered_material_ids } = req.body;
    if (!Array.isArray(ordered_material_ids)) {
      return res.status(400).json({ error: 'ordered_material_ids must be an array' });
    }

    const existing = await query(
      'SELECT id FROM learning_materials WHERE lesson_id = $1',
      [lessonId]
    );
    const existingIds = existing.rows.map((m) => String(m.id)).sort();
    const requestedIds = ordered_material_ids.map(String).sort();
    if (existingIds.length !== requestedIds.length || existingIds.some((id, index) => id !== requestedIds[index])) {
      return res.status(400).json({ error: 'ordered_material_ids must contain every material in this lesson exactly once' });
    }

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      await conn.query('UPDATE learning_materials SET display_order = -id WHERE lesson_id = $1', [lessonId]);
      for (let i = 0; i < ordered_material_ids.length; i += 1) {
        await conn.query(
          'UPDATE learning_materials SET display_order = $1 WHERE id = $2 AND lesson_id = $3',
          [i, ordered_material_ids[i], lessonId]
        );
      }
      await conn.query('COMMIT');
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }

    const result = await query(
      'SELECT * FROM learning_materials WHERE lesson_id = $1 ORDER BY display_order, created_at',
      [lessonId]
    );
    res.json({ materials: result.rows });
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

    const { title, video_url, thumbnail_url, duration_seconds, description, source_type = 'youtube' } = req.body;
    if (!title || !video_url || !['youtube', 'upload'].includes(source_type)) {
      return res.status(400).json({ error: 'title and video_url are required; source_type must be youtube or upload' });
    }
    const videoCheck = validateVideoSource(source_type, video_url);
    if (!videoCheck.valid) {
      return res.status(400).json({ error: `Invalid video. ${videoCheck.reason || 'Provide a valid YouTube URL or an uploaded file.'}` });
    }

    const instructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `INSERT INTO videos (lesson_id, title, video_url, thumbnail_url, duration_seconds, description, source_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [lessonId, title, video_url, thumbnail_url || null, duration_seconds || null, description || null, source_type, instructorId]
    );
    res.status(201).json({ video: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/videos/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateVideo(req, res, next) {
  try {
    const video = await loadOwnedContent(req, res, 'videos');
    if (!video) return;

    const { title, video_url, thumbnail_url, duration_seconds, description, source_type } = req.body;
    if (source_type !== undefined && !['youtube', 'upload'].includes(source_type)) {
      return res.status(400).json({ error: 'source_type must be youtube or upload' });
    }
    if (video_url) {
      const effectiveSource = source_type || video.source_type || 'youtube';
      const videoCheck = validateVideoSource(effectiveSource, video_url);
      if (!videoCheck.valid) {
        return res.status(400).json({ error: `Invalid video. ${videoCheck.reason || 'Provide a valid YouTube URL or an uploaded file.'}` });
      }
    }

    const result = await query(
      `UPDATE videos
       SET title = COALESCE($1, title),
           video_url = COALESCE($2, video_url),
           thumbnail_url = COALESCE($3, thumbnail_url),
           duration_seconds = COALESCE($4, duration_seconds),
           description = COALESCE($5, description),
           source_type = COALESCE($6, source_type)
       WHERE id = $7
       RETURNING *`,
      [title || null, video_url || null, thumbnail_url || null, duration_seconds || null, description || null, source_type || null, video.id]
    );
    res.json({ video: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/videos/:id/status  (owning instructor or admin)
// Body: { status: 'active' | 'inactive' | 'archived' }
// ----------------------------------------------------------------------------
async function updateVideoStatus(req, res, next) {
  try {
    const video = await loadOwnedContent(req, res, 'videos');
    if (!video) return;

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    const result = await query(
      'UPDATE videos SET status = $1 WHERE id = $2 RETURNING *',
      [status, video.id]
    );
    res.json({ video: result.rows[0] });
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
  updateMaterial,
  updateMaterialStatus,
  reorderMaterials,
  deleteMaterial,
  createVideo,
  updateVideo,
  updateVideoStatus,
  deleteVideo,
};
