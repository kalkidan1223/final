const { query } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');

// ----------------------------------------------------------------------------
// GET /api/instructor/results/overview
// Get aggregated statistics for instructor's students
// ----------------------------------------------------------------------------
async function getResultsOverview(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) {
      return res.status(403).json({ error: 'Not an instructor' });
    }

    // Get courses taught by this instructor
    const coursesRes = await query(
      `SELECT DISTINCT c.id 
       FROM courses c
       JOIN instructor_assignments ia ON ia.course_id = c.id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'`,
      [instructorId]
    );
    
    const courseIds = coursesRes.rows.map(r => r.id);
    if (courseIds.length === 0) {
      return res.json({
        total_students: 0,
        total_submissions: 0,
        pending_reviews: 0,
        total_quizzes_taken: 0,
        average_quiz_score: 0,
        average_activity_score: 0
      });
    }

    // Aggregate statistics
    const [studentsRes, submissionsRes, pendingRes, quizzesRes, avgQuizRes, avgActivityRes] = await Promise.all([
      // Total students enrolled in instructor's courses
      query(
        `SELECT COUNT(DISTINCT s.id)::int as count
         FROM students s
         JOIN progress p ON p.student_id = s.id
         WHERE p.course_id = ANY($1) AND s.is_active = TRUE`,
        [courseIds]
      ),
      
      // Total activity submissions
      query(
        `SELECT COUNT(*)::int as count
         FROM activity_submissions asub
         JOIN activities a ON a.id = asub.activity_id
         WHERE a.instructor_id = $1`,
        [instructorId]
      ),
      
      // Pending reviews
      query(
        `SELECT COUNT(*)::int as count
         FROM activity_submissions asub
         JOIN activities a ON a.id = asub.activity_id
         WHERE a.instructor_id = $1 AND asub.status = 'pending'`,
        [instructorId]
      ),
      
      // Total quizzes taken
      query(
        `SELECT COUNT(*)::int as count
         FROM quiz_results qr
         JOIN quizzes q ON q.id = qr.quiz_id
         JOIN lessons l ON l.id = q.lesson_id
         WHERE l.course_id = ANY($1)`,
        [courseIds]
      ),
      
      // Average quiz score
      query(
        `SELECT AVG(qr.percentage)::numeric(5,2) as avg_score
         FROM quiz_results qr
         JOIN quizzes q ON q.id = qr.quiz_id
         JOIN lessons l ON l.id = q.lesson_id
         WHERE l.course_id = ANY($1) AND qr.percentage IS NOT NULL`,
        [courseIds]
      ),
      
      // Average activity score
      query(
        `SELECT AVG(asub.percentage)::numeric(5,2) as avg_score
         FROM activity_submissions asub
         JOIN activities a ON a.id = asub.activity_id
         WHERE a.instructor_id = $1 AND asub.percentage IS NOT NULL`,
        [instructorId]
      )
    ]);

    res.json({
      total_students: studentsRes.rows[0].count,
      total_submissions: submissionsRes.rows[0].count,
      pending_reviews: pendingRes.rows[0].count,
      total_quizzes_taken: quizzesRes.rows[0].count,
      average_quiz_score: parseFloat(avgQuizRes.rows[0].avg_score) || 0,
      average_activity_score: parseFloat(avgActivityRes.rows[0].avg_score) || 0
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/instructor/results/activity-submissions
// Get all activity submissions for instructor's activities
// ----------------------------------------------------------------------------
async function getActivitySubmissions(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) {
      return res.status(403).json({ error: 'Not an instructor' });
    }

    const { status, course_id, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT 
        asub.id,
        asub.activity_id,
        asub.student_id,
        asub.status,
        asub.score,
        asub.percentage,
        asub.feedback,
        asub.submitted_at,
        asub.reviewed_at,
        asub.submission_url,
        asub.submission_text,
        s.full_name as student_name,
        a.title as activity_title,
        a.max_score as activity_max_score,
        l.title as lesson_title,
        c.title as course_title,
        c.id as course_id
      FROM activity_submissions asub
      JOIN activities a ON a.id = asub.activity_id
      JOIN students s ON s.id = asub.student_id
      JOIN lessons l ON l.id = a.lesson_id
      JOIN courses c ON c.id = l.course_id
      WHERE a.instructor_id = $1
    `;
    
    const params = [instructorId];
    let paramIndex = 2;
    
    if (status) {
      sql += ` AND asub.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (course_id) {
      sql += ` AND c.id = $${paramIndex}`;
      params.push(course_id);
      paramIndex++;
    }
    
    sql += ` ORDER BY asub.submitted_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await query(sql, params);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*)::int as total
      FROM activity_submissions asub
      JOIN activities a ON a.id = asub.activity_id
      JOIN courses c ON c.id = a.course_id
      WHERE a.instructor_id = $1
    `;
    const countParams = [instructorId];
    let countIndex = 2;
    
    if (status) {
      countSql += ` AND asub.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }
    
    if (course_id) {
      countSql += ` AND c.id = $${countIndex}`;
      countParams.push(course_id);
    }
    
    const countResult = await query(countSql, countParams);

    res.json({
      submissions: result.rows,
      total: countResult.rows[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/instructor/results/quiz-results
// Get all quiz results for instructor's courses
// ----------------------------------------------------------------------------
async function getQuizResults(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) {
      return res.status(403).json({ error: 'Not an instructor' });
    }

    const { course_id, quiz_id, limit = 50, offset = 0 } = req.query;
    
    // Get courses taught by this instructor
    const coursesRes = await query(
      `SELECT DISTINCT c.id 
       FROM courses c
       JOIN instructor_assignments ia ON ia.course_id = c.id
       WHERE ia.instructor_id = $1 AND ia.status = 'active'`,
      [instructorId]
    );
    
    const courseIds = coursesRes.rows.map(r => r.id);
    if (courseIds.length === 0) {
      return res.json({ results: [], total: 0, limit: parseInt(limit), offset: parseInt(offset) });
    }
    
    let sql = `
      SELECT 
        qr.id,
        qr.quiz_id,
        qr.student_id,
        qr.score,
        qr.total_points,
        qr.percentage,
        qr.submitted_at,
        qr.answers,
        s.full_name as student_name,
        q.title as quiz_title,
        q.passing_score as quiz_passing_score,
        l.title as lesson_title,
        c.title as course_title,
        c.id as course_id,
        CASE WHEN qr.percentage >= q.passing_score THEN true ELSE false END as passed
      FROM quiz_results qr
      JOIN quizzes q ON q.id = qr.quiz_id
      JOIN students s ON s.id = qr.student_id
      JOIN lessons l ON l.id = q.lesson_id
      JOIN courses c ON c.id = l.course_id
      WHERE c.id = ANY($1)
    `;
    
    const params = [courseIds];
    let paramIndex = 2;
    
    if (course_id) {
      sql += ` AND c.id = $${paramIndex}`;
      params.push(course_id);
      paramIndex++;
    }
    
    if (quiz_id) {
      sql += ` AND q.id = $${paramIndex}`;
      params.push(quiz_id);
      paramIndex++;
    }
    
    sql += ` ORDER BY qr.submitted_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await query(sql, params);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*)::int as total
      FROM quiz_results qr
      JOIN quizzes q ON q.id = qr.quiz_id
      JOIN lessons l ON l.id = q.lesson_id
      JOIN courses c ON c.id = l.course_id
      WHERE c.id = ANY($1)
    `;
    const countParams = [courseIds];
    let countIndex = 2;
    
    if (course_id) {
      countSql += ` AND c.id = $${countIndex}`;
      countParams.push(course_id);
      countIndex++;
    }
    
    if (quiz_id) {
      countSql += ` AND q.id = $${countIndex}`;
      countParams.push(quiz_id);
    }
    
    const countResult = await query(countSql, countParams);

    res.json({
      results: result.rows,
      total: countResult.rows[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/instructor/results/student/:studentId
// Get detailed results for a specific student
// ----------------------------------------------------------------------------
async function getStudentResults(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) {
      return res.status(403).json({ error: 'Not an instructor' });
    }

    const { studentId } = req.params;
    
    // Verify instructor teaches this student
    const accessCheck = await query(
      `SELECT 1 
       FROM students s
       JOIN progress p ON p.student_id = s.id
       JOIN courses c ON c.id = p.course_id
       JOIN instructor_assignments ia ON ia.course_id = c.id
       WHERE s.id = $1 AND ia.instructor_id = $2 AND ia.status = 'active'
       LIMIT 1`,
      [studentId, instructorId]
    );
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not teach this student' });
    }

    // Get student info
    const studentRes = await query(
      'SELECT id, full_name, age_group_id FROM students WHERE id = $1',
      [studentId]
    );
    
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentRes.rows[0];

    // Get activity submissions
    const submissionsRes = await query(
      `SELECT 
        asub.*,
        a.title as activity_title,
        a.max_score,
        l.title as lesson_title,
        c.title as course_title
       FROM activity_submissions asub
       JOIN activities a ON a.id = asub.activity_id
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE asub.student_id = $1 AND a.instructor_id = $2
       ORDER BY asub.submitted_at DESC`,
      [studentId, instructorId]
    );

    // Get quiz results
    const quizzesRes = await query(
      `SELECT 
        qr.*,
        q.title as quiz_title,
        q.passing_score,
        l.title as lesson_title,
        c.title as course_title,
        CASE WHEN qr.percentage >= q.passing_score THEN true ELSE false END as passed
       FROM quiz_results qr
       JOIN quizzes q ON q.id = qr.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN instructor_assignments ia ON ia.course_id = c.id
       WHERE qr.student_id = $1 AND ia.instructor_id = $2 AND ia.status = 'active'
       ORDER BY qr.submitted_at DESC`,
      [studentId, instructorId]
    );

    res.json({
      student,
      activity_submissions: submissionsRes.rows,
      quiz_results: quizzesRes.rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getResultsOverview,
  getActivitySubmissions,
  getQuizResults,
  getStudentResults
};
