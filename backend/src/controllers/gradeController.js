/**
 * gradeController.js
 * API endpoints for grade levels, subjects, and curriculum management
 */

const { query } = require('../config/db');

// ============================================================================
// GRADE LEVELS
// ============================================================================

/**
 * GET /api/grades
 * Get all active grade levels
 */
async function getGradeLevels(req, res, next) {
  try {
    const includeInactive = req.user?.role === 'admin' && req.query.include_inactive === 'true';
    const result = await query(
      `SELECT * FROM grade_levels ${includeInactive ? '' : 'WHERE is_active = TRUE'} ORDER BY sequence_order ASC`
    );
    res.json({ grade_levels: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/grades/:id
 * Get a specific grade level
 */
async function getGradeLevel(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM grade_levels WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade level not found' });
    }

    res.json({ grade_level: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/grades
 * Create a new grade level (Admin only)
 */
async function createGradeLevel(req, res, next) {
  try {
    const { code, name, level_type, sequence_order, description, is_active } = req.body;

    if (!code || !name || !level_type || sequence_order === undefined) {
      return res.status(400).json({ error: 'Code, name, level type, and sequence order are required' });
    }

    const result = await query(
      `INSERT INTO grade_levels (code, name, level_type, sequence_order, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [code, name, level_type, sequence_order, description || null, is_active !== false]
    );

    res.status(201).json({ grade_level: result.rows[0], message: 'Grade level created successfully' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Grade level code already exists' });
    }
    next(err);
  }
}

/**
 * PUT /api/grades/:id
 * Update a grade level (Admin only)
 */
async function updateGradeLevel(req, res, next) {
  try {
    const { id } = req.params;
    const { code, name, level_type, sequence_order, description, is_active } = req.body;

    const result = await query(
      `UPDATE grade_levels
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           level_type = COALESCE($3, level_type),
           sequence_order = COALESCE($4, sequence_order),
           description = COALESCE($5, description),
           is_active = COALESCE($6, is_active),
           updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [code, name, level_type, sequence_order, description, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade level not found' });
    }

    res.json({ grade_level: result.rows[0], message: 'Grade level updated successfully' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Grade level code already exists' });
    }
    next(err);
  }
}

/**
 * DELETE /api/grades/:id
 * Delete a grade level (Admin only)
 */
async function deleteGradeLevel(req, res, next) {
  try {
    const { id } = req.params;

    // Keep curriculum and history intact. Administrators can deactivate a
    // grade level instead of deleting one that has been used.
    const usageCheck = await query(
      `SELECT (
         (SELECT COUNT(*) FROM students WHERE grade_level_id = $1) +
         (SELECT COUNT(*) FROM courses WHERE grade_level_id = $1) +
         (SELECT COUNT(*) FROM curriculum_objectives WHERE grade_level_id = $1) +
         (SELECT COUNT(*) FROM instructor_assignments WHERE grade_level_id = $1)
       )::int AS total`,
      [id]
    );

    if (usageCheck.rows[0].total > 0) {
      return res.status(409).json({ error: 'This grade level is in use. Deactivate it to hide it from new assignments.' });
    }

    const result = await query(
      `DELETE FROM grade_levels WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade level not found' });
    }

    res.json({ message: 'Grade level deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// SUBJECTS
// ============================================================================

/**
 * GET /api/subjects
 * Get all active subjects
 */
async function getSubjects(req, res, next) {
  try {
    const result = await query(
      `SELECT * FROM subjects WHERE is_active = TRUE ORDER BY code ASC`
    );
    res.json({ subjects: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/subjects/:id
 * Get a specific subject
 */
async function getSubject(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM subjects WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ subject: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/subjects
 * Create a new subject (Admin only)
 */
async function createSubject(req, res, next) {
  try {
    const { code, name, description, language, is_active } = req.body;

    if (!code || !name || !language) {
      return res.status(400).json({ error: 'Code, name, and language are required' });
    }

    const result = await query(
      `INSERT INTO subjects (code, name, description, language, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, name, description || null, language, is_active !== false]
    );

    res.status(201).json({ subject: result.rows[0], message: 'Subject created successfully' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Subject code already exists' });
    }
    next(err);
  }
}

/**
 * PUT /api/subjects/:id
 * Update a subject (Admin only)
 */
async function updateSubject(req, res, next) {
  try {
    const { id } = req.params;
    const { code, name, description, language, is_active } = req.body;

    const result = await query(
      `UPDATE subjects
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           language = COALESCE($4, language),
           is_active = COALESCE($5, is_active),
           updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [code, name, description, language, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ subject: result.rows[0], message: 'Subject updated successfully' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Subject code already exists' });
    }
    next(err);
  }
}

/**
 * DELETE /api/subjects/:id
 * Delete a subject (Admin only)
 */
async function deleteSubject(req, res, next) {
  try {
    const { id } = req.params;

    // Check if subject is being used by curriculum objectives
    const objectiveCheck = await query(
      `SELECT COUNT(*) FROM curriculum_objectives WHERE subject_id = $1`,
      [id]
    );

    if (parseInt(objectiveCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete subject that is used in curriculum objectives' });
    }

    const result = await query(
      `DELETE FROM subjects WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// CURRICULUM VERSIONS
// ============================================================================

/**
 * GET /api/curriculum-versions
 * Get all curriculum versions
 */
async function getCurriculumVersions(req, res, next) {
  try {
    const result = await query(
      `SELECT * FROM curriculum_versions ORDER BY effective_from DESC`
    );
    res.json({ curriculum_versions: result.rows });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// SUBJECT-GRADE ASSIGNMENTS
// ============================================================================

/**
 * GET /api/subject-grade-assignments
 * Get all subject-grade assignments
 */
async function getSubjectGradeAssignments(req, res, next) {
  try {
    const result = await query(
      `SELECT sga.*, s.name as subject_name, s.code as subject_code,
              gl.name as grade_level_name, gl.code as grade_level_code
       FROM subject_grade_assignments sga
       JOIN subjects s ON s.id = sga.subject_id
       JOIN grade_levels gl ON gl.id = sga.grade_level_id
       WHERE sga.is_active = TRUE
       ORDER BY gl.sequence_order ASC, s.code ASC`
    );
    res.json({ assignments: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/subject-grade-assignments
 * Assign a subject to a grade level (Admin only)
 */
async function createSubjectGradeAssignment(req, res, next) {
  try {
    const { subject_id, grade_level_id } = req.body;

    if (!subject_id || !grade_level_id) {
      return res.status(400).json({ error: 'subject_id and grade_level_id are required' });
    }

    // Validate subject exists
    const subjectCheck = await query('SELECT id FROM subjects WHERE id = $1', [subject_id]);
    if (!subjectCheck.rows.length) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Validate grade level exists
    const gradeCheck = await query('SELECT id FROM grade_levels WHERE id = $1', [grade_level_id]);
    if (!gradeCheck.rows.length) {
      return res.status(404).json({ error: 'Grade level not found' });
    }

    const result = await query(
      `INSERT INTO subject_grade_assignments (subject_id, grade_level_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (subject_id, grade_level_id) DO UPDATE SET
         is_active = TRUE,
         assigned_by = $3,
         assigned_at = now()
       RETURNING *`,
      [subject_id, grade_level_id, req.user.id]
    );

    res.status(201).json({ assignment: result.rows[0], message: 'Subject assigned to grade level successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/subject-grade-assignments/:id
 * Remove a subject-grade assignment (Admin only)
 */
async function deleteSubjectGradeAssignment(req, res, next) {
  try {
    const { id } = req.params;

    await query('DELETE FROM subject_grade_assignments WHERE id = $1', [id]);

    res.json({ message: 'Subject-grade assignment removed successfully' });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// CURRICULUM OBJECTIVES
// ============================================================================

/**
 * GET /api/curriculum-objectives
 * Get curriculum objectives with optional filters
 */
async function getCurriculumObjectives(req, res, next) {
  try {
    const { grade_level_id, subject_id, curriculum_version_id } = req.query;

    let queryText = `
      SELECT co.*, gl.name as grade_level_name, gl.code as grade_level_code,
             s.name as subject_name, s.code as subject_code,
             cv.name as curriculum_version_name
      FROM curriculum_objectives co
      JOIN grade_levels gl ON gl.id = co.grade_level_id
      JOIN subjects s ON s.id = co.subject_id
      JOIN curriculum_versions cv ON cv.id = co.curriculum_version_id
      WHERE co.is_active = TRUE
    `;

    const params = [];
    let paramCount = 0;

    if (grade_level_id) {
      paramCount++;
      queryText += ` AND co.grade_level_id = $${paramCount}`;
      params.push(grade_level_id);
    }

    if (subject_id) {
      paramCount++;
      queryText += ` AND co.subject_id = $${paramCount}`;
      params.push(subject_id);
    }

    if (curriculum_version_id) {
      paramCount++;
      queryText += ` AND co.curriculum_version_id = $${paramCount}`;
      params.push(curriculum_version_id);
    }

    queryText += ` ORDER BY co.sequence_order ASC`;

    const result = await query(queryText, params);
    res.json({ objectives: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Grade Levels
  getGradeLevels,
  getGradeLevel,
  createGradeLevel,
  updateGradeLevel,
  deleteGradeLevel,
  // Subjects
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  // Subject-Grade Assignments
  getSubjectGradeAssignments,
  createSubjectGradeAssignment,
  deleteSubjectGradeAssignment,
  // Curriculum
  getCurriculumVersions,
  getCurriculumObjectives,
};
