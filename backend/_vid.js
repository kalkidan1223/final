require('dotenv').config();
const { query } = require('./src/config/db');
(async () => {
  const v = await query('SELECT id, lesson_id, title, source_type, video_url, duration_seconds FROM videos ORDER BY id');
  console.log('VIDEOS:');
  v.rows.forEach((r) => console.log(JSON.stringify(r)));
  const svp = await query('SELECT * FROM student_video_progress ORDER BY id DESC LIMIT 5').catch(() => ({ rows: [] }));
  console.log('\nSTUDENT_VIDEO_PROGRESS (last 5):');
  svp.rows.forEach((r) => console.log(JSON.stringify(r)));
  const ivals = await query('SELECT student_id, video_id, COUNT(*)::int n FROM student_video_watch_intervals GROUP BY 1,2').catch(() => ({ rows: [] }));
  console.log('\nWATCH INTERVALS:');
  ivals.rows.forEach((r) => console.log(JSON.stringify(r)));
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });