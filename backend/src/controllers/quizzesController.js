const { query, pool } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { canReadCourse } = require('../utils/courseAccess');
const { upsertLessonProgress } = require('../utils/progress');

// Resolves a lesson's owning instructor_id via its course, for ownership checks.
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

// Loads a quiz along with the instructor_id that owns its lesson's course.
async function loadQuizWithOwner(quizId) {
  const result = await query(
    `SELECT q.*, c.instructor_id AS owner_instructor_id, c.status, c.age_group_id, l.course_id
     FROM quizzes q
     JOIN lessons l ON l.id = q.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE q.id = $1`,
    [quizId]
  );
  return result.rows[0] || null;
}

async function assertQuizOwnership(req, res, quizId) {
  const quiz = await loadQuizWithOwner(quizId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return null;
  }
  if (req.user.role === 'admin') return quiz;

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || instructorId !== quiz.owner_instructor_id) {
    res.status(403).json({ error: 'You do not have permission to modify this quiz' });
    return null;
  }
  return quiz;
}

// ----------------------------------------------------------------------------
// POST /api/lessons/:lessonId/quizzes  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function createQuiz(req, res, next) {
  try {
    const { lessonId } = req.params;
    const ok = await assertLessonOwnership(req, res, lessonId);
    if (!ok) return;

    const {
      title, description, instructions, time_limit_seconds,
      passing_score, max_score, attempt_limit, shuffle_questions,
      show_result_immediately, status,
    } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (attempt_limit !== undefined && (Number(attempt_limit) < 1 || !Number.isFinite(Number(attempt_limit)))) {
      return res.status(400).json({ error: 'attempt_limit must be a positive number' });
    }
    if (status !== undefined && !['active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'status must be one of active, inactive, archived' });
    }

    const result = await query(
      `INSERT INTO quizzes (lesson_id, title, description, instructions, time_limit_seconds,
                            passing_score, max_score, attempt_limit, shuffle_questions, show_result_immediately, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        lessonId,
        title,
        description || null,
        instructions || null,
        time_limit_seconds || null,
        passing_score === undefined || passing_score === null ? null : Number(passing_score),
        max_score === undefined || max_score === null ? null : Number(max_score),
        attempt_limit === undefined || attempt_limit === null ? 1 : Number(attempt_limit),
        shuffle_questions ?? false,
        show_result_immediately ?? true,
        status || 'active',
      ]
    );

    res.status(201).json({ quiz: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/lessons/:lessonId/quizzes
// ----------------------------------------------------------------------------
async function listQuizzesForLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const result = await query('SELECT * FROM quizzes WHERE lesson_id = $1 ORDER BY created_at', [
      lessonId,
    ]);
    res.json({ quizzes: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/quizzes/:id
// Students/parents never receive correct_answer — only the instructor/admin
// who owns the quiz can see it, to prevent leaking answers through the API.
// ----------------------------------------------------------------------------
async function getQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const quiz = await loadQuizWithOwner(id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    if (!(await canReadCourse(req.user, quiz))) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const isOwnerOrAdmin =
      req.user.role === 'admin' ||
      (req.user.role === 'instructor' &&
        (await getInstructorIdForUser(req.user.id)) === quiz.owner_instructor_id);

    const columns = isOwnerOrAdmin
      ? 'id, quiz_id, question_text, question_type, options, correct_answer, points, order_index, explanation, question_config'
      : 'id, quiz_id, question_text, question_type, options, points, order_index, question_config';

    const questionsResult = await query(
      `SELECT ${columns} FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index`,
      [id]
    );

    delete quiz.owner_instructor_id;
    res.json({ quiz, questions: questionsResult.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/quizzes/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateQuiz(req, res, next) {
  try {
    const quiz = await assertQuizOwnership(req, res, req.params.id);
    if (!quiz) return;

    const {
      title, description, instructions, time_limit_seconds, passing_score,
      max_score, status, attempt_limit, shuffle_questions, show_result_immediately,
    } = req.body;
    if (status !== undefined && !['active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'status must be one of active, inactive, archived' });
    }

    const result = await query(
      `UPDATE quizzes
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           instructions = COALESCE($3, instructions),
           time_limit_seconds = COALESCE($4, time_limit_seconds),
           passing_score = COALESCE($5, passing_score),
           max_score = COALESCE($6, max_score),
           status = COALESCE($7, status),
           attempt_limit = COALESCE($8, attempt_limit),
           shuffle_questions = COALESCE($9, shuffle_questions),
           show_result_immediately = COALESCE($10, show_result_immediately)
       WHERE id = $11
       RETURNING *`,
      [
        title,
        description,
        instructions,
        time_limit_seconds,
        passing_score === undefined || passing_score === null ? null : Number(passing_score),
        max_score === undefined || max_score === null ? null : Number(max_score),
        status || null,
        attempt_limit === undefined || attempt_limit === null ? null : Number(attempt_limit),
        shuffle_questions ?? null,
        show_result_immediately ?? null,
        quiz.id,
      ]
    );
    res.json({ quiz: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/quizzes/:id/status  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateQuizStatus(req, res, next) {
  try {
    const quiz = await assertQuizOwnership(req, res, req.params.id);
    if (!quiz) return;

    const { status } = req.body;
    if (!['active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'status must be one of active, inactive, archived' });
    }

    const result = await query(
      'UPDATE quizzes SET status = $1 WHERE id = $2 RETURNING *',
      [status, quiz.id]
    );
    res.json({ quiz: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/quizzes/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function deleteQuiz(req, res, next) {
  try {
    const quiz = await assertQuizOwnership(req, res, req.params.id);
    if (!quiz) return;

    // Never lose student history: quizzes with results are preserved.
    const results = await query(
      'SELECT 1 FROM quiz_results WHERE quiz_id = $1 LIMIT 1',
      [quiz.id]
    );
    if (results.rows.length > 0) {
      return res.status(409).json({
        error: 'This quiz has student results. Deactivate or archive it instead to keep the history.',
      });
    }

    await query('DELETE FROM quizzes WHERE id = $1', [quiz.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/quizzes/:id/questions  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function addQuestion(req, res, next) {
  try {
    const quiz = await assertQuizOwnership(req, res, req.params.id);
    if (!quiz) return;

    const { question_text, question_type, options, correct_answer, points, explanation, question_config } = req.body;
    const VALID_TYPES = ['mcq', 'true_false', 'fill_in_the_blank', 'matching', 'short_answer', 'picture', 'audio'];

    if (!question_text || !VALID_TYPES.includes(question_type) || !correct_answer) {
      return res.status(400).json({
        error: `question_text, correct_answer, and question_type (one of ${VALID_TYPES.join(', ')}) are required`,
      });
    }
    if (question_type === 'mcq' && (!Array.isArray(options) || options.length < 2 || !options.includes(correct_answer))) {
      return res.status(400).json({
        error: 'A multiple-choice question needs at least two options and the correct answer must be one of them',
      });
    }
    if (question_type === 'true_false' && !['true', 'false'].includes(String(correct_answer).toLowerCase())) {
      return res.status(400).json({ error: 'A true/false question must use True or False as its correct answer' });
    }
    if ((question_type === 'picture' || question_type === 'audio') && !question_config?.media_url) {
      return res.status(400).json({ error: 'A picture/audio question needs a media_url in question_config' });
    }
    if (!Number.isFinite(Number(points)) || Number(points) <= 0) {
      return res.status(400).json({ error: 'points must be a positive number' });
    }

    const maxOrder = await query(
      'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM quiz_questions WHERE quiz_id = $1',
      [quiz.id]
    );

    const result = await query(
      `INSERT INTO quiz_questions
         (quiz_id, question_text, question_type, options, correct_answer, points, order_index, explanation, question_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        quiz.id,
        question_text,
        question_type,
        options ? JSON.stringify(options) : null,
        correct_answer,
        points || 1,
        maxOrder.rows[0].max_order + 1,
        explanation || null,
        question_config ? JSON.stringify(question_config) : null,
      ]
    );

    res.status(201).json({ question: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/quizzes/:id/questions  (owning instructor or admin)
// Replaces every question of the quiz in one call. Used by the Quiz Builder
// so instructors can edit the full question set with a single save.
// Body: { questions: [ { question_text, question_type, options, correct_answer, points, explanation, question_config } ] }
// ----------------------------------------------------------------------------
async function replaceQuizQuestions(req, res, next) {
  const VALID_TYPES = ['mcq', 'true_false', 'fill_in_the_blank', 'matching', 'short_answer', 'picture', 'audio'];
  try {
    const quiz = await assertQuizOwnership(req, res, req.params.id);
    if (!quiz) return;

    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions must be an array' });
    }

    for (const [index, q] of questions.entries()) {
      if (!q.question_text || !VALID_TYPES.includes(q.question_type) || !q.correct_answer) {
        return res.status(400).json({
          error: `Question ${index + 1}: question_text, correct_answer and a valid question_type are required`,
        });
      }
      if (q.question_type === 'mcq' && (!Array.isArray(q.options) || q.options.length < 2 || !q.options.includes(q.correct_answer))) {
        return res.status(400).json({ error: `Question ${index + 1}: a multiple-choice question needs at least two options and the correct answer must be one of them` });
      }
      if (q.question_type === 'true_false' && !['true', 'false'].includes(String(q.correct_answer).toLowerCase())) {
        return res.status(400).json({ error: `Question ${index + 1}: a true/false question must use True or False as its correct answer` });
      }
      if (!Number.isFinite(Number(q.points)) || Number(q.points) <= 0) {
        return res.status(400).json({ error: `Question ${index + 1}: points must be a positive number` });
      }
    }

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      await conn.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quiz.id]);
      for (let index = 0; index < questions.length; index += 1) {
        const q = questions[index];
        await conn.query(
          `INSERT INTO quiz_questions
             (quiz_id, question_text, question_type, options, correct_answer, points, order_index, explanation, question_config)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            quiz.id,
            q.question_text,
            q.question_type,
            q.options ? JSON.stringify(q.options) : null,
            q.correct_answer,
            q.points || 1,
            index,
            q.explanation || null,
            q.question_config ? JSON.stringify(q.question_config) : null,
          ]
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
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index',
      [quiz.id]
    );
    res.json({ questions: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/quiz-questions/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function deleteQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const questionResult = await query(
      `SELECT qq.*, c.instructor_id AS owner_instructor_id
       FROM quiz_questions qq
       JOIN quizzes q ON q.id = qq.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE qq.id = $1`,
      [id]
    );
    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = questionResult.rows[0];

    if (req.user.role !== 'admin') {
      const instructorId = await getInstructorIdForUser(req.user.id);
      if (!instructorId || instructorId !== question.owner_instructor_id) {
        return res.status(403).json({ error: 'You do not have permission to modify this question' });
      }
    }

    await query('DELETE FROM quiz_questions WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/quizzes/:id/submit  (student only)
// Body: { answers: { [question_id]: "submitted answer" } }
// Auto-grades by exact match (case-insensitive, trimmed) against correct_answer.
// ----------------------------------------------------------------------------
async function submitQuiz(req, res, next) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit quizzes' });
    }

const { id } = req.params;
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers object is required' });
    }

    const quiz = await loadQuizWithOwner(id);
    if (!quiz || !(await canReadCourse(req.user, quiz))) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (studentResult.rows.length === 0) {
      return res.status(403).json({ error: 'No student profile linked to this account' });
    }
    const studentId = studentResult.rows[0].id;

    const questionsResult = await query(
      'SELECT id, correct_answer, points FROM quiz_questions WHERE quiz_id = $1',
      [id]
    );
    if (questionsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz has no questions, or does not exist' });
    }

    let score = 0;
    let totalPoints = 0;
    for (const q of questionsResult.rows) {
      totalPoints += q.points;
      const submitted = (answers[q.id] || '').toString().trim().toLowerCase();
      const correct = q.correct_answer.toString().trim().toLowerCase();
      if (submitted && submitted === correct) {
        score += q.points;
      }
    }

    const result = await query(
      `INSERT INTO quiz_results (quiz_id, student_id, score, total_points, answers)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, studentId, score, totalPoints, JSON.stringify(answers)]
    );

    const completionPercentage = totalPoints > 0 ? (score / totalPoints) * 100 : 100;
    await upsertLessonProgress(studentId, quiz.course_id, quiz.lesson_id, 'completed', completionPercentage);

    res.status(201).json({ result: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/quizzes/:id/results
// Instructor/admin see everyone's results; a student sees only their own;
// a parent sees only their linked children's results.
// ----------------------------------------------------------------------------
async function getQuizResults(req, res, next) {
  try {
    const { id } = req.params;
    const quiz = await loadQuizWithOwner(id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (!(await canReadCourse(req.user, quiz))) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    let sql = `SELECT qr.*, s.full_name AS student_name FROM quiz_results qr
               JOIN students s ON s.id = qr.student_id WHERE qr.quiz_id = $1`;
    const params = [id];

    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      if (req.user.role === 'instructor') {
        const instructorId = await getInstructorIdForUser(req.user.id);
        if (instructorId !== quiz.owner_instructor_id) {
          return res.status(403).json({ error: 'You do not have permission to view these results' });
        }
      }
    } else if (req.user.role === 'student') {
      const studentResult = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      sql += ' AND qr.student_id = $2';
      params.push(studentResult.rows[0]?.id || 0);
    } else if (req.user.role === 'parent') {
      const parentResult = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
      sql = sql.replace(
        'WHERE qr.quiz_id = $1',
        'WHERE qr.quiz_id = $1 AND s.parent_id = $2'
      );
      params.push(parentResult.rows[0]?.id || 0);
    }

    const result = await query(sql, params);
    res.json({ results: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createQuiz,
  listQuizzesForLesson,
  getQuiz,
  updateQuiz,
  updateQuizStatus,
  deleteQuiz,
  addQuestion,
  replaceQuizQuestions,
  deleteQuestion,
  submitQuiz,
  getQuizResults,
};
