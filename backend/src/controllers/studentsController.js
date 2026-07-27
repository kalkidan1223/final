const { query } = require('../config/db');

// ----------------------------------------------------------------------------
// POST /api/students/children  (parent only)
// Adds a Category 1 child (age 5-10) — no login account, parent-managed only.
// ----------------------------------------------------------------------------
async function addChild(req, res, next) {
  try {
    const { full_name, date_of_birth, age_group_id, gender } = req.body;

    if (!full_name || !date_of_birth || !age_group_id) {
      return res.status(400).json({ error: 'full_name, date_of_birth and age_group_id are required' });
    }

    const ageGroupResult = await query(
      'SELECT requires_account FROM age_groups WHERE id = $1',
      [age_group_id]
    );
    if (ageGroupResult.rows.length === 0) {
      return res.status(400).json({ error: 'Unknown age_group_id' });
    }
    if (ageGroupResult.rows[0].requires_account) {
      return res.status(400).json({
        error: 'This age group requires an account — use POST /api/auth/students/invite instead',
      });
    }

    const parentResult = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only parents can add a child' });
    }

    const result = await query(
      `INSERT INTO students (parent_id, age_group_id, full_name, date_of_birth, gender)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, date_of_birth, age_group_id`,
      [parentResult.rows[0].id, age_group_id, full_name, date_of_birth, gender || null]
    );

    res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GET /api/students/children  (parent only) — list this parent's linked children
// ----------------------------------------------------------------------------
async function listMyChildren(req, res, next) {
  try {
    const parentResult = await query('SELECT id FROM parents WHERE user_id = $1', [req.user.id]);
    if (parentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only parents can view linked children' });
    }

    const result = await query(
      `SELECT s.id, s.full_name, s.date_of_birth, s.user_id IS NOT NULL AS has_own_account,
              ag.name AS age_group
       FROM students s
       JOIN age_groups ag ON ag.id = s.age_group_id
       WHERE s.parent_id = $1
       ORDER BY s.date_of_birth`,
      [parentResult.rows[0].id]
    );

    res.json({ children: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { addChild, listMyChildren };
