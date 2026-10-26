const { pool, query } = require('../config/db');
const { resolveStudentId, getLessonAccess } = require('../utils/learningAccess');
const { canReadCourse } = require('../utils/courseAccess');

/**
 * GET /api/student/lessons/:lessonId/fidel-content
 * Returns child-friendly fidel lesson content, 7 forms, audio URLs, and current progress
 */
async function getFidelLessonContent(req, res, next) {
  try {
    const { lessonId } = req.params;
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'No active student found for current user' });
    }

    // 1. Check lesson and course access
    const lessonRes = await query(
      `SELECT 
         l.id,
         l.course_id,
         l.title,
         l.description,
         l.learning_objectives,
         l.order_index,
         c.title AS course_title,
         c.grade_level_id,
         c.status AS course_status,
         c.sequential_learning,
         COALESCE(lfc.is_published, false) AS is_published,
         COALESCE(lfc.activities_enabled, '["listen_explore", "listen_identify", "sound_match", "quiz"]'::jsonb) AS activities_enabled,
         COALESCE(lfc.activity_order, '["listen_explore", "listen_identify", "sound_match", "quiz"]'::jsonb) AS activity_order,
         COALESCE(lfc.listening_required_first, true) AS listening_required_first,
         COALESCE(lfc.min_listen_count_required, 1) AS min_listen_count_required
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN lesson_fidel_configs lfc ON lfc.lesson_id = l.id
       WHERE l.id = $1`,
      [lessonId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonRes.rows[0];

    // Must be published for learners
    if (!lesson.is_published && (req.user.role === 'student' || req.user.role === 'parent')) {
      return res.status(403).json({ error: 'This lesson is not yet published' });
    }

    // Check course read permission
    const courseCanRead = await canReadCourse(req.user, {
      id: lesson.course_id,
      grade_level_id: lesson.grade_level_id,
      status: lesson.course_status,
    });
    if (!courseCanRead && req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: 'You are not enrolled in or assigned to this course' });
    }

    // Check sequential learning lock
    const access = await getLessonAccess(studentId, lessonId);
    if (access.isLocked && req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({
        error: 'This lesson is locked. Complete the previous lesson first.',
        is_locked: true,
      });
    }

    // 2. Fetch selected families and their 7 forms
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
             'audio_url', COALESCE(a.audio_url, '/uploads/audio/fidel/' || a.speech_text_hash || '.mp3'),
             'duration_seconds', a.duration_seconds
           ) ORDER BY c.display_order ASC)
           FROM fidel_characters c
           LEFT JOIN LATERAL (
             SELECT id, audio_url, speech_text_hash, duration_seconds
             FROM fidel_audio_assets
             WHERE fidel_character_id = c.id AND generation_status = 'ready'
             ORDER BY updated_at DESC
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

    // 3. Fetch current student progress for this lesson
    const progressRes = await query(
      `SELECT 
         fidel_character_id,
         listen_count,
         first_listened_at,
         practice_completed_at
       FROM student_fidel_progress
       WHERE student_id = $1 AND lesson_id = $2`,
      [studentId, lessonId]
    );

    const progressMap = {};
    progressRes.rows.forEach(p => {
      progressMap[p.fidel_character_id] = {
        listen_count: p.listen_count,
        first_listened_at: p.first_listened_at,
        practice_completed_at: p.practice_completed_at,
      };
    });

    // Check aggregate lesson completion
    const lessonProgressRes = await query(
      `SELECT status, progress_percentage, completed_at
       FROM student_lesson_progress
       WHERE student_id = $1 AND lesson_id = $2`,
      [studentId, lessonId]
    );

    res.json({
      lesson: {
        id: lesson.id,
        course_id: lesson.course_id,
        course_title: lesson.course_title,
        title: lesson.title,
        description: lesson.description,
        learning_objectives: lesson.learning_objectives,
        activities_enabled: lesson.activities_enabled,
        activity_order: lesson.activity_order,
        listening_required_first: lesson.listening_required_first,
        min_listen_count_required: lesson.min_listen_count_required,
      },
      families: familiesRes.rows,
      progress: progressMap,
      lesson_progress: lessonProgressRes.rows[0] || {
        status: 'not_started',
        progress_percentage: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/student/lessons/:lessonId/fidel-progress
 * Record an audio listen event (tracks listening separately from practice completion)
 */
async function recordListenProgress(req, res, next) {
  try {
    const { lessonId } = req.params;
    const { fidel_character_id } = req.body;

    if (!fidel_character_id) {
      return res.status(400).json({ error: 'fidel_character_id is required' });
    }

    const studentId = await resolveStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'No active student found for current user' });
    }

    // Verify character belongs to this lesson
    const charBelongs = await query(
      `SELECT c.id
       FROM fidel_characters c
       JOIN lesson_fidel_families lff ON lff.family_id = c.family_id
       WHERE lff.lesson_id = $1 AND c.id = $2`,
      [lessonId, fidel_character_id]
    );

    if (charBelongs.rows.length === 0) {
      return res.status(400).json({ error: 'Character does not belong to this lesson' });
    }

    // Upsert student_fidel_progress
    const result = await query(
      `INSERT INTO student_fidel_progress (
         student_id, lesson_id, fidel_character_id,
         first_listened_at, listen_count, updated_at
       ) VALUES ($1, $2, $3, now(), 1, now())
       ON CONFLICT (student_id, lesson_id, fidel_character_id)
       DO UPDATE SET
         listen_count = student_fidel_progress.listen_count + 1,
         first_listened_at = COALESCE(student_fidel_progress.first_listened_at, now()),
         updated_at = now()
       RETURNING *`,
      [studentId, lessonId, fidel_character_id]
    );

    // Also update student_lesson_progress last_accessed_at and set to in_progress if not_started
    await query(
      `INSERT INTO student_lesson_progress (
         student_id, lesson_id, status, progress_percentage, started_at, last_accessed_at, updated_at
       ) VALUES ($1, $2, 'in_progress', 10, now(), now(), now())
       ON CONFLICT (student_id, lesson_id)
       DO UPDATE SET
         status = CASE WHEN student_lesson_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
         started_at = COALESCE(student_lesson_progress.started_at, now()),
         last_accessed_at = now(),
         updated_at = now()`,
      [studentId, lessonId]
    );

    res.json({
      success: true,
      character_id: fidel_character_id,
      progress: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/student/lessons/:lessonId/fidel-progress
 * Retrieve current child's progress for this fidel lesson
 */
async function getStudentFidelProgress(req, res, next) {
  try {
    const { lessonId } = req.params;
    const studentId = await resolveStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'No active student found for current user' });
    }

    const progressRes = await query(
      `SELECT 
         sfp.*,
         c.character,
         c.character_name,
         c.display_order
       FROM student_fidel_progress sfp
       JOIN fidel_characters c ON c.id = sfp.fidel_character_id
       WHERE sfp.student_id = $1 AND sfp.lesson_id = $2
       ORDER BY c.family_id ASC, c.display_order ASC`,
      [studentId, lessonId]
    );

    const lessonProgressRes = await query(
      `SELECT * FROM student_lesson_progress WHERE student_id = $1 AND lesson_id = $2`,
      [studentId, lessonId]
    );

    res.json({
      student_id: studentId,
      lesson_id: lessonId,
      character_progress: progressRes.rows,
      lesson_progress: lessonProgressRes.rows[0] || {
        status: 'not_started',
        progress_percentage: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/student/lessons/:lessonId/fidel-practice-complete
 * Record practice completion (matching / quiz / identification activity)
 * Updates authoritative lesson completion in PostgreSQL
 */
async function completePracticeActivity(req, res, next) {
  const client = await pool.connect();
  try {
    const { lessonId } = req.params;
    const { character_ids, score = 100, answers } = req.body;

    const studentId = await resolveStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'No active student found for current user' });
    }

    await client.query('BEGIN');

    // 1. Mark practice completed for the characters (upsert so unlistened characters are recorded)
    if (Array.isArray(character_ids) && character_ids.length > 0) {
      await client.query(
        `INSERT INTO student_fidel_progress (
           student_id, lesson_id, fidel_character_id, practice_completed_at, updated_at
         )
         SELECT $1, $2, unnest($3::bigint[]), now(), now()
         ON CONFLICT (student_id, lesson_id, fidel_character_id)
         DO UPDATE SET
           practice_completed_at = COALESCE(student_fidel_progress.practice_completed_at, now()),
           updated_at = now()`,
        [studentId, lessonId, character_ids]
      );
    } else {
      await client.query(
        `INSERT INTO student_fidel_progress (
           student_id, lesson_id, fidel_character_id, practice_completed_at, updated_at
         )
         SELECT $1, $2, c.id, now(), now()
         FROM lesson_fidel_families lff
         JOIN fidel_characters c ON c.family_id = lff.family_id AND c.is_active = TRUE
         WHERE lff.lesson_id = $2
         ON CONFLICT (student_id, lesson_id, fidel_character_id)
         DO UPDATE SET
           practice_completed_at = COALESCE(student_fidel_progress.practice_completed_at, now()),
           updated_at = now()`,
        [studentId, lessonId]
      );
    }

    // 2. Check total characters and completed characters in this lesson
    const totalCharsRes = await client.query(
      `SELECT COUNT(c.id)::int AS total_count
       FROM lesson_fidel_families lff
       JOIN fidel_characters c ON c.family_id = lff.family_id AND c.is_active = TRUE
       WHERE lff.lesson_id = $1`,
      [lessonId]
    );
    const totalChars = totalCharsRes.rows[0]?.total_count || 7;

    const completedCharsRes = await client.query(
      `SELECT COUNT(*)::int AS completed_count
       FROM student_fidel_progress
       WHERE student_id = $1 AND lesson_id = $2 AND practice_completed_at IS NOT NULL`,
      [studentId, lessonId]
    );
    const completedChars = completedCharsRes.rows[0]?.completed_count || 0;

    const isFullyCompleted = completedChars >= totalChars && totalChars > 0;
    const progressPercentage = Math.min(100, Math.round((completedChars / totalChars) * 100));

    // 3. Update student_lesson_progress
    const lessonStatus = isFullyCompleted ? 'completed' : 'in_progress';
    const updatedLessonProgress = await client.query(
      `INSERT INTO student_lesson_progress (
         student_id, lesson_id, status, progress_percentage,
         required_resources_completed, total_required_resources,
         started_at, completed_at, last_accessed_at, updated_at
       ) VALUES ($1, $2, $3::text, $4, $5, $6, now(), CASE WHEN $3::text = 'completed' THEN now() ELSE NULL END, now(), now())
       ON CONFLICT (student_id, lesson_id)
       DO UPDATE SET
         status = CASE WHEN student_lesson_progress.status = 'completed' THEN 'completed' ELSE $3::text END,
         progress_percentage = GREATEST(student_lesson_progress.progress_percentage, $4),
         required_resources_completed = GREATEST(student_lesson_progress.required_resources_completed, $5),
         total_required_resources = $6,
         completed_at = CASE WHEN $3::text = 'completed' THEN COALESCE(student_lesson_progress.completed_at, now()) ELSE NULL END,
         last_accessed_at = now(),
         updated_at = now()
       RETURNING *`,
      [
        studentId,
        lessonId,
        lessonStatus,
        progressPercentage,
        completedChars,
        totalChars,
      ]
    );

    // 4. Update the core progress table for compatibility
    const courseRes = await client.query('SELECT course_id FROM lessons WHERE id = $1', [lessonId]);
    if (courseRes.rows.length > 0) {
      const courseId = courseRes.rows[0].course_id;
      await client.query(
        `INSERT INTO progress (student_id, course_id, lesson_id, status, completion_percentage, last_accessed_at, updated_at)
         VALUES ($1, $2, $3, $4::progress_status, $5, now(), now())
         ON CONFLICT (student_id, course_id, lesson_id)
         DO UPDATE SET
           status = CASE WHEN progress.status = 'completed' THEN 'completed' ELSE $4::progress_status END,
           completion_percentage = GREATEST(progress.completion_percentage, $5),
           last_accessed_at = now(),
           updated_at = now()`,
        [studentId, courseId, lessonId, lessonStatus, progressPercentage]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      is_completed: isFullyCompleted,
      progress_percentage: progressPercentage,
      completed_characters: completedChars,
      total_characters: totalChars,
      lesson_progress: updatedLessonProgress.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getFidelLessonContent,
  recordListenProgress,
  getStudentFidelProgress,
  completePracticeActivity,
};
