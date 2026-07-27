const { query } = require('../config/db');

// ----------------------------------------------------------------------------
// GET /api/age-groups  — used by course/activity/child creation forms
// ----------------------------------------------------------------------------
async function listAgeGroups(req, res, next) {
  try {
    const result = await query('SELECT * FROM age_groups ORDER BY min_age');
    res.json({ age_groups: result.rows });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// POST /api/age-groups  (admin only)
// ----------------------------------------------------------------------------
async function createAgeGroup(req, res, next) {
  try {
    const { name, min_age, max_age, requires_account } = req.body;
    if (!name || min_age == null || max_age == null) {
      return res.status(400).json({ error: 'name, min_age and max_age are required' });
    }
    if (min_age > max_age) {
      return res.status(400).json({ error: 'min_age cannot be greater than max_age' });
    }

    const result = await query(
      `INSERT INTO age_groups (name, min_age, max_age, requires_account)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, min_age, max_age, requires_account ?? (min_age >= 11)]
    );

    res.status(201).json({ age_group: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAgeGroups, createAgeGroup };
