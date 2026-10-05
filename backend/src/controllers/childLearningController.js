const { query, pool } = require('../config/db');
const { resolveStudentId, getLessonAccess, getResourceAccess, ensureLessonResources } = require('../utils/learningAccess');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the student_id for the authenticated user
 * Handles both direct student login and parent accessing child's learning
 */
// Delegates to the shared access helper so every controller resolves the
// active child (student self, or a parent's selected child) identically.
async function getStudentId(req) {
  return resolveStudentId(req);
}

/**
 * Calculate lesson progress based on completed required resources
 */
function calculateLessonProgress(completedRequired, totalRequired) {
  if (totalRequired === 0) return 100;
  return Math.round((completedRequired / totalRequired) * 100);
}

/**
 * Update lesson progress aggregate
 */
async function updateLessonProgress(client, studentId, lessonId) {
  // Get all required resources for this lesson
  const resourcesResult = await client.query(
    `SELECT lr.id, srp.status
     FROM lesson_resources lr
     LEFT JOIN student_resource_progress srp ON srp.lesson_resource_id = lr.id AND srp.student_id = $1
     WHERE lr.lesson_id = $2 AND lr.is_required = TRUE
     ORDER BY lr.display_order`,
    [studentId, lessonId]
  );
  
  const totalRequired = resourcesResult.rows.length;
  const completedRequired = resourcesResult.rows.filter(r => r.status === 'completed').length;
  const progressPercentage = calculateLessonProgress(completedRequired, totalRequired);
  const isCompleted = completedRequired === totalRequired && totalRequired > 0;
  
  // Update or insert lesson progress
  const lessonStatus = isCompleted ? 'completed' : 
                       completedRequired > 0 ? 'in_progress' : 'not_started';
  
  await client.query(
    `INSERT INTO student_lesson_progress (
      student_id, lesson_id, status, progress_percentage, 
      required_resources_completed, total_required_resources, 
      started_at, completed_at, last_accessed_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 
      CASE WHEN $3 != 'not_started' THEN COALESCE((SELECT started_at FROM student_lesson_progress WHERE student_id = $1 AND lesson_id = $2), now()) ELSE NULL END,
      CASE WHEN $3 = 'completed' THEN now() ELSE NULL END,
      now(), now()
    )
    ON CONFLICT (student_id, lesson_id) 
    DO UPDATE SET
      status = $3,
      progress_percentage = $4,
      required_resources_completed = $5,
      total_required_resources = $6,
      started_at = COALESCE(student_lesson_progress.started_at, CASE WHEN $3 != 'not_started' THEN now() ELSE NULL END),
      completed_at = CASE WHEN $3 = 'completed' THEN COALESCE(student_lesson_progress.completed_at, now()) ELSE NULL END,
      last_accessed_at = now(),
      updated_at = now()`,
    [studentId, lessonId, lessonStatus, progressPercentage, completedRequired, totalRequired]
  );
  
  // If lesson just completed, check for achievements
  if (isCompleted) {
    await checkLessonAchievements(client, studentId, lessonId);
  }
  
  return { isCompleted, progressPercentage };
}

/**
 * Check and award lesson completion achievements
 */
async function checkLessonAchievements(client, studentId, lessonId) {
  // Get course info
  const courseResult = await client.query(
    'SELECT course_id FROM lessons WHERE id = $1',
    [lessonId]
  );
  const courseId = courseResult.rows[0]?.course_id;
  
  // Check if this is the first lesson completed
  const firstLessonResult = await client.query(
    'SELECT COUNT(*) as count FROM student_lesson_progress WHERE student_id = $1 AND status = $2',
    [studentId, 'completed']
  );
  
  if (firstLessonResult.rows[0].count === 1) {
    await client.query(
      `INSERT INTO student_achievements (student_id, achievement_type, title, description, icon, course_id, lesson_id)
       VALUES ($1, 'first_lesson', 'First Lesson Complete!', 'You completed your very first lesson!', '🌟', $2, $3)
       ON CONFLICT (student_id, achievement_type, course_id, lesson_id) DO NOTHING`,
      [studentId, courseId, lessonId]
    );
  }
  
  // Check if all lessons in course are completed
  const courseLessonsResult = await client.query(
    `SELECT COUNT(*) as total,
            COUNT(CASE WHEN slp.status = 'completed' THEN 1 END) as completed
     FROM lessons l
     LEFT JOIN student_lesson_progress slp ON slp.lesson_id = l.id AND slp.student_id = $1
     WHERE l.course_id = $2`,
    [studentId, courseId]
  );
  
  const { total, completed } = courseLessonsResult.rows[0];
  if (parseInt(total) === parseInt(completed) && parseInt(total) > 0) {
    await client.query(
      `INSERT INTO student_achievements (student_id, achievement_type, title, description, icon, course_id)
       VALUES ($1, 'course_complete', 'Course Master!', 'You completed the entire course!', '🏆', $2)
       ON CONFLICT (student_id, achievement_type, course_id, lesson_id) DO NOTHING`,
      [studentId, courseId]
    );
  }
}

/**
 * Update learning streak
 */
async function updateLearningStreak(client, studentId) {
  const today = new Date().toISOString().split('T')[0];
  
  const streakResult = await client.query(
    'SELECT * FROM learning_streaks WHERE student_id = $1',
    [studentId]
  );
  
  if (streakResult.rows.length === 0) {
    // Create new streak
    await client.query(
      'INSERT INTO learning_streaks (student_id, current_streak, longest_streak, last_activity_date) VALUES ($1, 1, 1, $2)',
      [studentId, today]
    );
  } else {
    const streak = streakResult.rows[0];
    const lastDate = streak.last_activity_date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let newStreak = streak.current_streak;
    
    if (lastDate === today) {
      // Already counted today
      return;
    } else if (lastDate === yesterdayStr) {
      // Consecutive day
      newStreak += 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
    
    const longestStreak = Math.max(newStreak, streak.longest_streak);
    
    await client.query(
      'UPDATE learning_streaks SET current_streak = $1, longest_streak = $2, last_activity_date = $3, updated_at = now() WHERE student_id = $4',
      [newStreak, longestStreak, today, studentId]
    );
    
    // Award streak achievements
    if (newStreak === 5) {
      await client.query(
        `INSERT INTO student_achievements (student_id, achievement_type, title, description, icon)
         VALUES ($1, 'streak_5', '5-Day Streak!', 'You learned for 5 days in a row!', '🔥')
         ON CONFLICT DO NOTHING`,
        [studentId]
      );
    }
  }
}

// ============================================================================
// GET /api/child/courses/:courseId
// Get course overview with progress and continue learning info
// ============================================================================
async function getCourseOverview(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { courseId } = req.params;
    
    // Get course info
    const courseResult = await query(
      `SELECT c.*, i.user_id as instructor_user_id, u.full_name as instructor_name,
              ag.name as age_group_name
       FROM courses c
       JOIN instructors i ON c.instructor_id = i.id
       JOIN users u ON i.user_id = u.id
       LEFT JOIN age_groups ag ON c.age_group_id = ag.id
       WHERE c.id = $1 AND c.status = 'published'`,
      [courseId]
    );
    
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const course = courseResult.rows[0];
    
    // Get all lessons with progress
    const lessonsResult = await query(
      `SELECT l.*, 
              slp.status as progress_status,
              slp.progress_percentage,
              slp.completed_at,
              slp.required_resources_completed,
              slp.total_required_resources
       FROM lessons l
       LEFT JOIN student_lesson_progress slp ON slp.lesson_id = l.id AND slp.student_id = $1
       WHERE l.course_id = $2
       ORDER BY l.order_index`,
      [studentId, courseId]
    );
    
    const lessons = lessonsResult.rows.map(lesson => ({
      ...lesson,
      status: lesson.progress_status || 'not_started',
      progress_percentage: lesson.progress_percentage || 0,
      is_locked: determineIfLessonIsLocked(lesson, lessonsResult.rows, course.sequential_learning)
    }));
    
    // Calculate overall course progress
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => l.status === 'completed').length;
    const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    
    // Get learning streak
    const streakResult = await query(
      'SELECT current_streak FROM learning_streaks WHERE student_id = $1',
      [studentId]
    );
    const currentStreak = streakResult.rows[0]?.current_streak || 0;
    
    // Find the next lesson to continue
    const nextLesson = findNextLesson(lessons);
    
    res.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        instructor_name: course.instructor_name,
        age_group_name: course.age_group_name,
        sequential_learning: course.sequential_learning,
        certificate_enabled: course.certificate_enabled
      },
      progress: {
        percentage: courseProgress,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        current_streak: currentStreak
      },
      lessons,
      next_lesson: nextLesson
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Determine if a lesson should be locked based on sequential learning
 */
function determineIfLessonIsLocked(lesson, allLessons, sequentialLearning) {
  if (!sequentialLearning) return false;

  // Rank lessons by their real order, then lock a lesson unless the one right
  // before it has been completed. This is the ONLY lock applied in the course.
  const sorted = [...allLessons].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id - b.id
  );
  const position = sorted.findIndex((l) => l.id === lesson.id);
  if (position <= 0) return false; // first lesson (or unknown) stays open

  return sorted[position - 1].progress_status !== 'completed';
}

/**
 * Find the next lesson the student should work on
 */
function findNextLesson(lessons) {
  // Find first incomplete lesson
  const inProgress = lessons.find(l => l.status === 'in_progress' && !l.is_locked);
  if (inProgress) return inProgress;
  
  const notStarted = lessons.find(l => l.status === 'not_started' && !l.is_locked);
  if (notStarted) return notStarted;
  
  return null; // All lessons completed
}

// ============================================================================
// GET /api/child/lessons/:lessonId
// Get lesson learning journey with all resources in order
// ============================================================================
async function getLessonJourney(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { lessonId } = req.params;

    // Guarantee this lesson's content has a database-backed order to display.
    await ensureLessonResources(lessonId);
    
    // Get lesson info
    const lessonResult = await query(
      `SELECT l.*, c.title as course_title, c.id as course_id, c.sequential_learning
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lesson = lessonResult.rows[0];

    // Sequential learning: block a lesson until the previous one is completed,
    // even if the child reaches it directly by URL or API call.
    const lessonAccess = await getLessonAccess(studentId, lessonId);
    if (lessonAccess.isLocked) {
      return res.status(403).json({
        error: 'This lesson is locked. Finish the previous lesson first.',
        code: 'LESSON_LOCKED',
      });
    }
    
    // Get lesson progress
    const progressResult = await query(
      'SELECT * FROM student_lesson_progress WHERE student_id = $1 AND lesson_id = $2',
      [studentId, lessonId]
    );
    const lessonProgress = progressResult.rows[0] || {
      status: 'not_started',
      progress_percentage: 0,
      required_resources_completed: 0,
      total_required_resources: 0
    };
    
    // Get all resources for this lesson
    const resourcesResult = await query(
      `SELECT lr.*,
              srp.status as progress_status,
              srp.progress_percentage,
              srp.completed_at,
              srp.time_spent_seconds
       FROM lesson_resources lr
       LEFT JOIN student_resource_progress srp ON srp.lesson_resource_id = lr.id AND srp.student_id = $1
       WHERE lr.lesson_id = $2
       ORDER BY lr.display_order`,
      [studentId, lessonId]
    );
    
    const resources = resourcesResult.rows.map((resource, index) => {
      const status = resource.progress_status || 'not_started';
      const isLocked = false; // a resource inside an open lesson is never locked
      
      return {
        id: resource.id,
        resource_type: resource.resource_type,
        resource_id: resource.resource_id,
        title: resource.title,
        description: resource.description,
        display_order: resource.display_order,
        is_required: resource.is_required,
        status,
        progress_percentage: resource.progress_percentage || 0,
        completed_at: resource.completed_at,
        time_spent_seconds: resource.time_spent_seconds || 0,
        is_locked: isLocked
      };
    });
    
    // Find current step
    const currentStep = findCurrentStep(resources);
    
    res.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        course_id: lesson.course_id,
        course_title: lesson.course_title,
        order_index: lesson.order_index
      },
      progress: lessonProgress,
      resources,
      current_step: currentStep
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Find the current step (next incomplete required resource)
 */
function findCurrentStep(resources) {
  const inProgress = resources.find(r => r.status === 'in_progress' && !r.is_locked && r.is_required);
  if (inProgress) return inProgress;
  
  const notStarted = resources.find(r => r.status === 'not_started' && !r.is_locked && r.is_required);
  if (notStarted) return notStarted;
  
  // All required steps complete, return first optional or null
  const optionalNotStarted = resources.find(r => r.status === 'not_started' && !r.is_locked && !r.is_required);
  return optionalNotStarted || null;
}

// ============================================================================
// GET /api/child/resources/:resourceType/:resourceId
// Get specific resource details with progress
// ============================================================================
async function getResourceDetail(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { resourceType, resourceId } = req.params;

    // Never hand a child a locked resource, even via a direct API call.
    const resourceAccess = await getResourceAccess(studentId, resourceType, resourceId);
    if (!resourceAccess.exists) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (resourceAccess.isLocked) {
      return res.status(403).json({
        error: 'This step is locked. Complete the previous required step first.',
        code: 'RESOURCE_LOCKED',
      });
    }
    
    let resource = null;
    let progress = null;
    
    if (resourceType === 'video') {
      const videoResult = await query('SELECT * FROM videos WHERE id = $1', [resourceId]);
      resource = videoResult.rows[0];
      
      const progressResult = await query(
        'SELECT * FROM student_video_progress WHERE student_id = $1 AND video_id = $2',
        [studentId, resourceId]
      );
      progress = progressResult.rows[0] || {
        watch_percentage: 0,
        current_position_seconds: 0,
        completed: false,
        required_percentage: 90
      };
    } else if (resourceType === 'material') {
      const materialResult = await query('SELECT * FROM learning_materials WHERE id = $1', [resourceId]);
      resource = materialResult.rows[0];
      
      const progressResult = await query(
        'SELECT * FROM student_material_progress WHERE student_id = $1 AND material_id = $2',
        [studentId, resourceId]
      );
      progress = progressResult.rows[0] || {
        view_percentage: 0,
        pages_viewed: 0,
        total_pages: 1,
        completed: false,
        required_percentage: 80
      };
    } else if (resourceType === 'activity') {
      const activityResult = await query('SELECT * FROM activities WHERE id = $1', [resourceId]);
      resource = activityResult.rows[0];
      
      const submissionResult = await query(
        'SELECT * FROM activity_submissions WHERE student_id = $1 AND activity_id = $2 ORDER BY submitted_at DESC LIMIT 1',
        [studentId, resourceId]
      );
      progress = submissionResult.rows[0] || { status: 'not_started' };
    } else if (resourceType === 'quiz') {
      const quizResult = await query('SELECT * FROM quizzes WHERE id = $1', [resourceId]);
      resource = quizResult.rows[0];
      
      const attemptResult = await query(
        'SELECT * FROM quiz_results WHERE student_id = $1 AND quiz_id = $2 ORDER BY submitted_at DESC LIMIT 1',
        [studentId, resourceId]
      );
      progress = attemptResult.rows[0] || { status: 'not_started' };
    }
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({ resource, progress });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Merge overlapping/consecutive watched intervals into true unique watched seconds.
function mergeWatchIntervals(intervals) {
  if (!intervals || intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => Number(a.start_seconds) - Number(b.start_seconds));
  const merged = [];
  let current = { start: Number(sorted[0].start_seconds), end: Number(sorted[0].end_seconds) };
  for (let i = 1; i < sorted.length; i++) {
    const nextStart = Number(sorted[i].start_seconds);
    const nextEnd = Number(sorted[i].end_seconds);
    if (nextStart <= current.end) {
      current.end = Math.max(current.end, nextEnd);
    } else {
      merged.push(current);
      current = { start: nextStart, end: nextEnd };
    }
  }
  merged.push(current);
  const totalSeconds = merged.reduce((acc, intv) => acc + Math.max(0, intv.end - intv.start), 0);
  return Math.round(totalSeconds);
}

// POST /api/child/progress/video/:videoId
// Update video watching progress
// ============================================================================
async function updateVideoProgress(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { videoId } = req.params;
    const { current_position_seconds, duration_seconds, interval, position } = req.body;

    // The child must be allowed to reach this video at all.
    const access = await getResourceAccess(studentId, 'video', videoId);
    if (!access.exists) {
      return res.status(404).json({ error: 'Video not found' });
    }
    if (access.isLocked) {
      return res.status(403).json({ error: 'This step is locked.', code: 'RESOURCE_LOCKED' });
    }

    const videoRes = await query('SELECT duration_seconds FROM videos WHERE id = $1', [videoId]);
    const clientDuration = Math.max(1, Number(duration_seconds) || 0);
    const storedDuration = Math.max(0, Number(videoRes.rows[0]?.duration_seconds) || 0);
    const effectiveDuration = Math.max(1, clientDuration, storedDuration);

    // Record only a GENUINE watched interval: the delta between consecutive
    // playback positions while the video was actually playing. Seeking forward
    // produces a delta larger than the threshold and is rejected, so skipped
    // content is never counted as watched (prompt section 10).
    const from = Number(position?.from ?? interval?.start);
    const to = Number(position?.to ?? interval?.end ?? current_position_seconds);
    if (Number.isFinite(from) && Number.isFinite(to)) {
      const startSec = Math.max(0, Math.min(from, to));
      const endSec = Math.min(effectiveDuration, Math.max(from, to));
      const delta = endSec - startSec;
      if (delta > 0 && delta <= 15) {
        await query(
          `INSERT INTO student_video_watch_intervals (student_id, video_id, start_seconds, end_seconds)
           VALUES ($1, $2, $3, $4)`,
          [studentId, videoId, startSec, endSec]
        );
      }
    }

    const intervalsRes = await query(
      `SELECT start_seconds, end_seconds FROM student_video_watch_intervals
       WHERE student_id = $1 AND video_id = $2`,
      [studentId, videoId]
    );
    const uniqueWatched = mergeWatchIntervals(intervalsRes.rows);
    const watchPct = Math.min(100, Math.round((uniqueWatched / effectiveDuration) * 100));
    const isCompleted = watchPct >= 90;
    const status = isCompleted ? 'completed' : uniqueWatched > 0 ? 'in_progress' : 'not_started';
    const lastPosition = Math.round(Number(current_position_seconds ?? to) || 0);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO student_video_progress (
          student_id, video_id, duration_seconds, watched_seconds, last_position_seconds,
          progress_percentage, status, watch_percentage, current_position_seconds,
          completed, last_watched_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
        ON CONFLICT (student_id, video_id)
        DO UPDATE SET
          duration_seconds = GREATEST(student_video_progress.duration_seconds, EXCLUDED.duration_seconds),
          watched_seconds = GREATEST(student_video_progress.watched_seconds, EXCLUDED.watched_seconds),
          last_position_seconds = EXCLUDED.last_position_seconds,
          progress_percentage = GREATEST(student_video_progress.progress_percentage, EXCLUDED.progress_percentage),
          watch_percentage = GREATEST(student_video_progress.watch_percentage, EXCLUDED.watch_percentage),
          current_position_seconds = EXCLUDED.current_position_seconds,
          status = CASE WHEN student_video_progress.status = 'completed' THEN 'completed' ELSE EXCLUDED.status END,
          completed = student_video_progress.completed OR EXCLUDED.completed,
          last_watched_at = now(),
          updated_at = now()`,
        [studentId, videoId, effectiveDuration, uniqueWatched, lastPosition, watchPct, status, watchPct, lastPosition, isCompleted]
      );

      await updateResourceProgressFromVideo(client, studentId, videoId, isCompleted);
      await updateLearningStreak(client, studentId);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      progress: {
        watched_seconds: uniqueWatched,
        duration_seconds: effectiveDuration,
        watch_percentage: watchPct,
        current_position_seconds: lastPosition,
        required_percentage: 90,
        completed: isCompleted,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateResourceProgressFromVideo(client, studentId, videoId, completed) {
  // Find the lesson_resource entry for this video
  const resourceResult = await client.query(
    'SELECT id, lesson_id FROM lesson_resources WHERE resource_type = $1 AND resource_id = $2',
    ['video', videoId]
  );
  
  if (resourceResult.rows.length === 0) return;
  
  const lessonResource = resourceResult.rows[0];
  const status = completed ? 'completed' : 'in_progress';
  const progressPercentage = completed ? 100 : 0;
  
  await client.query(
    `INSERT INTO student_resource_progress (
      student_id, lesson_resource_id, status, progress_percentage,
      started_at, completed_at, last_accessed_at, updated_at
    ) VALUES ($1, $2, $3, $4, now(), 
      CASE WHEN $3 = 'completed' THEN now() ELSE NULL END, 
      now(), now())
    ON CONFLICT (student_id, lesson_resource_id)
    DO UPDATE SET
      status = $3,
      progress_percentage = $4,
      started_at = COALESCE(student_resource_progress.started_at, now()),
      completed_at = CASE WHEN $3 = 'completed' THEN COALESCE(student_resource_progress.completed_at, now()) ELSE NULL END,
      last_accessed_at = now(),
      updated_at = now()`,
    [studentId, lessonResource.id, status, progressPercentage]
  );
  
  // Update lesson progress
  await updateLessonProgress(client, studentId, lessonResource.lesson_id);
}

// ============================================================================
// POST /api/child/progress/material/:materialId
// Update material viewing progress
// ============================================================================
async function updateMaterialProgress(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { materialId } = req.params;
    const { pages_viewed, total_pages, view_percentage } = req.body;

    const access = await getResourceAccess(studentId, 'material', materialId);
    if (!access.exists) {
      return res.status(404).json({ error: 'Material not found' });
    }
    if (access.isLocked) {
      return res.status(403).json({ error: 'This step is locked.', code: 'RESOURCE_LOCKED' });
    }

    // Completion is derived from real reading/viewing rather than a
    // client-supplied flag: PDFs need 80% of pages, audio needs 90% listened.
    const pages = Math.max(0, Number(pages_viewed) || 0);
    const total = Math.max(0, Number(total_pages) || 0);
    let viewPct = 0;
    let isCompleted = false;
    let requiredPct = 100;
    if (total > 1) {
      viewPct = Math.min(100, Math.round((Math.max(1, pages) / total) * 100));
      isCompleted = viewPct >= 80;
      requiredPct = 80;
    } else if (view_percentage != null) {
      viewPct = Math.min(100, Math.max(0, Number(view_percentage) || 0));
      isCompleted = viewPct >= 90;
      requiredPct = 90;
    } else {
      // images / documents / other: opening the viewer is sufficient
      viewPct = 100;
      isCompleted = true;
    }
    const status = isCompleted ? 'completed' : viewPct > 0 ? 'in_progress' : 'not_started';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO student_material_progress (
          student_id, material_id, pages_viewed, total_pages, view_percentage,
          progress_percentage, completed, status, last_viewed_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
        ON CONFLICT (student_id, material_id)
        DO UPDATE SET
          pages_viewed = GREATEST(student_material_progress.pages_viewed, EXCLUDED.pages_viewed),
          total_pages = EXCLUDED.total_pages,
          view_percentage = GREATEST(student_material_progress.view_percentage, EXCLUDED.view_percentage),
          progress_percentage = GREATEST(student_material_progress.progress_percentage, EXCLUDED.progress_percentage),
          completed = student_material_progress.completed OR EXCLUDED.completed,
          status = CASE WHEN student_material_progress.status = 'completed' THEN 'completed' ELSE EXCLUDED.status END,
          last_viewed_at = now(),
          updated_at = now()
        RETURNING *`,
        [studentId, materialId, pages, total || 1, viewPct, viewPct, isCompleted, status]
      );

      const materialProgress = result.rows[0];

      await updateResourceProgressFromMaterial(client, studentId, materialId, isCompleted);
      await updateLearningStreak(client, studentId);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      progress: {
        ...materialProgress,
        view_percentage: viewPct,
        completed: isCompleted,
        required_percentage: requiredPct,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateResourceProgressFromMaterial(client, studentId, materialId, completed) {
  const resourceResult = await client.query(
    'SELECT id, lesson_id FROM lesson_resources WHERE resource_type = $1 AND resource_id = $2',
    ['material', materialId]
  );
  
  if (resourceResult.rows.length === 0) return;
  
  const lessonResource = resourceResult.rows[0];
  const status = completed ? 'completed' : 'in_progress';
  const progressPercentage = completed ? 100 : 0;
  
  await client.query(
    `INSERT INTO student_resource_progress (
      student_id, lesson_resource_id, status, progress_percentage,
      started_at, completed_at, last_accessed_at, updated_at
    ) VALUES ($1, $2, $3, $4, now(),
      CASE WHEN $3 = 'completed' THEN now() ELSE NULL END,
      now(), now())
    ON CONFLICT (student_id, lesson_resource_id)
    DO UPDATE SET
      status = $3,
      progress_percentage = $4,
      started_at = COALESCE(student_resource_progress.started_at, now()),
      completed_at = CASE WHEN $3 = 'completed' THEN COALESCE(student_resource_progress.completed_at, now()) ELSE NULL END,
      last_accessed_at = now(),
      updated_at = now()`,
    [studentId, lessonResource.id, status, progressPercentage]
  );
  
  await updateLessonProgress(client, studentId, lessonResource.lesson_id);
}

// ============================================================================
// POST /api/child/progress/activity/:activityId/complete
// Mark activity as completed (after submission)
// ============================================================================
async function completeActivity(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { activityId } = req.params;

    // The activity must be reachable, and the child must have actually
    // submitted it before we record completion. Opening it never counts
    // (prompt section 9 / 12).
    const access = await getResourceAccess(studentId, 'activity', activityId);
    if (!access.exists) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    if (access.isLocked) {
      return res.status(403).json({ error: 'This step is locked.', code: 'RESOURCE_LOCKED' });
    }

    const submission = await query(
      `SELECT id FROM activity_submissions
       WHERE activity_id = $1 AND student_id = $2
       ORDER BY submitted_at DESC NULLS LAST LIMIT 1`,
      [activityId, studentId]
    );
    const progressRow = await query(
      'SELECT status FROM student_activity_progress WHERE activity_id = $1 AND student_id = $2',
      [activityId, studentId]
    );
    const verified = submission.rows.length > 0 || progressRow.rows[0]?.status === 'completed';
    if (!verified) {
      return res.status(400).json({
        error: 'Submit the activity before marking it complete.',
        code: 'ACTIVITY_NOT_SUBMITTED',
      });
    }

    const lessonResourceId = access.lessonResourceId;
    if (!lessonResourceId) {
      return res.status(404).json({ error: 'Activity is not part of a lesson journey' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO student_resource_progress (
          student_id, lesson_resource_id, status, progress_percentage,
          started_at, completed_at, last_accessed_at, updated_at
        ) VALUES ($1, $2, 'completed', 100, now(), now(), now(), now())
        ON CONFLICT (student_id, lesson_resource_id)
        DO UPDATE SET
          status = 'completed',
          progress_percentage = 100,
          started_at = COALESCE(student_resource_progress.started_at, now()),
          completed_at = COALESCE(student_resource_progress.completed_at, now()),
          last_accessed_at = now(),
          updated_at = now()`,
        [studentId, lessonResourceId]
      );

      await updateLessonProgress(client, studentId, access.lessonId);
      await updateLearningStreak(client, studentId);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// POST /api/child/progress/quiz/:quizId/complete
// Mark quiz as completed (after submission)
// ============================================================================
async function completeQuiz(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { quizId } = req.params;

    const access = await getResourceAccess(studentId, 'quiz', quizId);
    if (!access.exists) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    if (access.isLocked) {
      return res.status(403).json({ error: 'This step is locked.', code: 'RESOURCE_LOCKED' });
    }

    // Only a passing attempt recorded by the server-side grader unlocks this
    // step; a client cannot simply POST "completed" (prompt section 13 / 22).
    const attempt = await query(
      `SELECT passed FROM student_quiz_attempts
       WHERE quiz_id = $1 AND student_id = $2
       ORDER BY submitted_at DESC NULLS LAST LIMIT 1`,
      [quizId, studentId]
    );
    if (attempt.rows[0]?.passed !== true) {
      return res.status(400).json({
        error: 'Pass the quiz before marking it complete.',
        code: 'QUIZ_NOT_PASSED',
      });
    }

    const lessonResourceId = access.lessonResourceId;
    if (!lessonResourceId) {
      return res.status(404).json({ error: 'Quiz is not part of a lesson journey' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO student_resource_progress (
          student_id, lesson_resource_id, status, progress_percentage,
          started_at, completed_at, last_accessed_at, updated_at
        ) VALUES ($1, $2, 'completed', 100, now(), now(), now(), now())
        ON CONFLICT (student_id, lesson_resource_id)
        DO UPDATE SET
          status = 'completed',
          progress_percentage = 100,
          started_at = COALESCE(student_resource_progress.started_at, now()),
          completed_at = COALESCE(student_resource_progress.completed_at, now()),
          last_accessed_at = now(),
          updated_at = now()`,
        [studentId, lessonResourceId]
      );

      await updateLessonProgress(client, studentId, access.lessonId);
      await updateLearningStreak(client, studentId);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// GET /api/child/achievements
// Get student achievements
// ============================================================================
async function getAchievements(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const result = await query(
      'SELECT * FROM student_achievements WHERE student_id = $1 ORDER BY earned_at DESC',
      [studentId]
    );
    
    res.json({ achievements: result.rows });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// POST /api/child/sessions/start
// Start a learning session
// ============================================================================
async function startLearningSession(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { course_id, lesson_id } = req.body;
    
    const result = await query(
      'INSERT INTO learning_sessions (student_id, course_id, lesson_id) VALUES ($1, $2, $3) RETURNING id',
      [studentId, course_id || null, lesson_id || null]
    );
    
    res.json({ session_id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// POST /api/child/sessions/:sessionId/end
// End a learning session
// ============================================================================
async function endLearningSession(req, res, next) {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      return res.status(403).json({ error: 'Student access required' });
    }
    
    const { sessionId } = req.params;
    const { activities_completed, resources_accessed } = req.body;
    
    await query(
      `UPDATE learning_sessions 
       SET session_end = now(), 
           duration_seconds = EXTRACT(EPOCH FROM (now() - session_start)),
           activities_completed = $1,
           resources_accessed = $2
       WHERE id = $3 AND student_id = $4`,
      [activities_completed || 0, resources_accessed || 0, sessionId, studentId]
    );
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCourseOverview,
  getLessonJourney,
  getResourceDetail,
  updateVideoProgress,
  updateMaterialProgress,
  completeActivity,
  completeQuiz,
  getAchievements,
  startLearningSession,
  endLearningSession
};
