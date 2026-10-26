const { query, pool } = require('../config/db');
const ttsService = require('../services/tts/TtsService');

/**
 * GET /api/fidel-families
 * List all active fidel families in curriculum order
 */
async function listFamilies(req, res, next) {
  try {
    const { search, grade_level_id } = req.query;
    const conditions = ['f.is_active = TRUE'];
    const params = [];

    if (search) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(f.family_name ILIKE $${params.length} OR f.base_character = $${params.length})`);
    }

    if (grade_level_id) {
      params.push(grade_level_id);
      conditions.push(`(f.curriculum_level_id IS NULL OR f.curriculum_level_id = $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        f.id,
        f.family_name,
        f.base_character,
        f.language_code,
        f.description,
        f.curriculum_level_id,
        f.display_order,
        f.is_active,
        COUNT(c.id)::int AS form_count,
        array_agg(c.character ORDER BY c.display_order) AS preview_forms
      FROM fidel_families f
      LEFT JOIN fidel_characters c ON c.family_id = f.id AND c.is_active = TRUE
      ${where}
      GROUP BY f.id
      ORDER BY f.display_order ASC, f.id ASC
    `;

    const result = await query(sql, params);
    res.json({ families: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fidel-families/:familyId
 * Get a single fidel family with its 7 forms
 */
async function getFamily(req, res, next) {
  try {
    const { familyId } = req.params;

    const famResult = await query(
      `SELECT * FROM fidel_families WHERE id = $1`,
      [familyId]
    );

    if (famResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fidel family not found' });
    }

    const charsResult = await query(
      `SELECT 
         c.*,
         a.id AS audio_asset_id,
         a.audio_url,
         a.generation_status,
         a.pronunciation_review_status,
         a.provider,
         a.voice_id
       FROM fidel_characters c
       LEFT JOIN fidel_audio_assets a 
         ON a.fidel_character_id = c.id 
        AND a.generation_status = 'ready'
       WHERE c.family_id = $1 AND c.is_active = TRUE
       ORDER BY c.display_order ASC`,
      [familyId]
    );

    res.json({
      family: famResult.rows[0],
      forms: charsResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/fidel-families/:familyId/characters
 * Get the characters / 7 forms for a given family
 */
async function getFamilyCharacters(req, res, next) {
  try {
    const { familyId } = req.params;

    const charsResult = await query(
      `SELECT 
         c.id,
         c.family_id,
         c.character,
         c.character_name,
         c.speech_text,
         c.speech_language,
         c.display_order,
         c.pronunciation_status,
         c.is_active,
         a.id AS audio_asset_id,
         a.audio_url,
         a.generation_status,
         a.pronunciation_review_status
       FROM fidel_characters c
       LEFT JOIN fidel_audio_assets a 
         ON a.fidel_character_id = c.id 
        AND a.generation_status = 'ready'
       WHERE c.family_id = $1 AND c.is_active = TRUE
       ORDER BY c.display_order ASC`,
      [familyId]
    );

    res.json({ characters: charsResult.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/fidel-characters/:characterId
 * Admin update for pronunciation/speech configuration
 */
async function updateCharacterSpeechConfig(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update the global pronunciation catalogue' });
    }

    const { characterId } = req.params;
    const { speech_text, character_name, speech_language, pronunciation_status } = req.body;

    const charRes = await query('SELECT * FROM fidel_characters WHERE id = $1', [characterId]);
    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fidel character not found' });
    }

    const oldChar = charRes.rows[0];
    const newSpeechText = speech_text !== undefined ? speech_text : oldChar.speech_text;
    const newName = character_name !== undefined ? character_name : oldChar.character_name;
    const newLang = speech_language !== undefined ? speech_language : oldChar.speech_language;
    const newStatus = pronunciation_status !== undefined ? pronunciation_status : oldChar.pronunciation_status;

    const updateRes = await query(
      `UPDATE fidel_characters
       SET speech_text = $1,
           character_name = $2,
           speech_language = $3,
           pronunciation_status = $4,
           updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [newSpeechText, newName, newLang, newStatus, characterId]
    );

    // If speech text changed, invalidate old audio cache
    if (speech_text && speech_text !== oldChar.speech_text) {
      await ttsService.invalidateCharacterAudio(characterId);
    }

    // Record audit log if audit_logs table exists
    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
         VALUES ($1, 'update_character_speech', 'fidel_character', $2, $3::jsonb)`,
        [
          req.user.id,
          characterId,
          JSON.stringify({ old: oldChar, updated: updateRes.rows[0] }),
        ]
      );
    } catch (e) {
      // Ignore if audit_logs table has different schema
    }

    res.json({ character: updateRes.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFamilies,
  getFamily,
  getFamilyCharacters,
  updateCharacterSpeechConfig,
};
