require('dotenv').config();
const { query } = require('../src/config/db');
(async () => {
  const s = await query("SELECT * FROM subjects ORDER BY id");
  console.log('subjects:', JSON.stringify(s.rows));
  const c = await query("SELECT id, title, subject_id, grade_level_id FROM courses ORDER BY id");
  console.log('courses:', JSON.stringify(c.rows));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });