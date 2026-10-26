require('dotenv').config();
const { pool } = require('../src/config/db');

async function testDetail() {
  const lessonRes = await pool.query('SELECT id FROM lessons ORDER BY id DESC LIMIT 1;');
  const lessonId = lessonRes.rows[0].id;
  console.log('Testing lessonId:', lessonId);

  const familiesRes = await pool.query(
    `SELECT 
       f.id,
       f.family_name,
       f.base_character,
       f.language_code,
       f.description,
       lff.display_order AS family_order,
       (
         SELECT json_agg(json_build_object(
           'id', c.id,
           'character', c.character,
           'character_name', c.character_name,
           'speech_text', c.speech_text,
           'speech_language', c.speech_language,
           'display_order', c.display_order,
           'pronunciation_status', c.pronunciation_status,
           'audio_asset_id', a.id,
           'audio_url', a.audio_url,
           'generation_status', COALESCE(a.generation_status, 'pending'),
           'pronunciation_review_status', COALESCE(a.pronunciation_review_status, 'approved')
         ) ORDER BY c.display_order ASC)
         FROM fidel_characters c
         LEFT JOIN fidel_audio_assets a 
           ON a.fidel_character_id = c.id 
          AND a.generation_status = 'ready'
         WHERE c.family_id = f.id AND c.is_active = TRUE
       ) AS forms
     FROM lesson_fidel_families lff
     JOIN fidel_families f ON f.id = lff.family_id
     WHERE lff.lesson_id = $1
     ORDER BY lff.display_order ASC`,
    [lessonId]
  );

  console.log('FAMILIES COUNT:', familiesRes.rows.length);
  if (familiesRes.rows[0]) {
    console.log('FORMS LENGTH:', familiesRes.rows[0].forms?.length);
    console.log('FORMS:', familiesRes.rows[0].forms);
  }
  process.exit(0);
}

testDetail().catch(e => { console.error(e); process.exit(1); });
