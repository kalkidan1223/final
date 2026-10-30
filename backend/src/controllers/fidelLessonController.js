const { pool, query } = require('../config/db');
const { canManageCourse, canManageLesson } = require('../utils/courseAccess');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const ttsService = require('../services/tts/TtsService');

/**
 * GET /api/instructor/courses/:courseId/fidel-lessons
 * List fidel lessons for an assigned course
 */
async function listCourseFidelLessons(req, res, next) {
  try {
    const { courseId } = req.params;
    const allowed = await canManageCourse(req.user, courseId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to manage this course' });
    }

    const lessonsRes = await query(
      `SELECT 
         l.id,
         l.course_id,
         l.title,
         l.description,
         l.learning_objectives,
         l.order_index,
         l.status,
         l.created_at,
         l.updated_at,
         COALESCE(lfc.is_published, false) AS is_published,
         lfc.published_at,
         lfc.activities_enabled,
         lfc.listening_required_first,
         (
           SELECT json_agg(json_build_object(
             'id', f.id,
             'family_name', f.family_name,
             'base_character', f.base_character,
             'display_order', lff.display_order
           ) ORDER BY lff.display_order ASC)
           FROM lesson_fidel_families lff
           JOIN fidel_families f ON f.id = lff.family_id
           WHERE lff.lesson_id = l.id
         ) AS families
       FROM lessons l
       LEFT JOIN lesson_fidel_configs lfc ON lfc.lesson_id = l.id
       WHERE l.course_id = $1
         AND EXISTS (SELECT 1 FROM lesson_fidel_families lff WHERE lff.lesson_id = l.id)
       ORDER BY l.order_index ASC, l.id ASC`,
      [courseId]
    );

    res.json({ lessons: lessonsRes.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/instructor/courses/:courseId/fidel-lessons
 * Create a new fidel family lesson
 */
async function createFidelLesson(req, res, next) {
  const client = await pool.connect();
  try {
    const { courseId } = req.params;
    const allowed = await canManageCourse(req.user, courseId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to manage this course' });
    }

    const {
      title,
      description,
      learning_objectives,
      family_ids,
      practice_settings,
      publish_now,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Lesson title is required' });
    }

    if (!Array.isArray(family_ids) || family_ids.length === 0) {
      return res.status(400).json({ error: 'At least one fidel family must be selected' });
    }

    // Verify all families exist and are active
    const familiesCheck = await client.query(
      `SELECT id, family_name, base_character 
       FROM fidel_families 
       WHERE id = ANY($1::bigint[]) AND is_active = TRUE`,
      [family_ids]
    );

    if (familiesCheck.rows.length !== family_ids.length) {
      return res.status(400).json({ error: 'One or more selected fidel families are invalid or inactive' });
    }

    await client.query('BEGIN');

    // Get current max order index for course lessons
    const maxOrderRes = await client.query(
      `SELECT COALESCE(MAX(order_index), -1) AS max_order FROM lessons WHERE course_id = $1`,
      [courseId]
    );
    const nextOrder = maxOrderRes.rows[0].max_order + 1;

    // Insert into lessons table
    const lessonRes = await client.query(
      `INSERT INTO lessons (
         course_id, title, description, learning_objectives,
         order_index, difficulty_level, status
       ) VALUES ($1, $2, $3, $4, $5, 'beginner', 'active')
       RETURNING *`,
      [
        courseId,
        title.trim(),
        description ? description.trim() : null,
        learning_objectives ? learning_objectives.trim() : null,
        nextOrder,
      ]
    );
    const lesson = lessonRes.rows[0];

    // Insert selected families preserving instructor order
    for (let i = 0; i < family_ids.length; i++) {
      await client.query(
        `INSERT INTO lesson_fidel_families (lesson_id, family_id, display_order)
         VALUES ($1, $2, $3)`,
        [lesson.id, family_ids[i], i + 1]
      );
    }

    // Configure practice settings
    const settings = practice_settings || {};
    const activitiesEnabled = settings.activities_enabled || ['listen_explore', 'listen_identify', 'sound_match', 'quiz'];
    const activityOrder = settings.activity_order || activitiesEnabled;
    const listeningRequiredFirst = settings.listening_required_first !== undefined ? Boolean(settings.listening_required_first) : true;
    const minListenCount = settings.min_listen_count_required || 1;
    const requireAllAudioReady = settings.require_all_audio_ready !== undefined ? Boolean(settings.require_all_audio_ready) : true;

    await client.query(
      `INSERT INTO lesson_fidel_configs (
         lesson_id, activities_enabled, activity_order, listening_required_first,
         min_listen_count_required, require_all_audio_ready, is_published, published_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        lesson.id,
        JSON.stringify(activitiesEnabled),
        JSON.stringify(activityOrder),
        listeningRequiredFirst,
        minListenCount,
        requireAllAudioReady,
        publish_now ? true : false,
        publish_now ? new Date() : null,
      ]
    );

    await client.query('COMMIT');

    // Prewarm audio assets in background so preview/playback is instant
    ttsService.prewarmLessonAudio(lesson.id).catch(err => {
      console.warn(`Audio prewarming for lesson ${lesson.id} encountered issues:`, err.message);
    });

    res.status(201).json({
      lesson,
      message: 'Fidel family lesson created successfully',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /api/instructor/fidel-lessons/:lessonId
 * Get detailed fidel lesson authoring content with 7 forms and audio status
 */
async function getFidelLessonDetail(req, res, next) {
  try {
    const { lessonId } = req.params;
    const allowed = await canManageLesson(req.user, lessonId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to manage this lesson' });
    }

    const lessonRes = await query(
      `SELECT 
         l.*,
         c.title AS course_title,
         c.grade_level_id,
         c.subject_id,
         gl.name AS grade_level_name,
         s.name AS subject_name,
         lfc.activities_enabled,
         lfc.activity_order,
         lfc.listening_required_first,
         lfc.min_listen_count_required,
         lfc.require_all_audio_ready,
         COALESCE(lfc.is_published, false) AS is_published,
         lfc.published_at
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN grade_levels gl ON gl.id = c.grade_level_id
       LEFT JOIN subjects s ON s.id = c.subject_id
       LEFT JOIN lesson_fidel_configs lfc ON lfc.lesson_id = l.id
       WHERE l.id = $1`,
      [lessonId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonRes.rows[0];

    // Get selected families with their forms and audio assets
    const familiesRes = await query(
      `SELECT 
         f.id,
         f.family_name,
         f.base_character,
         f.language_code,
         f.description,
         lff.display_order AS family_order,
         (
           SELECT json_agg(json_build_object(
             'id', c.id,
             'character', c.character,
             'character_name', c.character_name,
             'speech_text', c.speech_text,
             'speech_language', c.speech_language,
             'display_order', c.display_order,
             'pronunciation_status', c.pronunciation_status,
             'audio_asset_id', a.id,
             'audio_url', a.audio_url,
             'generation_status', COALESCE(a.generation_status, 'pending'),
             'pronunciation_review_status', COALESCE(a.pronunciation_review_status, 'approved')
           ) ORDER BY c.display_order ASC)
           FROM fidel_characters c
           LEFT JOIN LATERAL (
             SELECT id, audio_url, generation_status, pronunciation_review_status
             FROM fidel_audio_assets
             WHERE fidel_character_id = c.id
             ORDER BY (generation_status = 'ready') DESC, updated_at DESC
             LIMIT 1
           ) a ON TRUE
           WHERE c.family_id = f.id AND c.is_active = TRUE
         ) AS forms
       FROM lesson_fidel_families lff
       JOIN fidel_families f ON f.id = lff.family_id
       WHERE lff.lesson_id = $1
       ORDER BY lff.display_order ASC`,
      [lessonId]
    );

    res.json({
      lesson,
      families: familiesRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/instructor/fidel-lessons/:lessonId
 * Update fidel lesson details, families, and practice settings
 */
async function updateFidelLesson(req, res, next) {
  const client = await pool.connect();
  try {
    const { lessonId } = req.params;
    const allowed = await canManageLesson(req.user, lessonId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to modify this lesson' });
    }

    const {
      title,
      description,
      learning_objectives,
      family_ids,
      practice_settings,
    } = req.body;

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ error: 'Lesson title cannot be empty' });
    }

    await client.query('BEGIN');

    // Update lesson metadata
    if (title !== undefined || description !== undefined || learning_objectives !== undefined) {
      await client.query(
        `UPDATE lessons
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             learning_objectives = COALESCE($3, learning_objectives),
             updated_at = now()
         WHERE id = $4`,
        [
          title ? title.trim() : null,
          description ? description.trim() : null,
          learning_objectives ? learning_objectives.trim() : null,
          lessonId,
        ]
      );
    }

    // Update families if provided
    if (Array.isArray(family_ids)) {
      if (family_ids.length === 0) {
        throw new Error('At least one fidel family must be selected');
      }

      // Verify families
      const checkRes = await client.query(
        `SELECT id FROM fidel_families WHERE id = ANY($1::bigint[]) AND is_active = TRUE`,
        [family_ids]
      );
      if (checkRes.rows.length !== family_ids.length) {
        throw new Error('One or more selected families are invalid or inactive');
      }

      // Re-link families
      await client.query(`DELETE FROM lesson_fidel_families WHERE lesson_id = $1`, [lessonId]);
      for (let i = 0; i < family_ids.length; i++) {
        await client.query(
          `INSERT INTO lesson_fidel_families (lesson_id, family_id, display_order)
           VALUES ($1, $2, $3)`,
          [lessonId, family_ids[i], i + 1]
        );
      }
    }

    // Update practice settings if provided
    if (practice_settings) {
      const settings = practice_settings;
      const activitiesEnabled = settings.activities_enabled || ['listen_explore', 'listen_identify', 'sound_match', 'quiz'];
      const activityOrder = settings.activity_order || activitiesEnabled;
      const listeningRequiredFirst = settings.listening_required_first !== undefined ? Boolean(settings.listening_required_first) : true;
      const minListenCount = settings.min_listen_count_required || 1;
      const requireAllAudioReady = settings.require_all_audio_ready !== undefined ? Boolean(settings.require_all_audio_ready) : true;

      await client.query(
        `INSERT INTO lesson_fidel_configs (
           lesson_id, activities_enabled, activity_order, listening_required_first,
           min_listen_count_required, require_all_audio_ready, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (lesson_id) DO UPDATE SET
           activities_enabled = EXCLUDED.activities_enabled,
           activity_order = EXCLUDED.activity_order,
           listening_required_first = EXCLUDED.listening_required_first,
           min_listen_count_required = EXCLUDED.min_listen_count_required,
           require_all_audio_ready = EXCLUDED.require_all_audio_ready,
           updated_at = now()`,
        [
          lessonId,
          JSON.stringify(activitiesEnabled),
          JSON.stringify(activityOrder),
          listeningRequiredFirst,
          minListenCount,
          requireAllAudioReady,
        ]
      );
    }

    await client.query('COMMIT');

    // Prewarm in background
    ttsService.prewarmLessonAudio(lessonId).catch(() => {});

    res.json({ message: 'Fidel lesson updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/instructor/fidel-lessons/:lessonId/preview
 * Generate child-facing preview payload and prewarm audio
 */
async function previewFidelLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const allowed = await canManageLesson(req.user, lessonId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to preview this lesson' });
    }

    // Prewarm audio
    const prewarmResult = await ttsService.prewarmLessonAudio(lessonId);

    // Retrieve child preview structure
    const lessonRes = await query(
      `SELECT l.id, l.title, l.description, l.learning_objectives, lfc.activities_enabled, lfc.listening_required_first
       FROM lessons l
       LEFT JOIN lesson_fidel_configs lfc ON lfc.lesson_id = l.id
       WHERE l.id = $1`,
      [lessonId]
    );

    const familiesRes = await query(
      `SELECT 
         f.id,
         f.family_name,
         f.base_character,
         lff.display_order AS family_order,
         (
           SELECT json_agg(json_build_object(
             'id', c.id,
             'character', c.character,
             'character_name', c.character_name,
             'display_order', c.display_order,
             'audio_url', a.audio_url,
             'generation_status', COALESCE(a.generation_status, 'pending')
           ) ORDER BY c.display_order ASC)
           FROM fidel_characters c
           LEFT JOIN LATERAL (
             SELECT id, audio_url, generation_status
             FROM fidel_audio_assets
             WHERE fidel_character_id = c.id
             ORDER BY (generation_status = 'ready') DESC, updated_at DESC
             LIMIT 1
           ) a ON TRUE
           WHERE c.family_id = f.id AND c.is_active = TRUE
         ) AS forms
       FROM lesson_fidel_families lff
       JOIN fidel_families f ON f.id = lff.family_id
       WHERE lff.lesson_id = $1
       ORDER BY lff.display_order ASC`,
      [lessonId]
    );

    res.json({
      lesson: lessonRes.rows[0],
      families: familiesRes.rows,
      audioStatus: prewarmResult,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/instructor/fidel-lessons/:lessonId/publish
 * Validate and publish the lesson
 */
async function publishFidelLesson(req, res, next) {
  const client = await pool.connect();
  try {
    const { lessonId } = req.params;
    const allowed = await canManageLesson(req.user, lessonId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to publish this lesson' });
    }

    // Validation checks
    const lessonRes = await client.query(
      `SELECT l.*, lfc.require_all_audio_ready 
       FROM lessons l
       LEFT JOIN lesson_fidel_configs lfc ON lfc.lesson_id = l.id
       WHERE l.id = $1`,
      [lessonId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const lesson = lessonRes.rows[0];

    if (!lesson.title || !lesson.title.trim()) {
      return res.status(400).json({ error: 'Lesson title is required before publishing' });
    }

    // Check selected families count
    const familiesRes = await client.query(
      `SELECT f.id, f.family_name, COUNT(c.id)::int AS form_count
       FROM lesson_fidel_families lff
       JOIN fidel_families f ON f.id = lff.family_id
       LEFT JOIN fidel_characters c ON c.family_id = f.id AND c.is_active = TRUE
       WHERE lff.lesson_id = $1
       GROUP BY f.id, f.family_name`,
      [lessonId]
    );

    if (familiesRes.rows.length === 0) {
      return res.status(400).json({ error: 'At least one fidel family must be selected to publish' });
    }

    // Check each family has 7 forms
    for (const fam of familiesRes.rows) {
      if (fam.form_count !== 7) {
        return res.status(400).json({
          error: `Family ${fam.family_name} does not have all 7 required forms (found ${fam.form_count})`,
        });
      }
    }

    // Check audio status if configured to require ready audio
    const requireAudio = lesson.require_all_audio_ready !== false;
    if (requireAudio) {
      const audioCheck = await client.query(
        `SELECT COUNT(c.id)::int AS missing_count
         FROM lesson_fidel_families lff
         JOIN fidel_characters c ON c.family_id = lff.family_id AND c.is_active = TRUE
         LEFT JOIN fidel_audio_assets a 
           ON a.fidel_character_id = c.id 
          AND a.generation_status = 'ready'
         WHERE lff.lesson_id = $1 AND a.id IS NULL`,
        [lessonId]
      );

      if (audioCheck.rows[0].missing_count > 0) {
        // Try prewarming once synchronously
        const prewarm = await ttsService.prewarmLessonAudio(lessonId);
        if (!prewarm.allReady) {
          return res.status(400).json({
            error: `Cannot publish: ${prewarm.failedCount} pronunciation audio assets are not ready yet. Please retry generation or adjust policy.`,
            audioStatus: prewarm,
          });
        }
      }
    }

    await client.query('BEGIN');

    // Update lesson status and publish flag
    await client.query(
      `UPDATE lessons SET status = 'active', updated_at = now() WHERE id = $1`,
      [lessonId]
    );

    await client.query(
      `INSERT INTO lesson_fidel_configs (lesson_id, is_published, published_at, updated_at)
       VALUES ($1, TRUE, now(), now())
       ON CONFLICT (lesson_id) DO UPDATE SET
         is_published = TRUE,
         published_at = COALESCE(lesson_fidel_configs.published_at, now()),
         updated_at = now()`,
      [lessonId]
    );

    // Register an activity in the activities table if none exists for this lesson
    // so it integrates into lesson_resources journey
    const actRes = await client.query(
      `SELECT id FROM activities WHERE lesson_id = $1 AND activity_type = 'pronunciation' LIMIT 1`,
      [lessonId]
    );

    let activityId = actRes.rows[0]?.id;
    if (!activityId) {
      const instructorId = await getInstructorIdForUser(req.user.id);
      const courseRes = await client.query(`SELECT grade_level_id FROM courses WHERE id = $1`, [lesson.course_id]);
      const gradeLevelId = courseRes.rows[0]?.grade_level_id || null;

      const newAct = await client.query(
        `INSERT INTO activities (
           lesson_id, instructor_id, grade_level_id, title, activity_type,
           instructions, max_score, auto_gradable, status
         ) VALUES ($1, $2, $3, $4, 'pronunciation', $5, 100, TRUE, 'active')
         RETURNING id`,
        [
          lessonId,
          instructorId || 1,
          gradeLevelId,
          `Amharic Fidel Practice - ${lesson.title}`,
          'Listen to each of the seven forms and complete the matching challenge.',
        ]
      );
      activityId = newAct.rows[0].id;

      // Add to lesson_resources
      await client.query(
        `INSERT INTO lesson_resources (
           lesson_id, resource_type, resource_id, display_order, is_required, title, description
         ) VALUES ($1, 'activity', $2, 1, TRUE, $3, $4)
         ON CONFLICT (lesson_id, resource_type, resource_id) DO NOTHING`,
        [
          lessonId,
          activityId,
          `Fidel Practice - ${lesson.title}`,
          'Explore seven forms and practice Amharic sound recognition',
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Fidel lesson published successfully',
      lessonId,
      is_published: true,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

/**
 * POST /api/instructor/fidel-characters/:characterId/audio-preview
 * Request or generate audio preview for a character
 */
async function previewCharacterAudio(req, res, next) {
  try {
    const { characterId } = req.params;
    const { voice_id, provider } = req.body;

    const asset = await ttsService.getOrGenerateCharacterAudio({
      characterId,
      voiceId: voice_id,
      providerName: provider,
      forceRegenerate: req.body.force === true,
    });

    res.json({ asset });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fidel-characters/:characterId/audio
 * Safe playback URL endpoint
 */
async function getCharacterAudio(req, res, next) {
  try {
    const { characterId } = req.params;

    const asset = await ttsService.getOrGenerateCharacterAudio({
      characterId,
    });

    res.json({
      characterId,
      audio_url: asset.audio_url,
      generation_status: asset.generation_status,
      duration_seconds: asset.duration_seconds,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/instructor/fidel-audio-assets/:assetId/retry
 * Retry failed audio generation
 */
async function retryAudioAsset(req, res, next) {
  try {
    const { assetId } = req.params;

    const assetRes = await query('SELECT * FROM fidel_audio_assets WHERE id = $1', [assetId]);
    if (assetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Audio asset not found' });
    }

    const asset = assetRes.rows[0];
    const regenerated = await ttsService.getOrGenerateCharacterAudio({
      characterId: asset.fidel_character_id,
      providerName: asset.provider,
      voiceId: asset.voice_id,
      forceRegenerate: true,
    });

    res.json({ asset: regenerated });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/instructor/fidel-audio-assets/:assetId/report-issue
 * Report / flag pronunciation issue
 */
async function reportAudioIssue(req, res, next) {
  try {
    const { assetId } = req.params;
    const { issue_type, description } = req.body;

    if (!issue_type) {
      return res.status(400).json({ error: 'issue_type is required' });
    }

    const reportRes = await query(
      `INSERT INTO fidel_audio_issue_reports (audio_asset_id, reported_by, issue_type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [assetId, req.user.id, issue_type, description || null]
    );

    // Update asset pronunciation review status to 'flagged'
    await query(
      `UPDATE fidel_audio_assets
       SET pronunciation_review_status = 'flagged', updated_at = now()
       WHERE id = $1`,
      [assetId]
    );

    res.status(201).json({
      message: 'Pronunciation issue reported successfully',
      report: reportRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCourseFidelLessons,
  createFidelLesson,
  getFidelLessonDetail,
  updateFidelLesson,
  previewFidelLesson,
  publishFidelLesson,
  previewCharacterAudio,
  getCharacterAudio,
  retryAudioAsset,
  reportAudioIssue,
};
