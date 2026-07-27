const { query } = require('../config/db');
const { getStudentIdForUser, getParentIdForUser } = require('../utils/roleHelpers');

// ----------------------------------------------------------------------------
// This is a rule-based first version of the AI module described in the
// documentation. It analyzes real quiz/activity results already in the
// database and produces recommendations using transparent heuristics:
//
//   - A lesson where the student's average score is below WEAK_THRESHOLD
//     is flagged as a weak subject -> recommend revision content for it.
//   - A course where every existing lesson is completed at a healthy score
//     -> recommend the next unlocked lesson to keep momentum.
//   - Activities/quizzes never attempted in an in-progress course are
//     recommended as practice material.
//
// This can be swapped for the scikit-learn model later without changing the
// API contract — callers only ever see rows from ai_recommendations.
// ----------------------------------------------------------------------------
const WEAK_THRESHOLD = 0.6; // below 60% average = weak subject

async function assertCanViewStudent(req, res, studentId) {
  if (req.user.role === 'admin' || req.user.role === 'instructor') return true;
  if (req.user.role === 'student') {
    const ownId = await getStudentIdForUser(req.user.id);
    if (String(ownId) === String(studentId)) return true;
  }
  if (req.user.role === 'parent') {
    const parentId = await getParentIdForUser(req.user.id);
    const owns = await query('SELECT 1 FROM students WHERE id = $1 AND parent_id = $2', [
      studentId,
      parentId,
    ]);
    if (owns.rows.length > 0) return true;
  }
  res.status(403).json({ error: 'You do not have permission to view this student' });
  return false;
}

// ----------------------------------------------------------------------------
// POST /api/ai/recommendations/:studentId/generate
// ----------------------------------------------------------------------------
async function generateRecommendations(req, res, next) {
  try {
    const { studentId } = req.params;
    const allowed = await assertCanViewStudent(req, res, studentId);
    if (!allowed) return;

    const generated = [];

    // 1. Weak lessons from quiz performance -> recommend revision
    const weakQuizLessons = await query(
      `SELECT l.id AS lesson_id, l.title, AVG(qr.score / NULLIF(qr.total_points, 0)) AS avg_ratio
       FROM quiz_results qr
       JOIN quizzes q ON q.id = qr.quiz_id
       JOIN lessons l ON l.id = q.lesson_id
       WHERE qr.student_id = $1
       GROUP BY l.id, l.title
       HAVING AVG(qr.score / NULLIF(qr.total_points, 0)) < $2`,
      [studentId, WEAK_THRESHOLD]
    );
    for (const row of weakQuizLessons.rows) {
      generated.push({
        type: 'revision',
        item_id: row.lesson_id,
        reason: `Quiz average for "${row.title}" is ${Math.round(row.avg_ratio * 100)}% — below target`,
        confidence: 1 - row.avg_ratio,
      });
    }

    // 2. Weak lessons from activity grades -> recommend practice material
    const weakActivityLessons = await query(
      `SELECT l.id AS lesson_id, l.title, AVG(sub.score / NULLIF(a.max_score, 0)) AS avg_ratio
       FROM activity_submissions sub
       JOIN activities a ON a.id = sub.activity_id
       JOIN lessons l ON l.id = a.lesson_id
       WHERE sub.student_id = $1 AND sub.status = 'graded'
       GROUP BY l.id, l.title
       HAVING AVG(sub.score / NULLIF(a.max_score, 0)) < $2`,
      [studentId, WEAK_THRESHOLD]
    );
    for (const row of weakActivityLessons.rows) {
      generated.push({
        type: 'practice_material',
        item_id: row.lesson_id,
        reason: `Activity average for "${row.title}" is ${Math.round(row.avg_ratio * 100)}% — below target`,
        confidence: 1 - row.avg_ratio,
      });
    }

    // 3. Next unlocked lesson in courses the student is actively progressing through
    const nextLessons = await query(
      `SELECT DISTINCT ON (p.course_id) l.id AS lesson_id, l.title, c.title AS course_title
       FROM progress p
       JOIN courses c ON c.id = p.course_id
       JOIN lessons l ON l.course_id = c.id
       WHERE p.student_id = $1
         AND l.order_index > (
           SELECT COALESCE(MAX(l2.order_index), -1)
           FROM progress p2
           JOIN lessons l2 ON l2.id = p2.lesson_id
           WHERE p2.student_id = $1 AND p2.course_id = p.course_id AND p2.status = 'completed'
         )
       ORDER BY p.course_id, l.order_index
       LIMIT 5`,
      [studentId]
    );
    for (const row of nextLessons.rows) {
      generated.push({
        type: 'lesson',
        item_id: row.lesson_id,
        reason: `Next lesson in "${row.course_title}"`,
        confidence: 0.8,
      });
    }

    // Persist and return
    const saved = [];
    for (const rec of generated) {
      const result = await query(
        `INSERT INTO ai_recommendations (student_id, recommendation_type, recommended_item_id, reason, confidence_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [studentId, rec.type, rec.item_id, rec.reason, Math.min(0.99, Math.max(0.01, rec.confidence))]
      );
      saved.push(result.rows[0]);
    }

    res.status(201).json({ recommendations: saved });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/ai/recommendations/:studentId
// ----------------------------------------------------------------------------
async function listRecommendations(req, res, next) {
  try {
    const { studentId } = req.params;
    const allowed = await assertCanViewStudent(req, res, studentId);
    if (!allowed) return;

    const result = await query(
      `SELECT * FROM ai_recommendations WHERE student_id = $1 ORDER BY generated_at DESC LIMIT 20`,
      [studentId]
    );
    res.json({ recommendations: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateRecommendations, listRecommendations };
