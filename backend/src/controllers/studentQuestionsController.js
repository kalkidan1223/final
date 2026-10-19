/**
 * studentQuestionsController.js
 *
 * Student -> Instructor Question & Answer system.
 *
 * A child can ask their assigned instructor for help on a course or lesson.
 * HARD BUSINESS RULE: a child may hold at most TWO questions whose status is
 * 'WAITING_FOR_ANSWER' at any time, across every course and lesson. Answering
 * a question releases a slot.
 *
 * Concurrency: submission runs inside a transaction that first takes a
 * per-student advisory lock (pg_advisory_xact_lock). Two simultaneous
 * submissions from two browser tabs therefore serialise and can never both
 * cross the limit. The rule is enforced here on the server, never in React.
 */
const { query, pool } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { RESOURCE_TABLES } = require('../utils/learningAccess');

const MAX_PENDING_QUESTIONS = 2;
const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the active student record for the request.
 * Mirrors childController / childNotificationsController: a student is their
 * own record; a parent may act for one of their children via the X-Child-Id
 * header (or ?child_id / body.child_id), else their first child.
 */
async function resolveChild(req) {
  if (req.user.role === 'student') {
    const res = await query(
      `SELECT s.*, ag.name AS age_group_name, ag.min_age, ag.max_age,
              u.email, u.full_name AS user_full_name,
              COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 10)::int AS age
       FROM students s
       JOIN age_groups ag ON ag.id = s.age_group_id
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1 AND s.is_active = TRUE`,
      [req.user.id]
    );
    return res.rows[0] || null;
  }

  if (req.user.role === 'parent') {
    const parentRes = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentRes.rows.length === 0) return null;
    const parentId = parentRes.rows[0].id;

    const requestedChildId = req.headers['x-child-id'] || req.query.child_id || req.body?.child_id;

    let child = null;
    if (requestedChildId) {
      const res = await query(
        `SELECT s.*, ag.name AS age_group_name, ag.min_age, ag.max_age,
                s.full_name AS user_full_name,
                COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 7)::int AS age
         FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         WHERE s.id = $1 AND s.parent_id = $2 AND s.is_active = TRUE`,
        [requestedChildId, parentId]
      );
      if (res.rows.length > 0) child = res.rows[0];
    }

    if (!child) {
      const res = await query(
        `SELECT s.*, ag.name AS age_group_name,
                s.full_name AS user_full_name,
                COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 7)::int AS age
         FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         WHERE s.parent_id = $1 AND s.is_active = TRUE
         ORDER BY s.created_at ASC
         LIMIT 1`,
        [parentId]
      );
      child = res.rows[0] || null;
    }

    return child;
  }

  return null;
}

/** Trim and hard-cap length; whitespace-only input becomes ''. */
function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/** Full question row with child / course / lesson / latest-answer context. */
const QUESTION_SELECT = `
  SELECT
    sq.id,
    sq.student_id,
    sq.instructor_id,
    sq.course_id,
    sq.lesson_id,
    sq.resource_type,
    sq.resource_id,
    sq.question_text,
    sq.status,
    sq.created_at,
    sq.updated_at,
    sq.answered_at,
    s.full_name  AS student_name,
    c.title      AS course_title,
    l.title      AS lesson_title,
    iu.full_name AS instructor_name,
    ans.id              AS answer_id,
    ans.answer_text     AS answer_text,
    ans.created_at      AS answer_created_at,
    ans.updated_at      AS answer_updated_at,
    au.full_name        AS answered_by_name
  FROM student_questions sq
  JOIN students s ON s.id = sq.student_id
  LEFT JOIN courses c ON c.id = sq.course_id
  LEFT JOIN lessons l ON l.id = sq.lesson_id
  LEFT JOIN instructors i ON i.id = sq.instructor_id
  LEFT JOIN users iu ON iu.id = i.user_id
  LEFT JOIN LATERAL (
    SELECT qa.*
    FROM student_question_answers qa
    WHERE qa.question_id = sq.id
    ORDER BY qa.created_at DESC, qa.id DESC
    LIMIT 1
  ) ans ON TRUE
  LEFT JOIN instructors ai ON ai.id = ans.instructor_id
  LEFT JOIN users au ON au.id = ai.user_id
`;

/** Resolve a question's course/lesson context and validate child access. */
async function resolveQuestionContext(child, { course_id, lesson_id, resource_type, resource_id }) {
  let courseRow = null;
  let lessonRow = null;

  if (lesson_id) {
    const r = await query(
      `SELECT l.id AS lesson_id, l.title AS lesson_title,
              c.id AS course_id, c.title AS course_title, c.age_group_id,
              c.status, c.instructor_id
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = $1`,
      [lesson_id]
    );
    if (r.rows.length === 0) {
      throw Object.assign(new Error('That lesson could not be found'), { statusCode: 404 });
    }
    lessonRow = r.rows[0];
    courseRow = r.rows[0];
  } else if (course_id) {
    const r = await query(
      `SELECT c.id AS course_id, c.title AS course_title, c.age_group_id,
              c.status, c.instructor_id
       FROM courses c
       WHERE c.id = $1`,
      [course_id]
    );
    if (r.rows.length === 0) {
      throw Object.assign(new Error('That course could not be found'), { statusCode: 404 });
    }
    courseRow = r.rows[0];
  } else {
    throw Object.assign(new Error('Please choose a course or lesson to ask about'), { statusCode: 400 });
  }

  if (Number(courseRow.age_group_id) !== Number(child.age_group_id)) {
    throw Object.assign(new Error('That course is not part of your learning group'), { statusCode: 403 });
  }
  if (courseRow.status && courseRow.status !== 'published') {
    throw Object.assign(new Error('That lesson is not available right now'), { statusCode: 403 });
  }

  // Optional learning-resource reference. Silently drop it if it does not
  // belong to the lesson, so a child can never mislabel a question.
  let resType = null;
  let resId = null;
  if (resource_type && resource_id && RESOURCE_TABLES[resource_type] && lessonRow) {
    const table = RESOURCE_TABLES[resource_type];
    const check = await query(`SELECT lesson_id FROM ${table} WHERE id = $1`, [resource_id]);
    if (check.rows.length > 0 && Number(check.rows[0].lesson_id) === Number(lessonRow.lesson_id)) {
      resType = resource_type;
      resId = resource_id;
    }
  }

  return {
    courseId: courseRow.course_id,
    lessonId: lessonRow ? lessonRow.lesson_id : null,
    instructorId: courseRow.instructor_id,
    courseTitle: courseRow.course_title,
    lessonTitle: lessonRow ? lessonRow.lesson_title : null,
    resourceType: resType,
    resourceId: resId,
  };
}

/** Count a child's currently waiting questions (the two-question rule). */
function pendingCountRunner(run, studentId) {
  return run(
    `SELECT COUNT(*)::int AS n FROM student_questions
     WHERE student_id = $1 AND status = 'WAITING_FOR_ANSWER'`,
    [studentId]
  );
}

/** Whether the instructor may read/answer a question (owner or active assignee). */
async function canInstructorAccessQuestion(run, instructorId, question) {
  if (Number(question.instructor_id) === Number(instructorId)) return true;
  if (!question.course_id) return false;

  const owner = await run('SELECT instructor_id FROM courses WHERE id = $1', [question.course_id]);
  if (owner.rows[0] && Number(owner.rows[0].instructor_id) === Number(instructorId)) return true;

  const assigned = await run(
    `SELECT 1 FROM instructor_assignments
     WHERE course_id = $1 AND instructor_id = $2 AND status = 'active'
     LIMIT 1`,
    [question.course_id, instructorId]
  );
  return assigned.rows.length > 0;
}

// ===========================================================================
// CHILD ENDPOINTS
// ===========================================================================

// POST /api/child/questions
async function submitQuestion(req, res, next) {
  const client = await pool.connect();
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const raw = req.body?.question_text ?? req.body?.text;
    const questionText = cleanText(raw, MAX_QUESTION_LENGTH);
    if (!questionText) {
      return res.status(400).json({ error: 'Write your question here. What do you need help understanding?', code: 'QUESTION_EMPTY' });
    }
    if (typeof raw === 'string' && raw.trim().length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ error: `Your question is too long. Please keep it under ${MAX_QUESTION_LENGTH} letters.`, code: 'QUESTION_TOO_LONG' });
    }

    const ctx = await resolveQuestionContext(child, {
      course_id: req.body?.course_id,
      lesson_id: req.body?.lesson_id,
      resource_type: req.body?.resource_type,
      resource_id: req.body?.resource_id,
    });

    const instructorUserRes = await query('SELECT user_id FROM instructors WHERE id = $1', [ctx.instructorId]);
    const instructorUserId = instructorUserRes.rows[0]?.user_id || null;

    await client.query('BEGIN');

    // Serialise submissions for this child. Keying on the student id means two
    // simultaneous requests cannot both observe "1 pending" and both insert.
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('student_questions:' || $1::text, 0))`,
      [child.id]
    );

    const pendingRes = await pendingCountRunner((sql, p) => client.query(sql, p), child.id);
    const pending = pendingRes.rows[0].n;

    if (pending >= MAX_PENDING_QUESTIONS) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'You already have two questions waiting for your teacher. Please wait for an answer before asking another question.',
        code: 'QUESTION_LIMIT_REACHED',
        pending_count: pending,
        limit: MAX_PENDING_QUESTIONS,
      });
    }

    const ins = await client.query(
      `INSERT INTO student_questions
         (student_id, instructor_id, course_id, lesson_id, resource_type, resource_id, question_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [child.id, ctx.instructorId, ctx.courseId, ctx.lessonId, ctx.resourceType, ctx.resourceId, questionText]
    );
    const question = ins.rows[0];

    // Notify the assigned instructor, in the same transaction so a question is
    // never saved without its alert.
    if (instructorUserId) {
      const where = [ctx.courseTitle, ctx.lessonTitle].filter(Boolean).join(' > ');
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, related_question_id)
         VALUES ($1, 'question', $2, $3, $4)`,
        [
          instructorUserId,
          `New question from ${child.full_name}`,
          `${child.full_name} asked: "${questionText.slice(0, 120)}"${where ? ` (${where})` : ''}`,
          question.id,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      question: { ...question, course_title: ctx.courseTitle, lesson_title: ctx.lessonTitle },
      pending_count: pending + 1,
      limit: MAX_PENDING_QUESTIONS,
      message: 'Your question has been sent to your teacher!',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/child/questions
async function listMyQuestions(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const result = await query(
      `${QUESTION_SELECT}
       WHERE sq.student_id = $1
       ORDER BY (sq.status = 'WAITING_FOR_ANSWER') DESC, sq.created_at DESC`,
      [child.id]
    );

    const countsRes = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'WAITING_FOR_ANSWER')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'ANSWERED')::int AS answered
       FROM student_questions
       WHERE student_id = $1`,
      [child.id]
    );
    const counts = countsRes.rows[0];

    res.json({
      questions: result.rows,
      counts: { total: counts.total, pending: counts.pending, answered: counts.answered },
      limit: MAX_PENDING_QUESTIONS,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/questions/pending-count
async function getPendingCount(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const pendingRes = await pendingCountRunner(query, child.id);
    const pending = pendingRes.rows[0].n;

    res.json({
      pending_count: pending,
      limit: MAX_PENDING_QUESTIONS,
      can_ask: pending < MAX_PENDING_QUESTIONS,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/questions/:questionId
async function getMyQuestion(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const { questionId } = req.params;
    const result = await query(
      `${QUESTION_SELECT} WHERE sq.id = $1 AND sq.student_id = $2`,
      [questionId, child.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const answers = await query(
      `SELECT qa.id, qa.answer_text, qa.created_at, qa.updated_at, u.full_name AS instructor_name
       FROM student_question_answers qa
       JOIN instructors i ON i.id = qa.instructor_id
       JOIN users u ON u.id = i.user_id
       WHERE qa.question_id = $1
       ORDER BY qa.created_at ASC, qa.id ASC`,
      [questionId]
    );

    res.json({ question: result.rows[0], answers: answers.rows });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// INSTRUCTOR ENDPOINTS
// ===========================================================================

/** SQL fragment restricting a question to the instructor's authorised scope. */
const INSTRUCTOR_SCOPE = `
  (
    sq.instructor_id = $1
    OR EXISTS (
      SELECT 1 FROM instructor_assignments ia
      WHERE ia.course_id = sq.course_id
        AND ia.instructor_id = $1
        AND ia.status = 'active'
    )
  )
`;

// GET /api/instructor/questions/summary
async function getInstructorSummary(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) return res.status(403).json({ error: 'Instructor profile not found' });

    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE sq.status = 'WAITING_FOR_ANSWER')::int AS total_unanswered,
         COUNT(*) FILTER (WHERE sq.created_at::date = CURRENT_DATE)::int AS received_today,
         COUNT(*) FILTER (WHERE sq.status = 'ANSWERED')::int AS answered,
         COUNT(*) FILTER (WHERE sq.status = 'WAITING_FOR_ANSWER')::int AS awaiting_response
       FROM student_questions sq
       WHERE ${INSTRUCTOR_SCOPE}`,
      [instructorId]
    );

    res.json({ summary: rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructor/questions
async function listInstructorQuestions(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) return res.status(403).json({ error: 'Instructor profile not found' });

    const { status, course_id, lesson_id, date } = req.query;

    const params = [instructorId];
    const filters = [INSTRUCTOR_SCOPE];

    if (status === 'waiting') {
      filters.push(`sq.status = 'WAITING_FOR_ANSWER'`);
    } else if (status === 'answered') {
      filters.push(`sq.status = 'ANSWERED'`);
    }

    if (course_id) {
      params.push(course_id);
      filters.push(`sq.course_id = $${params.length}`);
    }
    if (lesson_id) {
      params.push(lesson_id);
      filters.push(`sq.lesson_id = $${params.length}`);
    }
    if (date) {
      params.push(date);
      filters.push(`sq.created_at::date = $${params.length}::date`);
    }

    const { rows } = await query(
      `${QUESTION_SELECT}
       WHERE ${filters.join(' AND ')}
       ORDER BY (sq.status = 'WAITING_FOR_ANSWER') DESC, sq.created_at ASC`,
      params
    );

    res.json({ questions: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructor/questions/:questionId
async function getInstructorQuestion(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) return res.status(403).json({ error: 'Instructor profile not found' });

    const { questionId } = req.params;
    const result = await query(`${QUESTION_SELECT} WHERE sq.id = $1`, [questionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = result.rows[0];
    const allowed = await canInstructorAccessQuestion(query, instructorId, question);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to view this question' });
    }

    const answers = await query(
      `SELECT qa.id, qa.answer_text, qa.created_at, qa.updated_at, u.full_name AS instructor_name
       FROM student_question_answers qa
       JOIN instructors i ON i.id = qa.instructor_id
       JOIN users u ON u.id = i.user_id
       WHERE qa.question_id = $1
       ORDER BY qa.created_at ASC, qa.id ASC`,
      [questionId]
    );

    // Light, authorised learning context for the lesson the child asked about.
    let lessonContext = null;
    if (question.lesson_id) {
      const ctx = await query(
        `SELECT l.title, l.description, l.learning_objectives
         FROM lessons l WHERE l.id = $1`,
        [question.lesson_id]
      );
      lessonContext = ctx.rows[0] || null;
    }

    res.json({ question, answers: answers.rows, lesson_context: lessonContext });
  } catch (err) {
    next(err);
  }
}

// POST /api/instructor/questions/:questionId/answer
async function answerQuestion(req, res, next) {
  const client = await pool.connect();
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) return res.status(403).json({ error: 'Instructor profile not found' });

    const { questionId } = req.params;
    const raw = req.body?.answer_text ?? req.body?.text;
    const answerText = cleanText(raw, MAX_ANSWER_LENGTH);
    if (!answerText) {
      return res.status(400).json({ error: 'Please write an answer before submitting.', code: 'ANSWER_EMPTY' });
    }
    if (typeof raw === 'string' && raw.trim().length > MAX_ANSWER_LENGTH) {
      return res.status(400).json({ error: `Your answer is too long. Please keep it under ${MAX_ANSWER_LENGTH} characters.`, code: 'ANSWER_TOO_LONG' });
    }

    await client.query('BEGIN');

    const qRes = await client.query(
      `SELECT * FROM student_questions WHERE id = $1 FOR UPDATE`,
      [questionId]
    );
    if (qRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = qRes.rows[0];

    const allowed = await canInstructorAccessQuestion((sql, p) => client.query(sql, p), instructorId, question);
    if (!allowed) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You do not have permission to answer this question' });
    }

    // Row lock + status guard make double-clicks / retries idempotent: only the
    // first request flips WAITING_FOR_ANSWER -> ANSWERED.
    if (question.status !== 'WAITING_FOR_ANSWER') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'This question has already been answered.',
        code: 'QUESTION_ALREADY_ANSWERED',
      });
    }

    const ansRes = await client.query(
      `INSERT INTO student_question_answers (question_id, instructor_id, answer_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [questionId, instructorId, answerText]
    );

    const updRes = await client.query(
      `UPDATE student_questions
       SET status = 'ANSWERED', answered_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [questionId]
    );

    // Notify the child in the same transaction so an answer is never saved
    // without its alert.
    await client.query(
      `INSERT INTO child_notifications
         (student_id, type, title, message, related_course_id, related_lesson_id, related_question_id)
       VALUES ($1, 'question_answered', $2, $3, $4, $5, $6)`,
      [
        question.student_id,
        'Your teacher has answered your question!',
        'Your teacher has answered your question! Open My Questions to read the answer.',
        question.course_id,
        question.lesson_id,
        question.id,
      ]
    );

    await client.query('COMMIT');

    const fresh = await query(`${QUESTION_SELECT} WHERE sq.id = $1`, [questionId]);

    res.json({
      question: fresh.rows[0],
      answer: ansRes.rows[0],
      status: updRes.rows[0].status,
      message: 'Answer sent!',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

// PATCH /api/instructor/questions/:questionId/answer  (edit an existing answer)
async function updateAnswer(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) return res.status(403).json({ error: 'Instructor profile not found' });

    const { questionId } = req.params;
    const raw = req.body?.answer_text ?? req.body?.text;
    const answerText = cleanText(raw, MAX_ANSWER_LENGTH);
    if (!answerText) {
      return res.status(400).json({ error: 'Please write an answer before saving.', code: 'ANSWER_EMPTY' });
    }

    const qRes = await query('SELECT * FROM student_questions WHERE id = $1', [questionId]);
    if (qRes.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const question = qRes.rows[0];

    const allowed = await canInstructorAccessQuestion(query, instructorId, question);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to edit this answer' });
    }
    if (question.status !== 'ANSWERED') {
      return res.status(409).json({ error: 'This question has not been answered yet.', code: 'QUESTION_NOT_ANSWERED' });
    }

    // Update the most recent answer, preserving its original created_at so the
    // conversation history keeps an accurate first-answered timestamp.
    const upd = await query(
      `UPDATE student_question_answers
       SET answer_text = $1, updated_at = now()
       WHERE id = (
         SELECT id FROM student_question_answers
         WHERE question_id = $2
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       )
       RETURNING *`,
      [answerText, questionId]
    );

    if (upd.rows.length === 0) {
      return res.status(404).json({ error: 'No answer found to edit' });
    }

    await query('UPDATE student_questions SET updated_at = now() WHERE id = $1', [questionId]);

    const fresh = await query(`${QUESTION_SELECT} WHERE sq.id = $1`, [questionId]);

    res.json({ question: fresh.rows[0], answer: upd.rows[0], message: 'Answer updated!' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // child
  submitQuestion,
  listMyQuestions,
  getPendingCount,
  getMyQuestion,
  // instructor
  getInstructorSummary,
  listInstructorQuestions,
  getInstructorQuestion,
  answerQuestion,
  updateAnswer,
  // exported for reuse / tests
  MAX_PENDING_QUESTIONS,
};
