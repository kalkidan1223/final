const { query } = require('../config/db');

/**
 * Helper: Resolve the active student record based on whether the logged in user
 * is a Category 2 student (direct account) or a Category 1 parent-managed child.
 */
async function resolveChild(req) {
  if (req.user.role === 'student') {
    const res = await query(
      `SELECT s.*, ag.name as age_group_name, ag.min_age, ag.max_age,
              u.email, u.full_name as user_full_name,
              p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone
       FROM students s
       JOIN age_groups ag ON ag.id = s.age_group_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN parents p ON p.id = s.parent_id
       LEFT JOIN users pu ON pu.id = p.user_id
       WHERE s.user_id = $1 AND s.is_active = TRUE`,
      [req.user.id]
    );
    return res.rows[0] || null;
  }

  if (req.user.role === 'parent') {
    // Parent accessing on behalf of a child
    const parentRes = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentRes.rows.length === 0) return null;
    const parentId = parentRes.rows[0].id;

    // Check if a specific child was requested via header, query or body
    const requestedChildId = req.headers['x-child-id'] || req.query.child_id || req.body?.child_id;

    let res;
    if (requestedChildId) {
      res = await query(
        `SELECT s.*, ag.name as age_group_name, ag.min_age, ag.max_age,
                s.full_name as user_full_name,
                p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone
         FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         LEFT JOIN parents p ON p.id = s.parent_id
         LEFT JOIN users pu ON pu.id = p.user_id
         WHERE s.id = $1 AND s.parent_id = $2 AND s.is_active = TRUE`,
        [requestedChildId, parentId]
      );
    } else {
      // Default to the parent's first child
      res = await query(
        `SELECT s.*, ag.name as age_group_name, ag.min_age, ag.max_age,
                s.full_name as user_full_name,
                p.id as parent_db_id, pu.full_name as parent_name, pu.phone as parent_phone
         FROM students s
         JOIN age_groups ag ON ag.id = s.age_group_id
         LEFT JOIN parents p ON p.id = s.parent_id
         LEFT JOIN users pu ON pu.id = p.user_id
         WHERE s.parent_id = $1 AND s.is_active = TRUE
         ORDER BY s.created_at ASC
         LIMIT 1`,
        [parentId]
      );
    }
    return res.rows[0] || null;
  }

  return null;
}

// GET /api/child/profile
async function getProfile(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child profile not found or access denied' });
    }

    // List sibling children if parent is logged in
    let siblingChildren = [];
    if (req.user.role === 'parent' && child.parent_db_id) {
      const sibRes = await query(
        `SELECT id, full_name, profile_image_url, grade, section, date_of_birth
         FROM students WHERE parent_id = $1 AND is_active = TRUE ORDER BY created_at ASC`,
        [child.parent_db_id]
      );
      siblingChildren = sibRes.rows;
    }

    res.json({
      child: {
        id: child.id,
        full_name: child.full_name,
        date_of_birth: child.date_of_birth,
        gender: child.gender,
        grade: child.grade,
        section: child.section,
        age_group_id: child.age_group_id,
        age_group_name: child.age_group_name,
        preferred_language: child.preferred_language,
        profile_image_url: child.profile_image_url,
        admission_number: child.admission_number,
        academic_year: child.academic_year,
        parent_name: child.parent_name,
        is_parent_managed: !child.user_id,
        is_parent_session: req.user.role === 'parent',
      },
      available_children: siblingChildren,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/dashboard
async function getDashboard(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    // 1. Course summary stats
    const statsRes = await query(
      `SELECT
        (SELECT COUNT(DISTINCT c.id)::int
         FROM courses c
         WHERE c.age_group_id = $2 AND c.status = 'published') as total_courses,
        (SELECT COUNT(DISTINCT l.id)::int
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         WHERE c.age_group_id = $2 AND c.status = 'published') as total_lessons,
        (SELECT COUNT(DISTINCT asub.activity_id)::int
         FROM activity_submissions asub
         WHERE asub.student_id = $1) as completed_activities,
        (SELECT COUNT(DISTINCT qr.quiz_id)::int
         FROM quiz_results qr
         WHERE qr.student_id = $1) as completed_quizzes,
        (SELECT COUNT(*)::int
         FROM video_watches
         WHERE student_id = $1) as watched_videos`,
      [child.id, child.age_group_id]
    );

    // 2. Continue Learning: Find last accessed incomplete lesson or first available lesson
    const continueRes = await query(
      `SELECT l.id, l.title, l.description, l.order_index,
              c.id as course_id, c.title as course_title, c.thumbnail_url,
              ag.name as age_group_name,
              u.full_name as instructor_name,
              COALESCE(p.completion_percentage, 0)::int as lesson_progress
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.student_id = $1
       WHERE c.age_group_id = $2 AND c.status = 'published'
         AND (p.status IS NULL OR p.status != 'completed')
       ORDER BY p.last_accessed_at DESC NULLS LAST, l.order_index ASC, l.created_at ASC
       LIMIT 1`,
      [child.id, child.age_group_id]
    );

    // 3. Child's assigned courses with progress
    const coursesRes = await query(
      `SELECT c.id, c.title, c.description, c.thumbnail_url,
              ag.name as age_group_name, u.full_name as instructor_name,
              COUNT(DISTINCT l.id)::int as total_lessons,
              COUNT(DISTINCT a.id)::int as total_activities,
              COUNT(DISTINCT q.id)::int as total_quizzes,
              COALESCE(
                ROUND(
                  AVG(COALESCE(p.completion_percentage, 0))
                ), 0
              )::int as overall_progress
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN activities a ON a.lesson_id = l.id AND a.status = 'active'
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN progress p ON p.course_id = c.id AND p.student_id = $1 AND p.lesson_id = l.id
       WHERE c.age_group_id = $2 AND c.status = 'published'
       GROUP BY c.id, ag.name, u.full_name
       ORDER BY c.created_at DESC
       LIMIT 6`,
      [child.id, child.age_group_id]
    );

    // 4. Today's recommended activities (assigned activities not yet submitted)
    const todaysActivitiesRes = await query(
      `SELECT a.id, a.title, a.activity_type, a.difficulty,
              l.id as lesson_id, l.title as lesson_title,
              c.id as course_id, c.title as course_title,
              asub.status as submission_status
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $1
       WHERE c.age_group_id = $2 AND c.status = 'published' AND a.status = 'active'
         AND asub.id IS NULL
       ORDER BY l.order_index ASC, a.created_at ASC
       LIMIT 5`,
      [child.id, child.age_group_id]
    );

    // 5. Learning streak (days with activity in last 14 days)
    const streakRes = await query(
      `WITH activity_days AS (
        SELECT DISTINCT DATE(submitted_at) as act_date FROM activity_submissions WHERE student_id = $1
        UNION
        SELECT DISTINCT DATE(submitted_at) as act_date FROM quiz_results WHERE student_id = $1
        UNION
        SELECT DISTINCT DATE(watched_at) as act_date FROM video_watches WHERE student_id = $1
      )
      SELECT COUNT(*)::int as streak_days
      FROM activity_days
      WHERE act_date >= CURRENT_DATE - INTERVAL '14 days'`,
      [child.id]
    );

    // 6. Real achievements unlocked
    const achievements = await computeAchievements(child.id);

    // 7. Unread notifications count
    const notifRes = await query(
      `SELECT COUNT(*)::int as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({
      child: {
        id: child.id,
        full_name: child.full_name,
        age_group_name: child.age_group_name,
        grade: child.grade,
        section: child.section,
        profile_image_url: child.profile_image_url,
      },
      stats: statsRes.rows[0] || {},
      continue_learning: continueRes.rows[0] || null,
      courses: coursesRes.rows,
      todays_activities: todaysActivitiesRes.rows,
      learning_streak: streakRes.rows[0]?.streak_days || 0,
      achievements: achievements.filter(a => a.earned).slice(0, 4),
      unread_notifications: notifRes.rows[0]?.unread_count || 0,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/courses
async function listCourses(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    // Show only published courses assigned to child's age group & class
    const result = await query(
      `SELECT c.id, c.title, c.description, c.thumbnail_url, c.status,
              ag.name as age_group_name, u.full_name as instructor_name,
              COUNT(DISTINCT l.id)::int as total_lessons,
              COUNT(DISTINCT a.id)::int as total_activities,
              COUNT(DISTINCT q.id)::int as total_quizzes,
              COALESCE(
                ROUND(
                  AVG(COALESCE(p.completion_percentage, 0))
                ), 0
              )::int as overall_progress
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN activities a ON a.lesson_id = l.id AND a.status = 'active'
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN progress p ON p.course_id = c.id AND p.student_id = $1 AND p.lesson_id = l.id
       WHERE c.age_group_id = $2 AND c.status = 'published'
       GROUP BY c.id, ag.name, u.full_name
       ORDER BY c.created_at DESC`,
      [child.id, child.age_group_id]
    );

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/courses/:courseId
async function getCourse(req, res, next) {
  try {
    const { courseId } = req.params;
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    // Verify course belongs to student's age group
    const courseRes = await query(
      `SELECT c.*, ag.name as age_group_name, u.full_name as instructor_name,
              ia.grade as assigned_grade, ia.section as assigned_section
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       LEFT JOIN instructor_assignments ia ON ia.course_id = c.id AND ia.instructor_id = i.id
       WHERE c.id = $1 AND c.age_group_id = $2 AND c.status = 'published'`,
      [courseId, child.age_group_id]
    );

    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not assigned to your learning group' });
    }

    const course = courseRes.rows[0];

    // Fetch lessons in instructor-defined order
    const lessonsRes = await query(
      `SELECT l.*,
              COUNT(DISTINCT lm.id)::int as material_count,
              COUNT(DISTINCT v.id)::int as video_count,
              COUNT(DISTINCT a.id)::int as activity_count,
              COUNT(DISTINCT q.id)::int as quiz_count,
              COALESCE(p.status, 'not_started') as progress_status,
              COALESCE(p.completion_percentage, 0)::int as completion_percentage
       FROM lessons l
       LEFT JOIN learning_materials lm ON lm.lesson_id = l.id AND lm.status = 'active'
       LEFT JOIN videos v ON v.lesson_id = l.id
       LEFT JOIN activities a ON a.lesson_id = l.id AND a.status = 'active'
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN progress p ON p.lesson_id = l.id AND p.student_id = $2
       WHERE l.course_id = $1
       GROUP BY l.id, p.status, p.completion_percentage
       ORDER BY l.order_index ASC, l.created_at ASC`,
      [courseId, child.id]
    );

    // Compute sequential access status (AVAILABLE, IN PROGRESS, COMPLETED, LOCKED)
    const lessons = lessonsRes.rows.map((lesson, idx) => {
      let accessState = 'available';
      if (lesson.completion_percentage >= 100 || lesson.progress_status === 'completed') {
        accessState = 'completed';
      } else if (lesson.completion_percentage > 0 || lesson.progress_status === 'in_progress') {
        accessState = 'in-progress';
      } else {
        // Check if previous lesson is completed for sequential progression
        if (idx > 0) {
          const prev = lessonsRes.rows[idx - 1];
          const prevCompleted = prev.completion_percentage >= 100 || prev.progress_status === 'completed';
          if (!prevCompleted) {
            accessState = 'locked';
          }
        }
      }
      return {
        ...lesson,
        access_state: accessState,
      };
    });

    // Calculate overall course progress
    const totalLessons = lessons.length;
    const completedCount = lessons.filter(l => l.access_state === 'completed').length;
    const overallProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    res.json({
      course: {
        ...course,
        overall_progress: overallProgress,
        completed_lessons: completedCount,
        total_lessons: totalLessons,
      },
      lessons,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/lessons/:lessonId
async function getLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    // Validate lesson and verify child belongs to the course
    const lessonRes = await query(
      `SELECT l.*, c.title as course_title, c.id as course_id, c.age_group_id,
              ag.name as age_group_name, u.full_name as instructor_name
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       JOIN age_groups ag ON ag.id = c.age_group_id
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       WHERE l.id = $1 AND c.status = 'published'`,
      [lessonId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonRes.rows[0];
    if (lesson.age_group_id !== child.age_group_id) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // 1. Learning materials (PDFs, Audio, Images, Documents) with listened/accessed status
    const materialsRes = await query(
      `SELECT lm.*,
              (EXISTS (SELECT 1 FROM material_listens ml WHERE ml.material_id = lm.id AND ml.student_id = $2)) as listened
       FROM learning_materials lm
       WHERE lm.lesson_id = $1 AND lm.status = 'active'
       ORDER BY lm.display_order ASC, lm.created_at ASC`,
      [lessonId, child.id]
    );

    // 2. Videos with watched status
    const videosRes = await query(
      `SELECT v.*,
              (EXISTS (SELECT 1 FROM video_watches vw WHERE vw.video_id = v.id AND vw.student_id = $2)) as watched
       FROM videos v
       WHERE v.lesson_id = $1
       ORDER BY v.created_at ASC`,
      [lessonId, child.id]
    );

    // 3. Activities with submission status, score, and instructor feedback
    const activitiesRes = await query(
      `SELECT a.*,
              asub.id as submission_id,
              asub.status as submission_status,
              asub.submission_text,
              asub.submission_url,
              asub.score,
              asub.feedback,
              asub.submitted_at,
              asub.reviewed_at as graded_at,
              u.full_name as reviewer_name
       FROM activities a
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $2
       LEFT JOIN instructors i ON i.id = asub.reviewed_by
       LEFT JOIN users u ON u.id = i.user_id
       WHERE a.lesson_id = $1 AND a.status = 'active'
       ORDER BY a.display_order ASC, a.created_at ASC`,
      [lessonId, child.id]
    );

    // 4. Quizzes with student's previous result
    const quizzesRes = await query(
      `SELECT q.*,
              qr.id as result_id,
              qr.score,
              qr.total_points,
              qr.submitted_at as result_submitted_at,
              (SELECT COUNT(*)::int FROM quiz_results qr2 WHERE qr2.quiz_id = q.id AND qr2.student_id = $2) as attempt_count
       FROM quizzes q
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = $2
       WHERE q.lesson_id = $1
       ORDER BY q.created_at ASC`,
      [lessonId, child.id]
    );

    // Record access in progress table
    await query(
      `INSERT INTO progress (student_id, course_id, lesson_id, status, last_accessed_at, updated_at)
       VALUES ($1, $2, $3, 'in_progress', now(), now())
       ON CONFLICT (student_id, course_id, lesson_id)
       DO UPDATE SET last_accessed_at = now(), updated_at = now()`,
      [child.id, lesson.course_id, lesson.id]
    );

    res.json({
      lesson,
      materials: materialsRes.rows,
      videos: videosRes.rows,
      activities: activitiesRes.rows,
      quizzes: quizzesRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/activities/:activityId
async function getActivity(req, res, next) {
  try {
    const { activityId } = req.params;
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const result = await query(
      `SELECT a.*, l.id as lesson_id, l.title as lesson_title,
              c.id as course_id, c.title as course_title, c.age_group_id,
              asub.id as submission_id, asub.status as submission_status,
              asub.submission_text, asub.submission_url, asub.score, asub.feedback,
              asub.submitted_at, asub.reviewed_at as graded_at,
              u.full_name as reviewer_name
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $2
       LEFT JOIN instructors i ON i.id = asub.reviewed_by
       LEFT JOIN users u ON u.id = i.user_id
       WHERE a.id = $1 AND a.status = 'active'`,
      [activityId, child.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const activity = result.rows[0];
    if (activity.age_group_id !== child.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

// POST /api/child/activities/:activityId/submit
async function submitActivity(req, res, next) {
  try {
    const { activityId } = req.params;
    const { submitted_content, file_url } = req.body;
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    // Validate activity and access
    const actRes = await query(
      `SELECT a.*, l.id as lesson_id, c.id as course_id, c.age_group_id
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE a.id = $1`,
      [activityId]
    );

    if (actRes.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const activity = actRes.rows[0];
    if (activity.age_group_id !== child.age_group_id) {
      return res.status(403).json({ error: 'Access denied to this activity' });
    }

    const submittedBy = req.user.role === 'parent' ? 'parent' : 'student';

    // Auto-grading for auto_gradable activities (e.g. matching)
    let autoScore = null;
    let initialStatus = 'pending';
    if (activity.auto_gradable && activity.activity_type === 'matching') {
      try {
        const payload = JSON.parse(submitted_content || '{}');
        if (payload.score !== undefined) {
          autoScore = Number(payload.score);
          initialStatus = 'graded';
        }
      } catch (e) {
        // fallback
      }
    }

    // Upsert submission
    const existing = await query(
      'SELECT id FROM activity_submissions WHERE activity_id = $1 AND student_id = $2',
      [activityId, child.id]
    );

    let subResult;
    if (existing.rows.length > 0) {
      subResult = await query(
        `UPDATE activity_submissions
         SET submission_text = $1, submission_url = $2, submitted_by = $3,
             submitted_at = now(), status = $4, score = COALESCE($5, score)
         WHERE id = $6
         RETURNING *`,
        [submitted_content, file_url || null, submittedBy, initialStatus, autoScore, existing.rows[0].id]
      );
    } else {
      subResult = await query(
        `INSERT INTO activity_submissions (student_id, activity_id, submitted_by, submission_text, submission_url, status, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [child.id, activityId, submittedBy, submitted_content, file_url || null, initialStatus, autoScore]
      );
    }

    // Update overall lesson progress
    await updateLessonProgress(child.id, activity.course_id, activity.lesson_id);

    res.json({
      success: true,
      submission: subResult.rows[0],
      message: 'Great job! Your activity has been submitted.',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/quizzes/:quizId
async function getQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const quizRes = await query(
      `SELECT q.*, l.id as lesson_id, l.title as lesson_title,
              c.id as course_id, c.title as course_title, c.age_group_id
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE q.id = $1`,
      [quizId]
    );

    if (quizRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quiz = quizRes.rows[0];
    if (quiz.age_group_id !== child.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch quiz questions
    const questionsRes = await query(
      `SELECT id, quiz_id, question_text, question_type, options, points, order_index, question_config
       FROM quiz_questions
       WHERE quiz_id = $1
       ORDER BY order_index ASC, id ASC`,
      [quizId]
    );

    // Fetch previous results for this child
    const prevRes = await query(
      `SELECT * FROM quiz_results WHERE quiz_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1`,
      [quizId, child.id]
    );

    res.json({
      quiz,
      questions: questionsRes.rows,
      previous_result: prevRes.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/child/quizzes/:quizId/submit
async function submitQuiz(req, res, next) {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // { [questionId]: answer }
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    // Validate quiz and fetch questions with correct answers
    const questionsRes = await query(
      `SELECT qq.*, q.lesson_id, c.id as course_id, c.age_group_id, q.show_result_immediately
       FROM quiz_questions qq
       JOIN quizzes q ON q.id = qq.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE qq.quiz_id = $1
       ORDER BY qq.order_index ASC, qq.id ASC`,
      [quizId]
    );

    if (questionsRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const first = questionsRes.rows[0];
    if (first.age_group_id !== child.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let score = 0;
    let totalPoints = 0;
    const questionReview = [];

    questionsRes.rows.forEach(q => {
      const qPoints = q.points || 1;
      totalPoints += qPoints;
      const given = answers ? answers[q.id] : undefined;
      const isCorrect = given !== undefined && given !== null &&
        given.toString().trim().toLowerCase() === q.correct_answer.toString().trim().toLowerCase();

      if (isCorrect) score += qPoints;

      questionReview.push({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        student_answer: given,
        correct_answer: first.show_result_immediately !== false ? q.correct_answer : null,
        is_correct: isCorrect,
        points: qPoints,
        explanation: first.show_result_immediately !== false ? q.explanation : null,
      });
    });

    // Store in quiz_results
    const resultRes = await query(
      `INSERT INTO quiz_results (quiz_id, student_id, score, total_points, answers, submitted_at)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING *`,
      [quizId, child.id, score, totalPoints, JSON.stringify(answers || {})]
    );

    // Update lesson progress
    await updateLessonProgress(child.id, first.course_id, first.lesson_id);

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const message = percentage >= 80 ? '🎉 Amazing job! You did great!' :
                    percentage >= 50 ? '⭐ Good work! Keep practicing!' : '💪 Good effort! Try again to improve!';

    res.json({
      success: true,
      result: resultRes.rows[0],
      score,
      total_points: totalPoints,
      percentage,
      message,
      show_result_immediately: first.show_result_immediately !== false,
      review: first.show_result_immediately !== false ? questionReview : null,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/child/videos/:id/watch
async function watchVideo(req, res, next) {
  try {
    const { id } = req.params;
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const vidRes = await query(
      `SELECT v.id, v.lesson_id, c.id as course_id, c.age_group_id
       FROM videos v
       JOIN lessons l ON l.id = v.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE v.id = $1`,
      [id]
    );

    if (vidRes.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const vid = vidRes.rows[0];
    if (vid.age_group_id !== child.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query(
      `INSERT INTO video_watches (video_id, student_id, watched_at)
       VALUES ($1, $2, now())
       ON CONFLICT (video_id, student_id) DO UPDATE SET watched_at = now()`,
      [id, child.id]
    );

    await updateLessonProgress(child.id, vid.course_id, vid.lesson_id);

    res.json({ success: true, watched: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/child/materials/:id/listen
async function listenMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const matRes = await query(
      `SELECT lm.id, lm.lesson_id, c.id as course_id, c.age_group_id
       FROM learning_materials lm
       JOIN lessons l ON l.id = lm.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE lm.id = $1`,
      [id]
    );

    if (matRes.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const mat = matRes.rows[0];
    if (mat.age_group_id !== child.age_group_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await query(
      `INSERT INTO material_listens (material_id, student_id, listened_at)
       VALUES ($1, $2, now())
       ON CONFLICT (material_id, student_id) DO UPDATE SET listened_at = now()`,
      [id, child.id]
    );

    await updateLessonProgress(child.id, mat.course_id, mat.lesson_id);

    res.json({ success: true, listened: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/progress
async function getProgress(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const courseProgress = await query(
      `SELECT c.id, c.title, c.thumbnail_url,
              ag.name as age_group_name,
              COUNT(DISTINCT l.id)::int as total_lessons,
              COUNT(DISTINCT a.id)::int as total_activities,
              COUNT(DISTINCT asub.activity_id)::int as completed_activities,
              COUNT(DISTINCT q.id)::int as total_quizzes,
              COUNT(DISTINCT qr.quiz_id)::int as completed_quizzes,
              COALESCE(
                ROUND(
                  AVG(COALESCE(p.completion_percentage, 0))
                ), 0
              )::int as completion_percentage
       FROM courses c
       JOIN age_groups ag ON ag.id = c.age_group_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN activities a ON a.lesson_id = l.id AND a.status = 'active'
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $1
       LEFT JOIN quizzes q ON q.lesson_id = l.id
       LEFT JOIN quiz_results qr ON qr.quiz_id = q.id AND qr.student_id = $1
       LEFT JOIN progress p ON p.course_id = c.id AND p.student_id = $1 AND p.lesson_id = l.id
       WHERE c.age_group_id = $2 AND c.status = 'published'
       GROUP BY c.id, ag.name
       ORDER BY c.created_at ASC`,
      [child.id, child.age_group_id]
    );

    res.json({ course_progress: courseProgress.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/achievements
async function getAchievements(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const achievements = await computeAchievements(child.id);
    res.json({ achievements });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/notifications
async function getNotifications(req, res, next) {
  try {
    const notifs = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    res.json({ notifications: notifs.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/child/notifications/:id/read
async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper: Recalculate lesson and course progress based on completed items
 */
async function updateLessonProgress(studentId, courseId, lessonId) {
  try {
    // Count totals vs completed
    const [counts, watched, listened, subbed, quizzed] = await Promise.all([
      query(
        `SELECT
          (SELECT COUNT(*)::int FROM learning_materials WHERE lesson_id = $1 AND status = 'active') as mats,
          (SELECT COUNT(*)::int FROM videos WHERE lesson_id = $1) as vids,
          (SELECT COUNT(*)::int FROM activities WHERE lesson_id = $1 AND status = 'active') as acts,
          (SELECT COUNT(*)::int FROM quizzes WHERE lesson_id = $1) as quiz`,
        [lessonId]
      ),
      query(`SELECT COUNT(*)::int as cnt FROM video_watches vw JOIN videos v ON v.id = vw.video_id WHERE v.lesson_id = $1 AND vw.student_id = $2`, [lessonId, studentId]),
      query(`SELECT COUNT(*)::int as cnt FROM material_listens ml JOIN learning_materials lm ON lm.id = ml.material_id WHERE lm.lesson_id = $1 AND ml.student_id = $2`, [lessonId, studentId]),
      query(`SELECT COUNT(*)::int as cnt FROM activity_submissions asub JOIN activities a ON a.id = asub.activity_id WHERE a.lesson_id = $1 AND asub.student_id = $2`, [lessonId, studentId]),
      query(`SELECT COUNT(*)::int as cnt FROM quiz_results qr JOIN quizzes q ON q.id = qr.quiz_id WHERE q.lesson_id = $1 AND qr.student_id = $2`, [lessonId, studentId]),
    ]);

    const c = counts.rows[0];
    const totalItems = (c.vids || 0) + (c.acts || 0) + (c.quiz || 0);
    const completedItems = (watched.rows[0]?.cnt || 0) + (subbed.rows[0]?.cnt || 0) + (quizzed.rows[0]?.cnt || 0);

    let percentage = 0;
    if (totalItems > 0) {
      percentage = Math.min(100, Math.round((completedItems / totalItems) * 100));
    } else {
      percentage = 100;
    }

    const status = percentage >= 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'not_started';

    await query(
      `INSERT INTO progress (student_id, course_id, lesson_id, status, completion_percentage, last_accessed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       ON CONFLICT (student_id, course_id, lesson_id)
       DO UPDATE SET status = $4, completion_percentage = $5, last_accessed_at = now(), updated_at = now()`,
      [studentId, courseId, lessonId, status, percentage]
    );
  } catch (err) {
    console.error('Error updating lesson progress:', err);
  }
}

/**
 * Helper: Compute achievements based on real database events
 */
async function computeAchievements(studentId) {
  const [subCount, quizStats, vidCount, courseCount, streakCount] = await Promise.all([
    query('SELECT COUNT(DISTINCT activity_id)::int as cnt FROM activity_submissions WHERE student_id = $1', [studentId]),
    query('SELECT COUNT(DISTINCT quiz_id)::int as cnt, MAX(score * 100.0 / NULLIF(total_points, 0)) as max_pct FROM quiz_results WHERE student_id = $1', [studentId]),
    query('SELECT COUNT(DISTINCT video_id)::int as cnt FROM video_watches WHERE student_id = $1', [studentId]),
    query('SELECT COUNT(DISTINCT course_id)::int as cnt FROM progress WHERE student_id = $1', [studentId]),
    query(`
      WITH act_days AS (
        SELECT DISTINCT DATE(submitted_at) as d FROM activity_submissions WHERE student_id = $1
        UNION
        SELECT DISTINCT DATE(submitted_at) as d FROM quiz_results WHERE student_id = $1
      )
      SELECT COUNT(*)::int as cnt FROM act_days WHERE d >= CURRENT_DATE - INTERVAL '14 days'
    `, [studentId]),
  ]);

  const activitiesDone = subCount.rows[0]?.cnt || 0;
  const quizzesDone = quizStats.rows[0]?.cnt || 0;
  const maxQuizPct = Number(quizStats.rows[0]?.max_pct || 0);
  const videosWatched = vidCount.rows[0]?.cnt || 0;
  const coursesStarted = courseCount.rows[0]?.cnt || 0;
  const streak = streakCount.rows[0]?.cnt || 0;

  return [
    {
      id: 'first_step',
      name: 'First Lesson Started',
      icon: '🌟',
      description: 'Start learning your first lesson',
      color: 'from-yellow-400 to-orange-400',
      earned: activitiesDone >= 1 || videosWatched >= 1,
    },
    {
      id: 'activity_star',
      name: 'Activity Star',
      icon: '✨',
      description: 'Complete 5 learning activities',
      color: 'from-green-400 to-teal-400',
      earned: activitiesDone >= 5,
    },
    {
      id: 'super_learner',
      name: 'Super Learner',
      icon: '🚀',
      description: 'Complete 10 learning activities',
      color: 'from-blue-400 to-indigo-400',
      earned: activitiesDone >= 10,
    },
    {
      id: 'quiz_master',
      name: 'Quiz Master',
      icon: '🧠',
      description: 'Score 90% or higher on a quiz',
      color: 'from-purple-400 to-fuchsia-400',
      earned: maxQuizPct >= 90,
    },
    {
      id: 'perfect_score',
      name: 'Perfect Score',
      icon: '💯',
      description: 'Get 100% on any quiz',
      color: 'from-pink-400 to-rose-400',
      earned: maxQuizPct >= 100,
    },
    {
      id: 'course_explorer',
      name: 'Course Explorer',
      icon: '🗺️',
      description: 'Explore and start 3 different courses',
      color: 'from-cyan-400 to-sky-400',
      earned: coursesStarted >= 3,
    },
    {
      id: 'video_explorer',
      name: 'Video Master',
      icon: '🎬',
      description: 'Watch 3 educational videos',
      color: 'from-emerald-400 to-green-500',
      earned: videosWatched >= 3,
    },
    {
      id: 'learning_streak',
      name: 'Learning Flame',
      icon: '🔥',
      description: 'Keep a 3-day learning streak',
      color: 'from-orange-500 to-red-500',
      earned: streak >= 3,
    },
  ];
}

// GET /api/child/activities - list all assigned activities across child's courses
async function listAllActivities(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const result = await query(
      `SELECT a.*, l.id as lesson_id, l.title as lesson_title,
              c.id as course_id, c.title as course_title,
              asub.id as submission_id, asub.status as submission_status,
              asub.score, asub.feedback
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN activity_submissions asub ON asub.activity_id = a.id AND asub.student_id = $1
       WHERE c.age_group_id = $2 AND c.status = 'published' AND a.status = 'active'
       ORDER BY c.created_at DESC, l.order_index ASC, a.display_order ASC, a.created_at ASC`,
      [child.id, child.age_group_id]
    );

    res.json({ activities: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/child/quizzes - list all assigned quizzes across child's courses
async function listAllQuizzes(req, res, next) {
  try {
    const child = await resolveChild(req);
    if (!child) return res.status(404).json({ error: 'Child profile not found' });

    const result = await query(
      `SELECT q.*, l.id as lesson_id, l.title as lesson_title,
              c.id as course_id, c.title as course_title,
              (SELECT COUNT(*)::int FROM quiz_results qr WHERE qr.quiz_id = q.id AND qr.student_id = $1) as attempt_count,
              (SELECT MAX(qr.score) FROM quiz_results qr WHERE qr.quiz_id = q.id AND qr.student_id = $1) as best_score,
              (SELECT total_points FROM quiz_results qr WHERE qr.quiz_id = q.id AND qr.student_id = $1 ORDER BY score DESC LIMIT 1) as best_total_points
       FROM quizzes q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE c.age_group_id = $2 AND c.status = 'published'
       ORDER BY c.created_at DESC, l.order_index ASC, q.created_at ASC`,
      [child.id, child.age_group_id]
    );

    res.json({ quizzes: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  getDashboard,
  listCourses,
  getCourse,
  getLesson,
  getActivity,
  listAllActivities,
  submitActivity,
  getQuiz,
  listAllQuizzes,
  submitQuiz,
  watchVideo,
  listenMaterial,
  getProgress,
  getAchievements,
  getNotifications,
  markNotificationRead,
};

