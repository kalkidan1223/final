require('dotenv').config();
const { query } = require('./src/config/db');
(async () => {
  for (const t of ['student_video_progress', 'student_material_progress', 'lesson_resources']) {
    const cols = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n${t}:`);
    console.log(cols.rows.map((r) => r.column_name).join(', '));
  }
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });