const { query } = require('../config/db');
const { getInstructorIdForUser, getParentIdForUser, getStudentIdForUser } = require('../utils/roleHelpers');
const { loadActivityWithContext } = require('./activitiesController');
const { upsertLessonProgress } = require('../utils/progress');
const { createNotification } = require('./notificationsController');
const { canReadCourse, canManageCourse } = require('../utils/courseAccess');

// ----------------------------------------------------------------------------
// POST /api/activities/:id/submissions
//
// Who may submit depends on the STUDENT's age category, not the requester's
// role alone:
//   - A student (11-12) submits their own work: submitted_by = 'student'.
//   - A parent submits on behalf of ANY of their linked children — required
//     for a 5-10 child (who has no login), and also allowed for an 11-12
//     child if the parent is helping: submitted_by = 'parent'.
// The request must always resolve to a real parent-child relationship or the
// student's own account — never an arbitrary student_id.
// ----------------------------------------------------------------------------
async function createSubmission(req, res, next) {
  try {
    const { id: activityId } = req.params;
    const activity = await loadActivityWithContext(activityId);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    if (!(await canReadCourse(req.user, { ...activity, grade_level_id: activity.course_grade_level_id }))) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const { submission_url, submission_text } = req.body;
    if (activity.requires_upload && !submission_url) {
      return res.status(400).json({ error: 'This activity requires an uploaded file (submission_url)' });
    }

    let studentId;
    let submittedBy;

    if (req.user.role === 'student') {
      studentId = await getStudentIdForUser(req.user.id);
      if (!studentId) return res.status(403).json({ error: 'No student profile linked to this account' });
      submittedBy = 'student';
    } else if (req.user.role === 'parent') {
      const { student_id } = req.body;
      if (!student_id) {
        return res.status(400).json({ error: 'student_id is required when a parent submits' });
      }
      const parentId = await getParentIdForUser(req.user.id);
      const ownsChild = await query(
        'SELECT 1 FROM students WHERE id = $1 AND parent_id = $2 AND grade_level_id = $3 AND is_active = TRUE',
        [student_id, parentId, activity.course_grade_level_id]
      );
      if (ownsChild.rows.length === 0) {
        return res.status(403).json({ error: 'This student is not linked to your account' });
      }
      studentId = student_id;
      submittedBy = 'parent';
    } else {
      return res.status(403).json({ error: 'Only students or parents can submit activities' });
    }

    const eligibleStudent = await query(
      'SELECT 1 FROM students WHERE id = $1 AND grade_level_id = $2 AND is_active = TRUE',
      [studentId, activity.course_grade_level_id]
    );
    if (eligibleStudent.rows.length === 0) {
      return res.status(403).json({ error: 'This activity is not available for this student' });
    }

    const result = await query(
      `INSERT INTO activity_submissions
         (activity_id, student_id, submitted_by, submission_url, submission_text, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [activityId, studentId, submittedBy, submission_url || null, submission_text || null]
    );

    res.status(201).json({ submission: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/activities/:id/submissions
// Instructor/admin see all submissions; a parent sees only their children's.
// ----------------------------------------------------------------------------
async function listSubmissionsForActivity(req, res, next) {
  try {
    const { id: activityId } = req.params;
    const activity = await loadActivityWithContext(activityId);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    if (!(await canReadCourse(req.user, { ...activity, grade_level_id: activity.course_grade_level_id }))) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    let sql = `SELECT sub.*, s.full_name AS student_name
               FROM activity_submissions sub
               JOIN students s ON s.id = sub.student_id
               WHERE sub.activity_id = $1`;
    const params = [activityId];

    if (req.user.role === 'instructor') {
      const allowed = await canManageCourse(req.user, activity.course_id);
      if (!allowed) {
        return res.status(403).json({ error: 'You do not have permission to view these submissions' });
      }
    } else if (req.user.role === 'parent') {
      const parentId = await getParentIdForUser(req.user.id);
      sql += ' AND s.parent_id = $2';
      params.push(parentId);
    } else if (req.user.role === 'student') {
      const studentId = await getStudentIdForUser(req.user.id);
      sql += ' AND sub.student_id = $2';
      params.push(studentId);
    }
    // admin: no extra filter

    sql += ' ORDER BY sub.submitted_at DESC';
    const result = await query(sql, params);
    res.json({ submissions: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/submissions/:id/review  (owning instructor or admin)
// Body: { status: 'reviewed' | 'graded', score, feedback }
// Grading also advances the student's lesson progress and returns results.
// ----------------------------------------------------------------------------
async function reviewSubmission(req, res, next) {
  try {
    const { id } = req.params;
    const { status, score, feedback } = req.body;

    if (!['reviewed', 'graded'].includes(status)) {
      return res.status(400).json({ error: "status must be 'reviewed' or 'graded'" });
    }
    if (status === 'graded' && (score === undefined || score === null)) {
      return res.status(400).json({ error: 'score is required when grading' });
    }

    const submissionResult = await query(
      `SELECT sub.*, a.title AS activity_title, a.lesson_id, a.max_score, l.course_id, c.instructor_id AS owner_instructor_id
       FROM activity_submissions sub
       JOIN activities a ON a.id = sub.activity_id
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE sub.id = $1`,
      [id]
    );
    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    const submission = submissionResult.rows[0];

    const allowed = await canManageCourse(req.user, submission.course_id);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to review this submission' });
    }

    if (status === 'graded' && (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > Number(submission.max_score))) {
      return res.status(400).json({ error: `score must be between 0 and ${submission.max_score}` });
    }

    const percentage = status === 'graded' && submission.max_score > 0
      ? Math.min(100, Math.max(0, Math.round((Number(score) / Number(submission.max_score)) * 100 * 10) / 10))
      : (status === 'graded' ? 100 : null);

    const reviewerInstructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `UPDATE activity_submissions
       SET status = $1, score = $2, percentage = $3, feedback = $4, reviewed_by = $5, reviewed_at = now(), graded_at = now()
       WHERE id = $6
       RETURNING *`,
      [status, status === 'graded' ? Number(score) : null, percentage, feedback || null, reviewerInstructorId, id]
    );

    if (status === 'graded') {
      const completionPct = percentage || 100;
      await upsertLessonProgress(
        submission.student_id,
        submission.course_id,
        submission.lesson_id,
        'completed',
        completionPct
      );
    }

    // Notify child through child_notifications (for Category 1 ages 5-9 & direct)
    const notifTitle = status === 'graded' ? `Activity graded: ${submission.activity_title}` : `Activity reviewed: ${submission.activity_title}`;
    const notifMessage = feedback || (status === 'graded' ? `Score: ${score}/${submission.max_score} (${percentage}%)` : 'Your submission was reviewed.');

    try {
      await query(
        `INSERT INTO child_notifications (
           student_id, type, title, message, related_course_id, related_lesson_id, related_activity_id, related_result_id
         ) VALUES ($1, 'activity_graded', $2, $3, $4, $5, $6, $7)`,
        [
          submission.student_id,
          notifTitle,
          notifMessage,
          submission.course_id,
          submission.lesson_id,
          submission.activity_id,
          submission.id
        ]
      );
    } catch (notifErr) {
      console.warn('Child notification warning:', notifErr.message);
    }

    // Also notify account user / parent
    const studentAccount = await query(
      `SELECT u.id AS user_id, p.user_id AS parent_user_id
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       JOIN parents p ON p.id = s.parent_id
       WHERE s.id = $1`,
      [submission.student_id]
    );
    const recipients = studentAccount.rows[0];
    if (recipients?.user_id) {
      await createNotification(recipients.user_id, 'feedback', notifTitle, notifMessage).catch(() => {});
    }
    if (recipients?.parent_user_id) {
      await createNotification(recipients.parent_user_id, 'feedback', notifTitle, notifMessage).catch(() => {});
    }

    res.json({ submission: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { createSubmission, listSubmissionsForActivity, reviewSubmission };
