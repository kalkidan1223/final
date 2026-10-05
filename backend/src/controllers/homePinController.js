const { query } = require('../config/db');
const { getInstructorIdForUser } = require('../utils/roleHelpers');

/**
 * Home pins
 * ----------------------------------------------------------------------------
 * The age 5-9 child home is a VIEW over content the instructor has already
 * published. There is no separate "home page builder" an instructor has to
 * design: they publish a course as normal, then pin up to a handful of
 * activities to the home for that age group. The child home renders whatever
 * is pinned, in the instructor's order.
 *
 * Why this shape:
 *   - No school wants to lay out a dashboard. They want to say "this week we
 *     do these three things".
 *   - Content can never drift from the course, because it IS the course.
 *   - A child only ever sees published content from their own age group.
 */

const MAX_HOME_TILES = 6;

const RESOURCE_COLUMNS = {
  activity: `
    a.id, a.title, a.activity_type AS kind, a.instructions, a.activity_config,
    a.difficulty, a.estimated_time_minutes,
    l.id AS lesson_id, l.title AS lesson_title,
    c.id AS course_id, c.title AS course_title, u.full_name AS instructor_name`,
  quiz: `
    q.id, q.title, 'quiz' AS kind, q.description AS instructions, NULL::jsonb AS activity_config,
    q.difficulty, NULL::int AS estimated_time_minutes,
    l.id AS lesson_id, l.title AS lesson_title,
    c.id AS course_id, c.title AS course_title, u.full_name AS instructor_name`,
  video: `
    v.id, v.title, 'video' AS kind, v.description AS instructions, NULL::jsonb AS activity_config,
    NULL::varchar AS difficulty, v.duration_seconds AS estimated_time_minutes,
    l.id AS lesson_id, l.title AS lesson_title,
    c.id AS course_id, c.title AS course_title, u.full_name AS instructor_name`,
  material: `
    m.id, m.title, 'material' AS kind, m.description AS instructions, NULL::jsonb AS activity_config,
    NULL::varchar AS difficulty, NULL::int AS estimated_time_minutes,
    l.id AS lesson_id, l.title AS lesson_title,
    c.id AS course_id, c.title AS course_title, u.full_name AS instructor_name`,
  lesson: `
    l.id, l.title, 'lesson' AS kind, l.description AS instructions, NULL::jsonb AS activity_config,
    l.difficulty_level AS difficulty, l.estimated_duration_minutes,
    l.id AS lesson_id, l.title AS lesson_title,
    c.id AS course_id, c.title AS course_title, u.full_name AS instructor_name`,
};

const RESOURCE_SOURCE = {
  activity: `FROM activities a
             JOIN lessons l ON l.id = a.lesson_id
             JOIN courses c ON c.id = l.course_id
             JOIN instructors i ON i.id = c.instructor_id
             JOIN users u ON u.id = i.user_id`,
  quiz: `FROM quizzes q
        JOIN lessons l ON l.id = q.lesson_id
        JOIN courses c ON c.id = l.course_id
        JOIN instructors i ON i.id = c.instructor_id
        JOIN users u ON u.id = i.user_id`,
  video: `FROM videos v
          JOIN lessons l ON l.id = v.lesson_id
          JOIN courses c ON c.id = l.course_id
          JOIN instructors i ON i.id = c.instructor_id
          JOIN users u ON u.id = i.user_id`,
  material: `FROM learning_materials m
             JOIN lessons l ON l.id = m.lesson_id
             JOIN courses c ON c.id = l.course_id
             JOIN instructors i ON i.id = c.instructor_id
             JOIN users u ON u.id = i.user_id`,
  lesson: `FROM lessons l
           JOIN courses c ON c.id = l.course_id
           JOIN instructors i ON i.id = c.instructor_id
           JOIN users u ON u.id = i.user_id`,
};

/** Table alias for each pinnable resource, used to build the id filter. */
const RESOURCE_KEY = {
  activity: 'a',
  quiz: 'q',
  video: 'v',
  material: 'm',
  lesson: 'l',
};

/**
 * An instructor may only pin content from courses they own, unless they are an
 * admin. Returns the instructor's database id, or null for an admin.
 */
async function resolveInstructorId(req) {
  if (req.user.role === 'admin') return null;
  return getInstructorIdForUser(req.user.id);
}

/**
 * Load a single pinnable resource with its course context, enforcing ownership.
 */
async function loadResource(resourceType, resourceId, instructorId) {
  const columns = RESOURCE_COLUMNS[resourceType];
  const source = RESOURCE_SOURCE[resourceType];
  if (!columns) return null;

  const ownership = instructorId === null ? '' : 'AND c.instructor_id = $2';
  const params = instructorId === null ? [resourceId] : [resourceId, instructorId];

  const result = await query(
    `SELECT ${columns}, c.age_group_id
     ${source}
     WHERE ${RESOURCE_KEY[resourceType]}.id = $1
       ${ownership}`,
    params
  );
  return result.rows[0] || null;
}

// ----------------------------------------------------------------------------
// GET /api/home/candidates?age_group_id=1
// Everything the instructor has published in that age group, so they can pin.
// ----------------------------------------------------------------------------
async function listCandidates(req, res, next) {
  try {
    const ageGroupId = req.query.age_group_id;
    if (!ageGroupId) {
      return res.status(400).json({ error: 'age_group_id is required' });
    }
    const instructorId = await resolveInstructorId(req);
    const ownership = instructorId === null ? '' : 'AND c.instructor_id = $2';
    const params = instructorId === null ? [ageGroupId] : [ageGroupId, instructorId];

    const activities = await query(
      `SELECT a.id, a.title, a.activity_type, a.instructions, a.status,
              a.activity_config, a.difficulty,
              l.id AS lesson_id, l.title AS lesson_title,
              c.id AS course_id, c.title AS course_title,
              EXISTS (SELECT 1 FROM home_pins hp
                      WHERE hp.resource_type = 'activity' AND hp.resource_id = a.id) AS is_pinned
       FROM activities a
       JOIN lessons l ON l.id = a.lesson_id
       JOIN courses c ON c.id = l.course_id
       WHERE c.age_group_id = $1 ${ownership}
       ORDER BY c.title, l.order_index, a.display_order, a.created_at`,
      params
    );

    const lessons = await query(
      `SELECT l.id, l.title, l.description,
              l.order_index, c.id AS course_id, c.title AS course_title,
              COUNT(a.id) FILTER (WHERE a.status = 'active')::int AS activity_count,
              EXISTS (SELECT 1 FROM home_pins hp
                      WHERE hp.resource_type = 'lesson' AND hp.resource_id = l.id) AS is_pinned
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN activities a ON a.lesson_id = l.id
       WHERE c.age_group_id = $1 ${ownership}
       GROUP BY l.id, c.id
       ORDER BY c.title, l.order_index`,
      params
    );

    res.json({ activities: activities.rows, lessons: lessons.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/home/pins?age_group_id=1
// ----------------------------------------------------------------------------
async function listPins(req, res, next) {
  try {
    const ageGroupId = req.query.age_group_id;
    if (!ageGroupId) {
      return res.status(400).json({ error: 'age_group_id is required' });
    }
    res.json({ pins: await resolvePins(ageGroupId) });
  } catch (err) {
    next(err);
  }
}

/**
 * Shared: read the ordered pins for an age group, hydrated with the resource.
 * Used by the instructor screen and by the child dashboard.
 */
async function resolvePins(ageGroupId) {
  const pinRes = await query(
    `SELECT id, resource_type, resource_id, display_order
     FROM home_pins
     WHERE age_group_id = $1 AND is_active
     ORDER BY display_order, id`,
    [ageGroupId]
  );

  const pins = [];
  for (const pin of pinRes.rows) {
    const resource = await loadResourceForAnyone(pin.resource_type, pin.resource_id);
    if (!resource) continue;
    pins.push({ ...resource, pin_id: pin.id, display_order: pin.display_order });
  }
  return pins;
}

/**
 * Load a resource for the child-facing read path: no ownership check, but the
 * course must be published and the resource itself must still be active, so a
 * teacher who later archives something does not leave a dead tile on a
 * child's home.
 */
async function loadResourceForAnyone(resourceType, resourceId) {
  const columns = RESOURCE_COLUMNS[resourceType];
  const source = RESOURCE_SOURCE[resourceType];
  if (!columns) return null;

  const key = RESOURCE_KEY[resourceType];
  const activityGuard = resourceType === 'activity' ? "AND a.status = 'active'" : '';

  const result = await query(
    `SELECT ${columns}
     ${source}
     WHERE ${key}.id = $1 AND c.status = 'published' ${activityGuard}`,
    [resourceId]
  );
  return result.rows[0] || null;
}

// ----------------------------------------------------------------------------
// POST /api/home/pins
// ----------------------------------------------------------------------------
async function createPin(req, res, next) {
  try {
    const { age_group_id, resource_type, resource_id } = req.body;

    if (!age_group_id || !resource_id) {
      return res.status(400).json({ error: 'age_group_id and resource_id are required' });
    }
    if (!RESOURCE_COLUMNS[resource_type]) {
      return res.status(400).json({
        error: `resource_type must be one of: ${Object.keys(RESOURCE_COLUMNS).join(', ')}`,
      });
    }

    const instructorId = await resolveInstructorId(req);
    const resource = await loadResource(resource_type, resource_id, instructorId);
    if (!resource) {
      return res.status(404).json({ error: 'That content was not found in your courses' });
    }
    if (String(resource.age_group_id) !== String(age_group_id)) {
      return res.status(400).json({ error: 'That content belongs to a different age group' });
    }

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM home_pins WHERE age_group_id = $1 AND is_active`,
      [age_group_id]
    );
    if (countRes.rows[0].total >= MAX_HOME_TILES) {
      return res.status(409).json({
        error: `The home can show at most ${MAX_HOME_TILES} things. Remove one first.`,
      });
    }

    const orderRes = await query(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM home_pins
       WHERE age_group_id = $1 AND is_active`,
      [age_group_id]
    );

    const result = await query(
      `INSERT INTO home_pins (age_group_id, resource_type, resource_id, display_order, pinned_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (age_group_id, resource_type, resource_id)
       DO UPDATE SET is_active = TRUE, updated_at = now()
       RETURNING *`,
      [age_group_id, resource_type, resource_id, req.body.display_order ?? orderRes.rows[0].next, instructorId]
    );

    res.status(201).json({ pin: result.rows[0], resource });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// PATCH /api/home/pins/:id   (reorder / deactivate)
// ----------------------------------------------------------------------------
async function updatePin(req, res, next) {
  try {
    const { display_order, is_active } = req.body;
    if (display_order === undefined && is_active === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    const result = await query(
      `UPDATE home_pins
       SET display_order = COALESCE($1, display_order),
           is_active = COALESCE($2, is_active),
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [
        display_order ?? null,
        is_active === undefined ? null : !!is_active,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pin not found' });
    }
    res.json({ pin: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/home/pins/:id   (deactivates, so student history is never lost)
// ----------------------------------------------------------------------------
async function removePin(req, res, next) {
  try {
    const result = await query(
      `UPDATE home_pins SET is_active = FALSE, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pin not found' });
    }
    res.json({ pin: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  MAX_HOME_TILES,
  resolvePins,
  listCandidates,
  listPins,
  createPin,
  updatePin,
  removePin,
};
