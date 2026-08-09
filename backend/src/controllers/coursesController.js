const { query } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');
const { canReadCourse } = require('../utils/courseAccess');

const VALID_STATUSES = ['draft', 'published', 'archived'];

// Loads the course and confirms the current user is allowed to modify it
// (the owning instructor, or an admin). Returns the course row or null and
// writes the appropriate error response itself.
async function loadOwnedCourse(req, res) {
  const { id } = req.params;
  const result = await query('SELECT * FROM courses WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Course not found' });
    return null;
  }
  const course = result.rows[0];

  if (req.user.role === 'admin') return course;

  const instructorId = await getInstructorIdForUser(req.user.id);
  if (!instructorId || course.instructor_id !== instructorId) {
    res.status(403).json({ error: 'You do not have permission to modify this course' });
    return null;
  }
  return course;
}

// ----------------------------------------------------------------------------
// POST /api/courses  (instructor only)
// ----------------------------------------------------------------------------
async function createCourse(req, res, next) {
  try {
    const { title, description, age_group_id, thumbnail_url } = req.body;
    if (!title || !age_group_id) {
      return res.status(400).json({ error: 'title and age_group_id are required' });
    }

    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) {
      return res.status(403).json({ error: 'Only instructors can create courses' });
    }

    const ageGroupExists = await query('SELECT 1 FROM age_groups WHERE id = $1', [age_group_id]);
    if (ageGroupExists.rows.length === 0) {
      return res.status(400).json({ error: 'Unknown age_group_id' });
    }

    const result = await query(
      `INSERT INTO courses (instructor_id, age_group_id, title, description, thumbnail_url, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING *`,
      [instructorId, age_group_id, title, description || null, thumbnail_url || null]
    );

    res.status(201).json({ course: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getMyInstructorDashboard(req, res, next) {
  try {
    const instructorId = await getInstructorIdForUser(req.user.id);
    if (!instructorId) return res.status(403).json({ error: 'Instructor profile not found' });

    const [summary, recentCourses] = await Promise.all([
      query(
        `SELECT
          (SELECT COUNT(*)::int FROM courses WHERE instructor_id = $1) AS assigned_courses,
          (SELECT COUNT(*)::int FROM lessons l JOIN courses c ON c.id = l.course_id WHERE c.instructor_id = $1) AS total_lessons,
          (SELECT COUNT(DISTINCT s.id)::int FROM students s JOIN courses c ON c.age_group_id = s.age_group_id WHERE c.instructor_id = $1 AND s.is_active = TRUE) AS total_students,
          (SELECT COUNT(DISTINCT s.id)::int FROM students s JOIN courses c ON c.age_group_id = s.age_group_id WHERE c.instructor_id = $1 AND s.user_id IS NULL AND s.is_active = TRUE) AS parent_managed_children,
          (SELECT COUNT(*)::int FROM activity_submissions sub JOIN activities a ON a.id = sub.activity_id JOIN lessons l ON l.id = a.lesson_id JOIN courses c ON c.id = l.course_id WHERE c.instructor_id = $1 AND sub.status = 'pending') AS pending_activities,
          (SELECT COUNT(*)::int FROM notifications WHERE user_id = $2 AND is_read = FALSE) AS unread_notifications`,
        [instructorId, req.user.id]
      ),
      query(
        `SELECT c.id, c.title, c.status, ag.name AS age_group_name, COUNT(l.id)::int AS lesson_count
         FROM courses c JOIN age_groups ag ON ag.id = c.age_group_id
         LEFT JOIN lessons l ON l.course_id = c.id
         WHERE c.instructor_id = $1
         GROUP BY c.id, ag.name ORDER BY c.updated_at DESC LIMIT 5`,
        [instructorId]
      ),
    ]);
    res.json({ summary: summary.rows[0], recent_courses: recentCourses.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/courses  — list, filterable by age_group_id / status / instructor
// Students and parents only ever see published courses; instructors/admins
// can additionally see drafts they own (or all drafts, for admins).
// ----------------------------------------------------------------------------
async function listCourses(req, res, next) {
  try {
    const { age_group_id, status } = req.query;
    const conditions = [];
    const params = [];

    if (age_group_id) {
      params.push(age_group_id);
      conditions.push(`c.age_group_id = $${params.length}`);
    }

    if (req.user.role === 'student') {
      conditions.push(`c.status = 'published'`);
      params.push(req.user.id);
      conditions.push(`EXISTS (SELECT 1 FROM students s WHERE s.user_id = $${params.length} AND s.age_group_id = c.age_group_id AND s.is_active = TRUE)`);
    } else if (req.user.role === 'parent') {
      conditions.push(`c.status = 'published'`);
      params.push(req.user.id);
      conditions.push(`EXISTS (
        SELECT 1 FROM students s JOIN parents p ON p.id = s.parent_id
        WHERE p.user_id = $${params.length} AND s.age_group_id = c.age_group_id AND s.is_active = TRUE
      )`);
    } else if (status && VALID_STATUSES.includes(status)) {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }

    if (req.user.role === 'instructor' && req.query.mine === 'true') {
      const instructorId = await getInstructorIdForUser(req.user.id);
      params.push(instructorId);
      conditions.push(`c.instructor_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT c.*, u.full_name AS instructor_name, ag.name AS age_group_name
       FROM courses c
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       JOIN age_groups ag ON ag.id = c.age_group_id
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );

    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/courses/:id  — course detail including its lessons
// ----------------------------------------------------------------------------
async function getCourse(req, res, next) {
  try {
    const { id } = req.params;
    const courseResult = await query(
      `SELECT c.*, u.full_name AS instructor_name, ag.name AS age_group_name
       FROM courses c
       JOIN instructors i ON i.id = c.instructor_id
       JOIN users u ON u.id = i.user_id
       JOIN age_groups ag ON ag.id = c.age_group_id
       WHERE c.id = $1`,
      [id]
    );
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    const course = courseResult.rows[0];

    if (!(await canReadCourse(req.user, course))) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const lessonsResult = await query(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index',
      [id]
    );

    res.json({ course, lessons: lessonsResult.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PUT /api/courses/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateCourse(req, res, next) {
  try {
    const course = await loadOwnedCourse(req, res);
    if (!course) return;

    const { title, description, age_group_id, thumbnail_url } = req.body;
    const result = await query(
      `UPDATE courses
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           age_group_id = COALESCE($3, age_group_id),
           thumbnail_url = COALESCE($4, thumbnail_url),
           updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [title, description, age_group_id, thumbnail_url, course.id]
    );

    res.json({ course: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/courses/:id/status  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function updateCourseStatus(req, res, next) {
  try {
    const course = await loadOwnedCourse(req, res);
    if (!course) return;

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }

    if (status === 'published') {
      const lessonCount = await query('SELECT COUNT(*)::int AS count FROM lessons WHERE course_id = $1', [course.id]);
      if (lessonCount.rows[0].count === 0) {
        return res.status(400).json({ error: 'Add at least one lesson before publishing this course' });
      }
    }

    const result = await query(
      'UPDATE courses SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, course.id]
    );

    res.json({ course: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/courses/:id  (owning instructor or admin)
// ----------------------------------------------------------------------------
async function deleteCourse(req, res, next) {
  try {
    const course = await loadOwnedCourse(req, res);
    if (!course) return;

    await query('DELETE FROM courses WHERE id = $1', [course.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCourse,
  getMyInstructorDashboard,
  listCourses,
  getCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  loadOwnedCourse,
};
