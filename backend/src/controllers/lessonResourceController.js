const { query, pool } = require('../config/db');

// ============================================================================
// GET /api/instructor/lessons/:lessonId/resources
// Get all resources for a lesson with their display order
// ============================================================================
async function getLessonResources(req, res, next) {
  try {
    const { lessonId } = req.params;
    
    // Verify instructor has access to this lesson's course
    const accessCheck = await query(
      `SELECT c.id FROM courses c
       JOIN lessons l ON l.course_id = c.id
       JOIN instructors i ON c.instructor_id = i.id
       WHERE l.id = $1 AND i.user_id = $2`,
      [lessonId, req.user.id]
    );
    
    if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all lesson resources
    const result = await query(
      `SELECT lr.*,
              CASE 
                WHEN lr.resource_type = 'video' THEN v.title
                WHEN lr.resource_type = 'material' THEN m.title
                WHEN lr.resource_type = 'activity' THEN a.title
                WHEN lr.resource_type = 'quiz' THEN q.title
              END as resource_title,
              CASE 
                WHEN lr.resource_type = 'video' THEN v.video_url
                WHEN lr.resource_type = 'material' THEN m.file_url
                WHEN lr.resource_type = 'activity' THEN a.activity_type
                WHEN lr.resource_type = 'quiz' THEN NULL
              END as resource_detail
       FROM lesson_resources lr
       LEFT JOIN videos v ON lr.resource_type = 'video' AND lr.resource_id = v.id
       LEFT JOIN learning_materials m ON lr.resource_type = 'material' AND lr.resource_id = m.id
       LEFT JOIN activities a ON lr.resource_type = 'activity' AND lr.resource_id = a.id
       LEFT JOIN quizzes q ON lr.resource_type = 'quiz' AND lr.resource_id = q.id
       WHERE lr.lesson_id = $1
       ORDER BY lr.display_order, lr.created_at`,
      [lessonId]
    );
    
    res.json({ resources: result.rows });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// GET /api/instructor/lessons/:lessonId/available-resources
// Get all resources that can be added to this lesson
// ============================================================================
async function getAvailableResources(req, res, next) {
  try {
    const { lessonId } = req.params;
    
    // Get lesson info
    const lessonResult = await query(
      'SELECT id, course_id FROM lessons WHERE id = $1',
      [lessonId]
    );
    
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lesson = lessonResult.rows[0];
    
    // Get already added resource IDs
    const addedResult = await query(
      'SELECT resource_type, resource_id FROM lesson_resources WHERE lesson_id = $1',
      [lessonId]
    );
    const added = addedResult.rows;
    
    // Get all available resources for this lesson
    const videos = await query(
      'SELECT id, title, video_url, duration_seconds FROM videos WHERE lesson_id = $1',
      [lessonId]
    );
    
    const materials = await query(
      'SELECT id, title, type as material_type, file_url FROM learning_materials WHERE lesson_id = $1',
      [lessonId]
    );
    
    const activities = await query(
      'SELECT id, title, activity_type, max_score FROM activities WHERE lesson_id = $1',
      [lessonId]
    );
    
    const quizzes = await query(
      'SELECT id, title, description, time_limit_seconds FROM quizzes WHERE lesson_id = $1',
      [lessonId]
    );
    
    // Filter out already added resources
    const filterAdded = (resources, type) => {
      return resources.filter(r => !added.some(a => a.resource_type === type && a.resource_id === r.id));
    };
    
    res.json({
      videos: filterAdded(videos.rows, 'video'),
      materials: filterAdded(materials.rows, 'material'),
      activities: filterAdded(activities.rows, 'activity'),
      quizzes: filterAdded(quizzes.rows, 'quiz')
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// POST /api/instructor/lessons/:lessonId/resources
// Add a resource to the lesson
// ============================================================================
async function addLessonResource(req, res, next) {
  try {
    const { lessonId } = req.params;
    const { resource_type, resource_id, is_required, title, description } = req.body;
    
    if (!resource_type || !resource_id) {
      return res.status(400).json({ error: 'resource_type and resource_id are required' });
    }
    
    if (!['video', 'material', 'activity', 'quiz'].includes(resource_type)) {
      return res.status(400).json({ error: 'Invalid resource_type' });
    }
    
    // Verify instructor has access
    const accessCheck = await query(
      `SELECT c.id FROM courses c
       JOIN lessons l ON l.course_id = c.id
       JOIN instructors i ON c.instructor_id = i.id
       WHERE l.id = $1 AND i.user_id = $2`,
      [lessonId, req.user.id]
    );
    
    if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get the next display_order
    const orderResult = await query(
      'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM lesson_resources WHERE lesson_id = $1',
      [lessonId]
    );
    const displayOrder = orderResult.rows[0].next_order;
    
    // Get resource title if not provided
    let resourceTitle = title;
    if (!resourceTitle) {
      let titleQuery = '';
      switch (resource_type) {
        case 'video':
          titleQuery = 'SELECT title FROM videos WHERE id = $1';
          break;
        case 'material':
          titleQuery = 'SELECT title FROM learning_materials WHERE id = $1';
          break;
        case 'activity':
          titleQuery = 'SELECT title FROM activities WHERE id = $1';
          break;
        case 'quiz':
          titleQuery = 'SELECT title FROM quizzes WHERE id = $1';
          break;
      }
      const titleResult = await query(titleQuery, [resource_id]);
      resourceTitle = titleResult.rows[0]?.title || 'Untitled Resource';
    }
    
    // Insert the resource
    const result = await query(
      `INSERT INTO lesson_resources (
        lesson_id, resource_type, resource_id, display_order, 
        is_required, title, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        lessonId, 
        resource_type, 
        resource_id, 
        displayOrder, 
        is_required !== false, // default to true
        resourceTitle,
        description || null
      ]
    );
    
    res.status(201).json({ resource: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'This resource is already added to the lesson' });
    }
    next(err);
  }
}

// ============================================================================
// PUT /api/instructor/lessons/:lessonId/resources/:resourceId
// Update resource settings (order, required status, etc.)
// ============================================================================
async function updateLessonResource(req, res, next) {
  try {
    const { lessonId, resourceId } = req.params;
    const { display_order, is_required, title, description } = req.body;
    
    // Verify instructor has access
    const accessCheck = await query(
      `SELECT c.id FROM courses c
       JOIN lessons l ON l.course_id = c.id
       JOIN instructors i ON c.instructor_id = i.id
       WHERE l.id = $1 AND i.user_id = $2`,
      [lessonId, req.user.id]
    );
    
    if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramCount++}`);
      values.push(display_order);
    }
    
    if (is_required !== undefined) {
      updates.push(`is_required = $${paramCount++}`);
      values.push(is_required);
    }
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = now()`);
    values.push(resourceId);
    
    const result = await query(
      `UPDATE lesson_resources SET ${updates.join(', ')} 
       WHERE id = $${paramCount} AND lesson_id = $${paramCount + 1}
       RETURNING *`,
      [...values, lessonId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({ resource: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// POST /api/instructor/lessons/:lessonId/resources/reorder
// Reorder multiple resources at once
// ============================================================================
async function reorderLessonResources(req, res, next) {
  try {
    const { lessonId } = req.params;
    const { resources } = req.body; // Array of { id, display_order }
    
    if (!Array.isArray(resources)) {
      return res.status(400).json({ error: 'resources must be an array' });
    }
    
    // Verify instructor has access
    const accessCheck = await query(
      `SELECT c.id FROM courses c
       JOIN lessons l ON l.course_id = c.id
       JOIN instructors i ON c.instructor_id = i.id
       WHERE l.id = $1 AND i.user_id = $2`,
      [lessonId, req.user.id]
    );
    
    if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update each resource's display_order
      for (const resource of resources) {
        await client.query(
          'UPDATE lesson_resources SET display_order = $1, updated_at = now() WHERE id = $2 AND lesson_id = $3',
          [resource.display_order, resource.id, lessonId]
        );
      }
      
      await client.query('COMMIT');
      
      res.json({ success: true, message: 'Resources reordered successfully' });
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

// ============================================================================
// DELETE /api/instructor/lessons/:lessonId/resources/:resourceId
// Remove a resource from the lesson
// ============================================================================
async function removeLessonResource(req, res, next) {
  try {
    const { lessonId, resourceId } = req.params;
    
    // Verify instructor has access
    const accessCheck = await query(
      `SELECT c.id FROM courses c
       JOIN lessons l ON l.course_id = c.id
       JOIN instructors i ON c.instructor_id = i.id
       WHERE l.id = $1 AND i.user_id = $2`,
      [lessonId, req.user.id]
    );
    
    if (accessCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await query(
      'DELETE FROM lesson_resources WHERE id = $1 AND lesson_id = $2 RETURNING *',
      [resourceId, lessonId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.json({ success: true, message: 'Resource removed from lesson' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLessonResources,
  getAvailableResources,
  addLessonResource,
  updateLessonResource,
  reorderLessonResources,
  removeLessonResource
};
