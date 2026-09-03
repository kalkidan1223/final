const { query, pool } = require('../config/db');

// GET /api/admin/age-groups/:id/available-courses — list available courses for an age group
async function listAvailableCourses(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM age_group_available_courses 
       WHERE age_group_id = $1 
       ORDER BY course_title`,
      [id]
    );
    res.json({ available_courses: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/age-groups/:id/available-courses — add a course to age group
async function addAvailableCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { course_title, course_description } = req.body;

    if (!course_title || course_title.trim().length < 2) {
      return res.status(400).json({ error: 'Course title is required (at least 2 characters)' });
    }

    // Check if age group exists
    const ageGroupResult = await query('SELECT id, name FROM age_groups WHERE id = $1', [id]);
    if (ageGroupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Age group not found' });
    }

    const result = await query(
      `INSERT INTO age_group_available_courses 
       (age_group_id, course_title, course_description, established_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, course_title.trim(), course_description?.trim() || null, req.user.id]
    );

    res.status(201).json({ available_course: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique constraint violation
      return res.status(409).json({ error: 'This course already exists for this age group' });
    }
    next(err);
  }
}

// PATCH /api/admin/age-groups/:ageGroupId/available-courses/:courseId — update course
async function updateAvailableCourse(req, res, next) {
  try {
    const { ageGroupId, courseId } = req.params;
    const { course_title, course_description, is_active } = req.body;

    const updates = [];
    const values = [];
    let idx = 0;

    if (course_title !== undefined) { 
      idx++; 
      values.push(course_title.trim()); 
      updates.push(`course_title = $${idx}`); 
    }
    if (course_description !== undefined) { 
      idx++; 
      values.push(course_description?.trim() || null); 
      updates.push(`course_description = $${idx}`); 
    }
    if (is_active !== undefined) { 
      idx++; 
      values.push(is_active); 
      updates.push(`is_active = $${idx}`); 
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    idx++; 
    values.push(courseId);
    idx++; 
    values.push(ageGroupId);
    updates.push(`updated_at = now()`);

    const result = await query(
      `UPDATE age_group_available_courses 
       SET ${updates.join(', ')} 
       WHERE id = $${idx - 1} AND age_group_id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ available_course: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/age-groups/:ageGroupId/available-courses/:courseId — remove course
async function deleteAvailableCourse(req, res, next) {
  try {
    const { ageGroupId, courseId } = req.params;

    const result = await query(
      'DELETE FROM age_group_available_courses WHERE id = $1 AND age_group_id = $2 RETURNING *',
      [courseId, ageGroupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ deleted: true, course: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/age-groups/:id/available-courses/bulk — add multiple courses at once
async function bulkAddAvailableCourses(req, res, next) {
  try {
    const { id } = req.params;
    const { courses } = req.body; // Array of { course_title, course_description }

    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ error: 'courses must be a non-empty array' });
    }

    // Check if age group exists
    const ageGroupResult = await query('SELECT id FROM age_groups WHERE id = $1', [id]);
    if (ageGroupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Age group not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const added = [];
      for (const course of courses) {
        if (!course.course_title || course.course_title.trim().length < 2) {
          continue; // Skip invalid entries
        }

        try {
          const result = await client.query(
            `INSERT INTO age_group_available_courses 
             (age_group_id, course_title, course_description, established_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, course.course_title.trim(), course.course_description?.trim() || null, req.user.id]
          );
          added.push(result.rows[0]);
        } catch (err) {
          if (err.code === '23505') {
            // Duplicate, skip
            continue;
          }
          throw err;
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ added_count: added.length, courses: added });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAvailableCourses,
  addAvailableCourse,
  updateAvailableCourse,
  deleteAvailableCourse,
  bulkAddAvailableCourses,
};
