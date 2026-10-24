require('dotenv').config();
const { query } = require('../src/config/db');
(async () => {
  const r = await query("SELECT column_name FROM information_schema.columns WHERE table_name='quiz_results' ORDER BY ordinal_position");
  console.log('quiz_results columns:', r.rows.map(x => x.column_name).join(', '));
  const q = await query('SELECT * FROM quiz_results WHERE id=1');
  console.log('row:', JSON.stringify(q.rows[0]));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });