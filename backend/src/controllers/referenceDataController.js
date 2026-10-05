const { query } = require('../config/db');

/**
 * Reference data for the early-childhood (ages 5-9) portal.
 * ----------------------------------------------------------------------------
 * These are the constants of Ethiopian schooling itself - the Ge'ez syllabary,
 * the Ethiopic numerals, the everyday words a child recognises by picture -
 * plus the encouragement a child hears when they finish something.
 *
 * They are NOT curriculum. An instructor never types 26 letters x 7 vowel
 * orders into a lesson; they pick from these tables. An admin maintains them.
 * Keeping them in the database (rather than in frontend code) means a typo in
 * a syllable can be fixed by a school without a code change and redeploy.
 */

const TABLES = {
  fidel: 'fidel_letters',
  numerals: 'geez_numerals',
  words: 'picture_words',
  praise: 'encouragement_phrases',
};

const COLUMNS = {
  fidel: ['base_char', 'sound', 'syllables', 'teaching_order', 'is_active'],
  numerals: ['value', 'glyph', 'sound', 'is_active'],
  words: ['word', 'english', 'emoji', 'image_url', 'category', 'example_for_letter', 'is_active'],
  praise: ['text', 'english', 'emoji', 'is_active'],
};

const ORDER_BY = {
  fidel: 'teaching_order, id',
  numerals: 'value',
  words: 'category, word',
  praise: 'id',
};

function tableFor(kind) {
  const table = TABLES[kind];
  if (!table) {
    const err = new Error(`Unknown reference dataset '${kind}'`);
    err.status = 400;
    throw err;
  }
  return table;
}

async function listAll() {
  const [fidel, numerals, words, praise] = await Promise.all([
    query(
      `SELECT id, base_char, sound, syllables, teaching_order, is_active
       FROM fidel_letters WHERE is_active ORDER BY teaching_order, id`
    ),
    query(
      `SELECT id, value, glyph, sound, is_active
       FROM geez_numerals WHERE is_active ORDER BY value`
    ),
    query(
      `SELECT id, word, english, emoji, image_url, category, example_for_letter, is_active
       FROM picture_words WHERE is_active ORDER BY category, word`
    ),
    query(
      `SELECT id, text, english, emoji, is_active
       FROM encouragement_phrases WHERE is_active ORDER BY id`
    ),
  ]);

  return {
    fidel_letters: fidel.rows,
    geez_numerals: numerals.rows,
    picture_words: words.rows,
    encouragement_phrases: praise.rows,
  };
}

/**
 * GET /api/reference/early-learner-kit
 * One request for everything the child portal and the instructor picker need.
 * The child portal calls this on load; the instructor ActivityBuilder calls it
 * when the teacher opens a tracing / counting / matching activity.
 */
async function getEarlyLearnerKit(req, res, next) {
  try {
    res.json(await listAll());
  } catch (err) {
    next(err);
  }
}

/** GET /api/reference/:kind  e.g. /api/reference/fidel */
async function listReference(req, res, next) {
  try {
    const kind = req.params.kind;
    const table = tableFor(kind);
    const result = await query(
      `SELECT * FROM ${table} WHERE is_active ORDER BY ${ORDER_BY[kind]}`
    );
    res.json({ [kind]: result.rows });
  } catch (err) {
    next(err);
  }
}

/** GET /api/reference/admin/:kind  (admin: includes deactivated rows) */
async function listForAdmin(req, res, next) {
  try {
    const kind = req.params.kind;
    const table = tableFor(kind);
    const result = await query(`SELECT * FROM ${table} ORDER BY ${ORDER_BY[kind]}`);
    res.json({ [kind]: result.rows });
  } catch (err) {
    next(err);
  }
}

/** POST /api/reference/admin/:kind or /api/reference/words */
async function createReference(req, res, next) {
  try {
    const kind = req.params.kind;
    const table = tableFor(kind);
    const columns = COLUMNS[kind];

    // Smart defaults for words created by instructors
    if (kind === 'words') {
      if (!req.body.category || !String(req.body.category).trim()) {
        req.body.category = 'general';
      }
      if (!req.body.example_for_letter && req.body.word) {
        req.body.example_for_letter = String(req.body.word).trim().charAt(0);
      }
      if (req.body.is_active === undefined) {
        req.body.is_active = true;
      }
    }

    const provided = columns.filter((c) => req.body[c] !== undefined);
    if (provided.length === 0) {
      return res.status(400).json({ error: `Provide at least one of: ${columns.join(', ')}` });
    }

    const values = provided.map((c) => {
      if (c === 'syllables') {
        const raw = req.body[c];
        return Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (typeof req.body[c] === 'string') {
        return req.body[c].trim();
      }
      return req.body[c];
    });

    let sql = `INSERT INTO ${table} (${provided.join(', ')})
       VALUES (${provided.map((_, i) => `$${i + 1}`).join(', ')})`;

    // If adding a word that already exists, update and reactivate it
    if (kind === 'words') {
      sql += ` ON CONFLICT (word) DO UPDATE SET
        english = COALESCE(EXCLUDED.english, picture_words.english),
        emoji = COALESCE(EXCLUDED.emoji, picture_words.emoji),
        image_url = COALESCE(EXCLUDED.image_url, picture_words.image_url),
        category = COALESCE(EXCLUDED.category, picture_words.category),
        example_for_letter = COALESCE(EXCLUDED.example_for_letter, picture_words.example_for_letter),
        is_active = TRUE,
        updated_at = now()`;
    }

    sql += ` RETURNING *`;

    const result = await query(sql, values);
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/reference/admin/:kind/:id */
async function updateReference(req, res, next) {
  try {
    const kind = req.params.kind;
    const table = tableFor(kind);
    const { id } = req.params;
    const columns = COLUMNS[kind];
    const provided = columns.filter((c) => req.body[c] !== undefined);

    if (provided.length === 0) {
      return res.status(400).json({ error: `Provide at least one of: ${columns.join(', ')}` });
    }

    const values = provided.map((c) => {
      if (c === 'syllables') {
        const raw = req.body[c];
        return Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
      }
      return req.body[c];
    });
    values.push(id);

    const result = await query(
      `UPDATE ${table}
       SET ${provided.map((c, i) => `${c} = $${i + 1}`).join(', ')}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/reference/admin/:kind/:id  (deactivates; history stays intact) */
async function deactivateReference(req, res, next) {
  try {
    const kind = req.params.kind;
    const table = tableFor(kind);
    const result = await query(
      `UPDATE ${table} SET is_active = FALSE, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  TABLES,
  getEarlyLearnerKit,
  listReference,
  listForAdmin,
  createReference,
  updateReference,
  deactivateReference,
};
