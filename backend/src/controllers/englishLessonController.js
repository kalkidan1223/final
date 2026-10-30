const { query, pool } = require('../config/db');
const { canManageCourse, canManageLesson, canReadCourse } = require('../utils/courseAccess');
const { resolveStudentId, getLessonAccess } = require('../utils/learningAccess');
const englishTtsService = require('../services/EnglishTtsService');

// GET /api/english-letters  (reference data, admin-editable)
async function listLetters(req, res, next) {
  try {
    const r = await query('SELECT * FROM english_letters WHERE is_active = TRUE ORDER BY display_order ASC, id ASC');
    res.json({ letters: r.rows });
  } catch (err) { next(err); }
}

// POST /api/instructor/courses/:courseId/english-lessons
async function createEnglishLesson(req, res, next) {
  const client = await pool.connect();
  try {
    const { courseId } = req.params;
    const allowed = await canManageCourse(req.user, courseId);
    if (!allowed) return res.status(403).json({ error: 'You do not have permission to manage this course' });

    const { title, description, learning_objectives, letter_ids, publish_now } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Lesson title is required' });
    if (!Array.isArray(letter_ids) || letter_ids.length === 0) return res.status(400).json({ error: 'At least one letter must be selected' });

    const check = await client.query('SELECT id FROM english_letters WHERE id = ANY($1::bigint[]) AND is_active = TRUE', [letter_ids]);
    if (check.rows.length !== letter_ids.length) return res.status(400).json({ error: 'One or more selected letters are invalid or inactive' });

    await client.query('BEGIN');
    const maxOrder = await client.query('SELECT COALESCE(MAX(order_index), -1) AS max_order FROM lessons WHERE course_id = $1', [courseId]);
    const nextOrder = maxOrder.rows[0].max_order + 1;
    const lessonRes = await client.query(
      `INSERT INTO lessons (course_id, title, description, learning_objectives, order_index, difficulty_level, status)
       VALUES ($1, $2, $3, $4, $5, 'beginner', 'active') RETURNING *`,
      [courseId, title.trim(), description ? description.trim() : null, learning_objectives ? learning_objectives.trim() : null, nextOrder]
    );
    const lesson = lessonRes.rows[0];
    for (let i = 0; i < letter_ids.length; i++) {
      await client.query('INSERT INTO lesson_english_letters (lesson_id, letter_id, display_order) VALUES ($1, $2, $3)', [lesson.id, letter_ids[i], i + 1]);
    }
    await client.query(
      `INSERT INTO lesson_english_configs (lesson_id, is_published, published_at) VALUES ($1, $2, $3)`,
      [lesson.id, publish_now ? true : false, publish_now ? new Date() : null]
    );
    await client.query('COMMIT');

    englishTtsService.prewarmLessonAudio(lesson.id).catch((err) => console.warn('English audio prewarm issue:', err.message));

    res.status(201).json({ lesson, message: 'English letter lesson created successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/instructor/english-lessons/:lessonId
async function getEnglishLessonDetail(req, res, next) {
  try {
    const { lessonId } = req.params;
    const allowed = await canManageLesson(req.user, lessonId);
    if (!allowed) return res.status(403).json({ error: 'You do not have permission to manage this lesson' });

    const lessonRes = await query(
      `SELECT l.*, c.title AS course_title, c.subject_id, gl.name AS grade_level_name,
              COALESCE(le.is_published, false) AS is_published, le.published_at
       FROM lessons l JOIN courses c ON c.id = l.course_id
       LEFT JOIN grade_levels gl ON gl.id = c.grade_level_id
       LEFT JOIN lesson_english_configs le ON le.lesson_id = l.id
       WHERE l.id = $1`,
      [lessonId]
    );
    if (lessonRes.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
    const lesson = lessonRes.rows[0];

    const lettersRes = await query(
      `SELECT el.id, el.letter, el.letter_name, el.speech_text, el.speech_language, lel.display_order,
              (SELECT json_build_object('audio_url', a.audio_url, 'generation_status', a.generation_status, 'duration_seconds', a.duration_seconds)
               FROM english_audio_assets a WHERE a.english_letter_id = el.id AND a.generation_status = 'ready' ORDER BY a.updated_at DESC LIMIT 1) AS audio
       FROM lesson_english_letters lel JOIN english_letters el ON el.id = lel.letter_id
       WHERE lel.lesson_id = $1 ORDER BY lel.display_order ASC`,
      [lessonId]
    );

    res.json({ lesson, letters: lettersRes.rows });
  } catch (err) { next(err); }
}

// POST /api/instructor/english-letters/:letterId/audio-preview
async function previewLetterAudio(req, res, next) {
  try {
    const { letterId } = req.params;
    const { voice_id, provider, force } = req.body;
    const asset = await englishTtsService.getOrGenerateLetterAudio({
      letterId,
      voiceId: voice_id,
      providerName: provider,
      forceRegenerate: force === true,
    });
    res.json({ asset });
  } catch (err) { next(err); }
}

// GET /api/child/lessons/:lessonId/english-content
async function getChildEnglishContent(req, res, next) {
  try {
    const { lessonId } = req.params;
    const studentId = await resolveStudentId(req);
    if (!studentId) return res.status(403).json({ error: 'No active student found' });

    const access = await getLessonAccess(studentId, lessonId);
    if (access.isLocked && req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: 'This lesson is locked.' });
    }

    const lessonRes = await query(
      `SELECT l.id, l.title, l.description, l.course_id, c.title AS course_title,
              COALESCE(le.is_published, false) AS is_published
       FROM lessons l JOIN courses c ON c.id = l.course_id
       LEFT JOIN lesson_english_configs le ON le.lesson_id = l.id
       WHERE l.id = $1`,
      [lessonId]
    );
    if (lessonRes.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
    const lesson = lessonRes.rows[0];
    if (!lesson.is_published && (req.user.role === 'student' || req.user.role === 'parent')) {
      return res.status(403).json({ error: 'This lesson is not yet published' });
    }

    const lettersRes = await query(
      `SELECT el.id, el.letter, el.letter_name, el.speech_text, el.speech_language, lel.display_order,
              (SELECT json_build_object('audio_url', a.audio_url, 'generation_status', a.generation_status, 'duration_seconds', a.duration_seconds)
               FROM english_audio_assets a WHERE a.english_letter_id = el.id AND a.generation_status = 'ready' ORDER BY a.updated_at DESC LIMIT 1) AS audio
       FROM lesson_english_letters lel JOIN english_letters el ON el.id = lel.letter_id
       WHERE lel.lesson_id = $1 ORDER BY lel.display_order ASC`,
      [lessonId]
    );

    // progress
    const progressRes = await query(
      `SELECT english_letter_id, listen_count, first_listened_at FROM student_english_progress WHERE student_id = $1 AND lesson_id = $2`,
      [studentId, lessonId]
    );
    const progressMap = {};
    progressRes.rows.forEach((p) => { progressMap[p.english_letter_id] = p; });

    res.json({ lesson, letters: lettersRes.rows, progress: progressMap });
  } catch (err) { next(err); }
}

// POST /api/student/lessons/:lessonId/english-progress
async function recordEnglishProgress(req, res, next) {
  try {
    const { lessonId } = req.params;
    const studentId = await resolveStudentId(req);
    if (!studentId) return res.status(403).json({ error: 'No active student found' });
    const { english_letter_id } = req.body;
    if (!english_letter_id) return res.status(400).json({ error: 'english_letter_id is required' });

    await query(
      `INSERT INTO student_english_progress (student_id, lesson_id, english_letter_id, listen_count, first_listened_at, updated_at)
       VALUES ($1, $2, $3, 1, now(), now())
       ON CONFLICT (student_id, lesson_id, english_letter_id)
       DO UPDATE SET listen_count = student_english_progress.listen_count + 1, updated_at = now()`,
      [studentId, lessonId, english_letter_id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = {
  listLetters,
  createEnglishLesson,
  getEnglishLessonDetail,
  previewLetterAudio,
  getChildEnglishContent,
  recordEnglishProgress,
};