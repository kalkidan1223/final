const { query } = require('../config/db');

// Helper: Get student record from user
async function getStudentFromUser(userId) {
  const result = await query('SELECT * FROM students WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

// GET /api/students/profile - Get logged-in student profile
async function getProfile(req, res, next) {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT s.*, u.email, u.full_name, u.phone, ag.name as age_group_name, 
              ag.min_age, ag.max_age, p.user_id as parent_user_id, pu.full_name as parent_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN age_groups ag ON ag.id = s.age_group_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN users pu ON pu.id = p.user_id
       WHERE s.id = $1`,
      [student.id]
    );

    res.json({ student: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/dashboard - Dashboard summary data
async function getDashboard(req, res, next) {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get dashboard statistics
    const stats = await query(
      `SELECT 
        (SELECT COUNT(DISTINCT c.id)::int 
         FROM courses c 
         WHERE c.age_group_id = $2 AND c.status = 'published') as total_courses,
        (SELECT COUNT(DISTINCT l.id)::int 
         FROM lessons l 
         JOIN courses c ON c.id = l.course_id 
         WHERE c.age_group_id = $2 AND c.status = 'published') as total_lessons,
        (SELECT COUNT(*)::int 
         FROM activity_submissions 
         WHERE student_id = $1) as completed_activities,
        (SELECT COUNT(*)::int 
         FROM quiz_results 
         WHERE student_id = $1) as completed_quizzes,
        (SELECT COUNT(*)::int 
         FROM activity_submissions 
         WHERE student_id = $1 AND status = 'graded') as graded_activities,
        (SELECT COUNT(*)::int 
         FROM notifications 
         WHERE user_id = $3 AND is_read = FALSE) as unread_notifications`,
      [student.id, student.age_group_id, req.user.id]
    );

    // Get continue learning (last accessed incomplete lesson)
    const continueLearning = await query(
      `SELECT l.id, l.title, l.description, c.id as course_id, c.title as course_title,
              c.thumbnail_url, ag.name as age_group_name
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN age_groups ag ON ag.id = c.age_group_id
       WHERE c.age_group_id = $1 AND c.status = 'published'
       ORDER BY l.created_at DESC
       LIMIT 1`,
      [student.age_group_id]
    );

    // Get recent courses
    const recentCourses = await query(
      `SELECT c.id, c.title, c.description, c.thumbnail_url, c.status,
              ag.name as age_group_name, u.full_name as instructor_name,
              COUNT(DISTINCT l.id)::int as lesson_count
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN lessons l ON l.course_id = c.id
       WHERE c.age_group_id = $1 AND c.status = 'published'
       GROUP BY c.id, ag.name, u.full_name
       ORDER BY c.created_at DESC
       LIMIT 6`,
      [student.age_group_id]
    );

    // Get learning streak
    const today = new Date().toISOString().split('T')[0];
    const streakResult = await query(
      `SELECT COUNT(DISTINCT DATE(submitted_at)) as streak_days
       FROM (
         SELECT submitted_at FROM activity_submissions WHERE student_id = $1
         UNION ALL
         SELECT submitted_at FROM quiz_results WHERE student_id = $1
       ) activities
       WHERE DATE(submitted_at) >= DATE($2) - INTERVAL '30 days'`,
      [student.id, today]
    );

    res.json({
      student_name: student.full_name || null,
      stats: stats.rows[0],
      continue_learning: continueLearning.rows[0] || null,
      recent_courses: recentCourses.rows,
      learning_streak: streakResult.rows[0]?.streak_days || 0,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/courses - List available courses for student's age group
async function listCourses(req, res, next) {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT c.id, c.title, c.description, c.thumbnail_url, c.status,
              ag.name as age_group_name, u.full_name as instructor_name,
              COUNT(DISTINCT l.id)::int as lesson_count,
              COUNT(DISTINCT a.id)::int as activity_count,
              COUNT(DISTINCT q.id)::int as quiz_count
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN activities a ON a.lesson_id = l.id
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       WHERE c.age_group_id = $1 AND c.status = 'published'
       GROUP BY c.id, ag.name, u.full_name
       ORDER BY c.created_at DESC`,
      [student.age_group_id]
    );

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/courses/:id - Get course details with lessons
async function getCourse(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get course details
    const courseResult = await query(
      `SELECT c.*, ag.name as age_group_name, u.full_name as instructor_name
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       WHERE c.id = $1 AND c.age_group_id = $2 AND c.status = 'published'`,
      [id, student.age_group_id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not accessible' });
    }

    // Get lessons for this course
    const lessonsResult = await query(
      `SELECT l.*, 
              COUNT(DISTINCT lm.id)::int as material_count,
              COUNT(DISTINCT a.id)::int as activity_count,
              COUNT(DISTINCT q.id)::int as quiz_count
       FROM lessons l
       LEFT JOIN learning_materials lm ON lm.lesson_id = l.id
       LEFT JOIN activities a ON a.lesson_id = l.id
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       WHERE l.course_id = $1
       GROUP BY l.id
       ORDER BY l.order_index, l.created_at`,
      [id]
    );

    res.json({
      course: courseResult.rows[0],
      lessons: lessonsResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/lessons/:id - Get lesson content
async function getLesson(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get lesson with course info for validation
    const lessonResult = await query(
      `SELECT l.*, c.age_group_id, c.title as course_title, c.id as course_id
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = $1`,
      [id]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonResult.rows[0];

    // Verify student has access (same age group)
    if (lesson.age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'You do not have access to this lesson' });
    }

    // Get learning materials (all types in one table)
    const materials = await query(
      `SELECT id, lesson_id, type, title, file_url, description, display_order, thumbnail_url,
              created_at,
              (EXISTS (SELECT 1 FROM material_listens ml WHERE ml.material_id = lm.id AND ml.student_id = $2)) as listened
       FROM learning_materials lm
       WHERE lesson_id = $1 AND status = 'active'
       ORDER BY display_order, created_at`,
      [id, student.id]
    );

    // Get activities
    const activities = await query(
      `SELECT a.*, 
              asub.id as submission_id, asub.status as submission_status,
              asub.score, asub.feedback
       FROM activities a
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $2
       WHERE a.lesson_id = $1
       ORDER BY a.created_at`,
      [id, student.id]
    );

    // Get quizzes
    const quizzes = await query(
      `SELECT q.*,
              qr.id as result_id, qr.score, qr.total_points, qr.submitted_at as result_submitted_at
       FROM quizzes q
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = $2
       WHERE q.lesson_id = $1
       ORDER BY q.created_at`,
      [id, student.id]
    );

    res.json({
      lesson,
      materials: materials.rows,
      activities: activities.rows,
      quizzes: quizzes.rows,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/activities/:id - Get activity details}

// GET /api/students/quizzes - List all quizzes across the student's courses
async function listAllQuizzes(req, res, next) {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT q.id, q.title, q.description, q.time_limit_seconds, q.attempt_limit, q.status,
              l.id as lesson_id, l.title as lesson_title,
              c.id as course_id, c.title as course_title,
              (SELECT COUNT(*)::int FROM quiz_results qrc WHERE qrc.quiz_id = q.id AND qrc.student_id = $1) as attempts,
              (SELECT MAX(qrl.score) FROM quiz_results qrl WHERE qrl.quiz_id = q.id AND qrl.student_id = $1) as best_score
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE c.age_group_id = $2 AND c.status = 'published'
       ORDER BY c.created_at DESC, l.order_index, q.created_at`,
      [student.id, student.age_group_id]
    );

    res.json({ quizzes: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/materials/:id - Get a single material with listening status
async function getMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT lm.*, l.course_id, c.age_group_id,
              (EXISTS (SELECT 1 FROM material_listens ml WHERE ml.material_id = lm.id AND ml.student_id = $2)) as listened
       FROM learning_materials lm
       JOIN lessons l ON l.id = lm.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE lm.id = $1`,
      [id, student.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = result.rows[0];

    if (material.age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ material });
  } catch (err) {
    next(err);
  }
}

// POST /api/students/materials/:id/listen - Mark audio material as listened
async function listenMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT lm.id, c.age_group_id
       FROM learning_materials lm
       JOIN lessons l ON l.id = lm.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE lm.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    if (result.rows[0].age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query(
      `INSERT INTO material_listens (material_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (material_id, student_id) DO NOTHING`,
      [id, student.id]
    );

    res.json({ success: true, listened: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/videos/:id - Get a single video with watched status
async function getVideo(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT v.*, l.course_id, c.age_group_id,
              (EXISTS (SELECT 1 FROM video_watches vw WHERE vw.video_id = v.id AND vw.student_id = $2)) as watched
       FROM videos v
       JOIN lessons l ON l.id = v.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE v.id = $1`,
      [id, student.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = result.rows[0];

    if (video.age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ video });
  } catch (err) {
    next(err);
  }
}

// POST /api/students/videos/:id/watch - Mark video as watched
async function watchVideo(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT v.id, c.age_group_id
       FROM videos v
       JOIN lessons l ON l.id = v.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (result.rows[0].age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query(
      `INSERT INTO video_watches (video_id, student_id, watched_at)
       VALUES ($1, $2, now())
       ON CONFLICT (video_id, student_id) DO UPDATE SET watched_at = now()`,
      [id, student.id]
    );

    res.json({ success: true, watched: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/activities/:id - Get activity details
async function getActivity(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const result = await query(
      `SELECT a.*, l.title as lesson_title, c.title as course_title,
              c.age_group_id, asub.id as submission_id, asub.status as submission_status,
              asub.submission_text, asub.submission_url, asub.score, asub.feedback,
              asub.submitted_at, asub.reviewed_at as graded_at
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $2
       WHERE a.id = $1`,
      [id, student.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const activity = result.rows[0];

    // Verify access
    if (activity.age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

// POST /api/students/activities/:id/submit - Submit activity
async function submitActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { submitted_content, file_url } = req.body;
    const student = await getStudentFromUser(req.user.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Verify activity exists and student has access
    const activityCheck = await query(
      `SELECT a.id, c.age_group_id
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE a.id = $1`,
      [id]
    );

    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (activityCheck.rows[0].age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already submitted
    const existing = await query(
      'SELECT id FROM activity_submissions WHERE activity_id = $1 AND student_id = $2',
      [id, student.id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing submission
      result = await query(
        `UPDATE activity_submissions 
         SET submission_text = $1, submission_url = $2, submitted_at = now(), status = 'pending'
         WHERE id = $3
         RETURNING *`,
        [submitted_content, file_url || null, existing.rows[0].id]
      );
    } else {
      // Create new submission
      result = await query(
        `INSERT INTO activity_submissions (student_id, activity_id, submission_text, submission_url, submitted_by, status)
         VALUES ($1, $2, $3, $4, 'student', 'pending')
         RETURNING *`,
        [student.id, id, submitted_content, file_url || null]
      );
    }

    res.json({ 
      success: true, 
      submission: result.rows[0],
      message: 'Activity submitted successfully! Your teacher will review it soon.' 
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/quizzes/:id - Get quiz with questions
async function getQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get quiz details
    const quizResult = await query(
      `SELECT q.*, l.title as lesson_title, c.title as course_title, c.age_group_id
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE q.id = $1`,
      [id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizResult.rows[0];

    // Verify access
    if (quiz.age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get questions
    const questions = await query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index, id',
      [id]
    );

    // Check if already taken
    const previousResult = await query(
      'SELECT * FROM quiz_results WHERE quiz_id = $1 AND student_id = $2',
      [id, student.id]
    );

    res.json({
      quiz,
      questions: questions.rows,
      previous_result: previousResult.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/students/quizzes/:id/submit - Submit quiz answers
async function submitQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const { answers } = req.body; // { questionId: answer }
    const student = await getStudentFromUser(req.user.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Verify quiz exists and get questions
    const questions = await query(
      `SELECT qq.*, q.lesson_id, c.age_group_id
       FROM quiz_questions qq
       JOIN quizzes q ON q.id = qq.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE qq.quiz_id = $1`,
      [id]
    );

    if (questions.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (questions.rows[0].age_group_id !== student.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate score
    let score = 0;
    let totalPoints = 0;

    questions.rows.forEach(q => {
      totalPoints += q.points || 1;
      const studentAnswer = answers[q.id];
      if (studentAnswer && studentAnswer.toString().toLowerCase() === q.correct_answer.toString().toLowerCase()) {
        score += q.points || 1;
      }
    });

    // Save result
    const result = await query(
      `INSERT INTO quiz_results (student_id, quiz_id, score, total_points, answers)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student.id, id, score, totalPoints, JSON.stringify(answers)]
    );

    res.json({
      success: true,
      result: result.rows[0],
      score,
      total_points: totalPoints,
      percentage: Math.round((score / totalPoints) * 100),
      message: score >= totalPoints * 0.7 ? 'Great job! 🎉' : 'Good effort! Keep practicing! 💪',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/progress - Overall progress summary
async function getProgress(req, res, next) {
  try {
    const student = await getStudentFromUser(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get progress per course
    const courseProgress = await query(
      `SELECT c.id, c.title, c.thumbnail_url,
              COUNT(DISTINCT l.id)::int as total_lessons,
              COUNT(DISTINCT CASE WHEN asub.status = 'graded' THEN a.id END)::int as completed_activities,
              COUNT(DISTINCT a.id)::int as total_activities,
              COUNT(DISTINCT qr.id)::int as completed_quizzes,
              COUNT(DISTINCT q.id)::int as total_quizzes
       FROM courses c
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN activities a ON a.lesson_id = l.id
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $1
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = $1
       WHERE c.age_group_id = $2 AND c.status = 'published'
       GROUP BY c.id
       ORDER BY c.created_at`,
      [student.id, student.age_group_id]
    );

    res.json({ course_progress: courseProgress.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/notifications - Get notifications
async function getNotifications(req, res, next) {
  try {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/students/notifications/:id/read - Mark notification as read
async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ============================================
// PARENT-RELATED ENDPOINTS
// ============================================

// POST /api/students/registration-requests - Parent creates child registration request
async function createChildRegistrationRequest(req, res, next) {
  try {
    const { full_name, date_of_birth, age_group_id, grade_level, school_name, notes } = req.body;
    
    // Get parent record
    const parentResult = await query('SELECT * FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }
    const parent = parentResult.rows[0];

    // Create registration request
    const result = await query(
      `INSERT INTO child_registration_requests 
       (parent_id, full_name, date_of_birth, age_group_id, grade_level, school_name, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [parent.id, full_name, date_of_birth, age_group_id, grade_level || null, school_name || null, notes || null]
    );

    res.status(201).json({ 
      success: true,
      request: result.rows[0],
      message: 'Child registration request submitted successfully. An administrator will review it soon.' 
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/registration-requests - Parent views their child registration requests
async function listMyChildRegistrationRequests(req, res, next) {
  try {
    const parentResult = await query('SELECT * FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }
    const parent = parentResult.rows[0];

    const result = await query(
      `SELECT crr.*, ag.name as age_group_name
       FROM child_registration_requests crr
       LEFT JOIN age_groups ag ON ag.id = crr.age_group_id
       WHERE crr.parent_id = $1
       ORDER BY crr.created_at DESC`,
      [parent.id]
    );

    res.json({ requests: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/children - Parent views their approved children
async function listMyChildren(req, res, next) {
  try {
    const parentResult = await query('SELECT * FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }
    const parent = parentResult.rows[0];

    const result = await query(
      `SELECT s.*, u.email, u.full_name, u.phone, ag.name as age_group_name,
              ag.min_age, ag.max_age
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN age_groups ag ON ag.id = s.age_group_id
       WHERE s.parent_id = $1
       ORDER BY s.created_at DESC`,
      [parent.id]
    );

    res.json({ children: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/students/children/:id/learning-space - Parent views child's learning data
async function getChildLearningSpace(req, res, next) {
  try {
    const { id } = req.params;
    const parentResult = await query('SELECT * FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent profile not found' });
    }
    const parent = parentResult.rows[0];

    // Get child and verify ownership
    const studentResult = await query(
      'SELECT * FROM students WHERE id = $1 AND parent_id = $2',
      [id, parent.id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }
    const student = studentResult.rows[0];

    // Get learning statistics
    const stats = await query(
      `SELECT 
        (SELECT COUNT(*)::int FROM activity_submissions WHERE student_id = $1) as total_submissions,
        (SELECT COUNT(*)::int FROM activity_submissions WHERE student_id = $1 AND status = 'graded') as graded_submissions,
        (SELECT COUNT(*)::int FROM quiz_results WHERE student_id = $1) as quizzes_taken,
        (SELECT AVG(score * 100.0 / NULLIF(total_points, 0))::numeric(5,2) 
         FROM quiz_results WHERE student_id = $1) as average_quiz_score`,
      [student.id]
    );

    // Get recent activity submissions
    const recentActivities = await query(
      `SELECT asub.*, a.title as activity_title, l.title as lesson_title,
              c.title as course_title
       FROM activity_submissions asub
       JOIN activities a ON a.id = asub.activity_id
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE asub.student_id = $1
       ORDER BY asub.submitted_at DESC
       LIMIT 10`,
      [student.id]
    );

    // Get recent quiz results
    const recentQuizzes = await query(
      `SELECT qr.*, q.title as quiz_title, l.title as lesson_title,
              c.title as course_title
       FROM quiz_results qr
       JOIN quizzes q ON q.id = qr.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE qr.student_id = $1
       ORDER BY qr.submitted_at DESC
       LIMIT 10`,
      [student.id]
    );

    // Get enrolled courses
    const courses = await query(
      `SELECT DISTINCT c.*, ag.name as age_group_name
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       WHERE c.age_group_id = $1 AND c.status = 'published'
       ORDER BY c.created_at DESC`,
      [student.age_group_id]
    );

    res.json({
      student,
      stats: stats.rows[0],
      recent_activities: recentActivities.rows,
      recent_quizzes: recentQuizzes.rows,
      courses: courses.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Student learning endpoints
  getProfile,
  getDashboard,
  listCourses,
  getCourse,
  getLesson,
  getActivity,
  submitActivity,
  getQuiz,
  submitQuiz,
  getProgress,
  getNotifications,
  markNotificationRead,
  // Parent endpoints
  createChildRegistrationRequest,
  listMyChildRegistrationRequests,
  listMyChildren,
  getChildLearningSpace,
};

