const { query } = require('../config/db');

/**
 * Helper: Resolve the active student record based on whether the logged in user
 * is a Category 2 student (direct account) or a Category 1 parent-managed child.
 */
async function resolveChild(req) {
  if (req.user.role === 'student') {
    const res = await query(
      `SELECT s.*, gl.name as grade_level_name, gl.code as grade_code, gl.min_age, gl.max_age,
              u.email, u.full_name as user_full_name,
              p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone,
              COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 10)::int as age
       FROM students s
       JOIN grade_levels gl ON gl.id = s.grade_level_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN users pu ON pu.id = p.user_id
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
        `SELECT s.*, gl.name as grade_level_name, gl.code as grade_code, gl.min_age, gl.max_age,
                s.full_name as user_full_name,
                p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone,
                COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 7)::int as age
         FROM students s
         JOIN grade_levels gl ON gl.id = s.grade_level_id
         LEFT JOIN parents p ON p.id = s.parent_id
         LEFT JOIN users pu ON pu.id = p.user_id
         WHERE s.id = $1 AND s.parent_id = $2 AND s.is_active = TRUE`,
        [requestedChildId, parentId]
      );
      if (res.rows.length > 0) {
        child = res.rows[0];
      }
    }

    if (!child) {
      const res = await query(
        `SELECT s.*, gl.name as grade_level_name, gl.code as grade_code, gl.min_age, gl.max_age,
                s.full_name as user_full_name,
                p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone,
                COALESCE(EXTRACT(YEAR FROM age(s.date_of_birth)), 7)::int as age
         FROM students s
         JOIN grade_levels gl ON gl.id = s.grade_level_id
         LEFT JOIN parents p ON p.id = s.parent_id
         LEFT JOIN users pu ON pu.id = p.user_id
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

// GET /api/child/results/summary
async function getResultsSummary(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get quiz results count
    const quizCountRes = await query(
      'SELECT COUNT(*) as count FROM quiz_results WHERE student_id = $1',
      [child.id]
    );

    // Get activity submissions count
    const activityCountRes = await query(
      'SELECT COUNT(*) as count FROM activity_submissions WHERE student_id = $1',
      [child.id]
    );

    // Get average score from quizzes
    const avgScoreRes = await query(
      'SELECT AVG(percentage) as avg_score FROM quiz_results WHERE student_id = $1 AND percentage IS NOT NULL',
      [child.id]
    );

    const avgScore = avgScoreRes.rows[0].avg_score 
      ? Math.round(avgScoreRes.rows[0].avg_score * 10) / 10 
      : 0;

    res.json({
      quiz_count: parseInt(quizCountRes.rows[0].count),
      activity_count: parseInt(activityCountRes.rows[0].count),
      average_score: avgScore
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/results/activities
async function getActivityResults(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { course_id, lesson_id, status } = req.query;

    let queryText = `
      SELECT 
        asub.id as submission_id,
        asub.activity_id,
        a.title as activity_title,
        a.activity_type,
        a.instructions,
        a.max_score,
        asub.score,
        asub.percentage,
        asub.status,
        asub.feedback,
        asub.submitted_at,
        asub.reviewed_at,
        asub.submitted_by,
        l.id as lesson_id,
        l.title as lesson_title,
        l.order_index as lesson_order,
        c.id as course_id,
        c.title as course_title,
        i.id as instructor_id,
        u.full_name as instructor_name
      FROM activity_submissions asub
      JOIN activities a ON a.id = asub.activity_id
      JOIN lessons l ON l.id = a.lesson_id
      JOIN courses c ON c.id = l.course_id
      JOIN instructors i ON i.id = a.instructor_id
      JOIN users u ON u.id = i.user_id
      WHERE asub.student_id = $1
    `;

    const params = [child.id];
    let paramIndex = 2;

    if (course_id) {
      queryText += ` AND c.id = $${paramIndex}`;
      params.push(course_id);
      paramIndex++;
    }

    if (lesson_id) {
      queryText += ` AND l.id = $${paramIndex}`;
      params.push(lesson_id);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND asub.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ' ORDER BY asub.submitted_at DESC';

    const result = await query(queryText, params);

    res.json({
      activity_results: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/results/activities/:submissionId
async function getActivityResultDetail(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { submissionId } = req.params;

    const result = await query(
      `SELECT 
        asub.id as submission_id,
        asub.activity_id,
        a.title as activity_title,
        a.activity_type,
        a.instructions,
        a.resource_url,
        a.max_score,
        asub.score,
        asub.percentage,
        asub.status,
        asub.feedback,
        asub.submission_url,
        asub.submission_text,
        asub.submitted_at,
        asub.reviewed_at,
        asub.submitted_by,
        asub.reviewed_by,
        l.id as lesson_id,
        l.title as lesson_title,
        l.order_index as lesson_order,
        c.id as course_id,
        c.title as course_title,
        i.id as instructor_id,
        u.full_name as instructor_name
      FROM activity_submissions asub
      JOIN activities a ON a.id = asub.activity_id
      JOIN lessons l ON l.id = a.lesson_id
      JOIN courses c ON c.id = l.course_id
      JOIN instructors i ON i.id = a.instructor_id
      JOIN users u ON u.id = i.user_id
      WHERE asub.id = $1 AND asub.student_id = $2`,
      [submissionId, child.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity result not found' });
    }

    res.json({
      activity_result: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/results/quizzes
async function getQuizResults(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { course_id, lesson_id } = req.query;

    let queryText = `
      SELECT 
        qr.id as result_id,
        qr.quiz_id,
        q.title as quiz_title,
        q.description as quiz_description,
        q.time_limit_seconds,
        qr.score,
        qr.total_points,
        qr.percentage,
        qr.is_passed,
        qr.passing_score,
        qr.attempt_number,
        qr.submitted_at,
        qr.answers,
        l.id as lesson_id,
        l.title as lesson_title,
        l.order_index as lesson_order,
        c.id as course_id,
        c.title as course_title
      FROM quiz_results qr
      JOIN quizzes q ON q.id = qr.quiz_id
      JOIN lessons l ON l.id = q.lesson_id
      JOIN courses c ON c.id = l.course_id
      WHERE qr.student_id = $1
    `;

    const params = [child.id];
    let paramIndex = 2;

    if (course_id) {
      queryText += ` AND c.id = $${paramIndex}`;
      params.push(course_id);
      paramIndex++;
    }

    if (lesson_id) {
      queryText += ` AND l.id = $${paramIndex}`;
      params.push(lesson_id);
      paramIndex++;
    }

    queryText += ' ORDER BY qr.submitted_at DESC';

    const result = await query(queryText, params);

    res.json({
      quiz_results: result.rows
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/results/quizzes/:resultId
async function getQuizResultDetail(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const { resultId } = req.params;

    const result = await query(
      `SELECT 
        qr.id as result_id,
        qr.quiz_id,
        q.title as quiz_title,
        q.description as quiz_description,
        q.time_limit_seconds,
        qr.score,
        qr.total_points,
        qr.percentage,
        qr.is_passed,
        qr.passing_score,
        qr.attempt_number,
        qr.submitted_at,
        qr.answers,
        l.id as lesson_id,
        l.title as lesson_title,
        l.order_index as lesson_order,
        c.id as course_id,
        c.title as course_title
      FROM quiz_results qr
      JOIN quizzes q ON q.id = qr.quiz_id
      JOIN lessons l ON l.id = q.lesson_id
      JOIN courses c ON c.id = l.course_id
      WHERE qr.id = $1 AND qr.student_id = $2`,
      [resultId, child.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz result not found' });
    }

    // Get quiz questions for detailed view
    const questions = await query(
      `SELECT 
        qq.id,
        qq.question_text,
        qq.question_type,
        qq.options,
        qq.correct_answer,
        qq.points,
        qq.order_index
      FROM quiz_questions qq
      WHERE qq.quiz_id = $1
      ORDER BY qq.order_index`,
      [result.rows[0].quiz_id]
    );

    res.json({
      quiz_result: result.rows[0],
      questions: questions.rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getResultsSummary,
  getActivityResults,
  getActivityResultDetail,
  getQuizResults,
  getQuizResultDetail
};
