require('dotenv').config();
const { query } = require('../src/config/db');
(async () => {
  const r = await query('SELECT id, quiz_id, student_id, score, total_points, percentage, is_passed FROM quiz_results ORDER BY id');
  console.log('quiz_results:', JSON.stringify(r.rows));
  const s = await query('SELECT id, activity_id, student_id, status, score, feedback FROM activity_submissions ORDER BY id');
  console.log('activity_submissions:', JSON.stringify(s.rows));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });