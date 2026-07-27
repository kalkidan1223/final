const { query } = require('../config/db');
const { getInstructorIdForUser, getParentIdForUser, getStudentIdForUser } = require('../utils/roleHelpers');
const { loadActivityWithContext } = require('./activitiesController');
const { upsertLessonProgress } = require('../utils/progress');
const { createNotification } = require('./notificationsController');

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
        'SELECT 1 FROM students WHERE id = $1 AND parent_id = $2',
        [student_id, parentId]
      );
      if (ownsChild.rows.length === 0) {
        return res.status(403).json({ error: 'This student is not linked to your account' });
      }
      studentId = student_id;
      submittedBy = 'parent';
    } else {
      return res.status(403).json({ error: 'Only students or parents can submit activities' });
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

    let sql = `SELECT sub.*, s.full_name AS student_name
               FROM activity_submissions sub
               JOIN students s ON s.id = sub.student_id
               WHERE sub.activity_id = $1`;
    const params = [activityId];

    if (req.user.role === 'instructor') {
      const instructorId = await getInstructorIdForUser(req.user.id);
      if (instructorId !== activity.owner_instructor_id) {
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
// Grading also advances the student's lesson progress.
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
      `SELECT sub.*, a.lesson_id, a.max_score, l.course_id, c.instructor_id AS owner_instructor_id
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

    if (req.user.role !== 'admin') {
      const instructorId = await getInstructorIdForUser(req.user.id);
      if (!instructorId || instructorId !== submission.owner_instructor_id) {
        return res.status(403).json({ error: 'You do not have permission to review this submission' });
      }
    }

    if (status === 'graded' && score > submission.max_score) {
      return res.status(400).json({ error: `score cannot exceed max_score (${submission.max_score})` });
    }

    const reviewerInstructorId = await getInstructorIdForUser(req.user.id);
    const result = await query(
      `UPDATE activity_submissions
       SET status = $1, score = $2, feedback = $3, reviewed_by = $4, reviewed_at = now()
       WHERE id = $5
       RETURNING *`,
      [status, status === 'graded' ? score : null, feedback || null, reviewerInstructorId, id]
    );

    if (status === 'graded') {
      const completionPct = submission.max_score > 0 ? (score / submission.max_score) * 100 : 100;
      await upsertLessonProgress(
        submission.student_id,
        submission.course_id,
        submission.lesson_id,
        'completed',
        completionPct
      );
    }

    // Notify whoever is on the account attached to this student, plus the
    // linked parent (covers both the 11-12 self-managed and 5-10 parent-managed cases).
    const studentAccount = await query(
      `SELECT u.id AS user_id, p.user_id AS parent_user_id
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       JOIN parents p ON p.id = s.parent_id
       WHERE s.id = $1`,
      [submission.student_id]
    );
    const recipients = studentAccount.rows[0];
    const notifTitle = status === 'graded' ? 'Activity graded' : 'Activity reviewed';
    const notifMessage = feedback || (status === 'graded' ? `Score: ${score}/${submission.max_score}` : 'Your submission was reviewed.');
    if (recipients?.user_id) {
      await createNotification(recipients.user_id, 'feedback', notifTitle, notifMessage);
    }
    if (recipients?.parent_user_id) {
      await createNotification(recipients.parent_user_id, 'feedback', notifTitle, notifMessage);
    }

    res.json({ submission: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { createSubmission, listSubmissionsForActivity, reviewSubmission };
