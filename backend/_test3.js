require('dotenv').config();
const { pool } = require('./src/config/db');

const variants = {
  A_cast_text: `INSERT INTO student_resource_progress (
        student_id, lesson_resource_id, status, progress_percentage,
        started_at, completed_at, last_accessed_at, updated_at
      ) VALUES ($1, $2, $3::text, $4, now(),
        CASE WHEN $3::text = 'completed' THEN now() ELSE NULL END,
        now(), now())
      ON CONFLICT (student_id, lesson_resource_id)
      DO UPDATE SET
        status = $3::text,
        progress_percentage = $4,
        started_at = COALESCE(student_resource_progress.started_at, now()),
        completed_at = CASE WHEN $3::text = 'completed' THEN COALESCE(student_resource_progress.completed_at, now()) ELSE NULL END,
        last_accessed_at = now(),
        updated_at = now()`,
  B_boolean_param: `INSERT INTO student_resource_progress (
        student_id, lesson_resource_id, status, progress_percentage,
        started_at, completed_at, last_accessed_at, updated_at
      ) VALUES ($1, $2, $3, $4, now(),
        CASE WHEN $5 THEN now() ELSE NULL END,
        now(), now())
      ON CONFLICT (student_id, lesson_resource_id)
      DO UPDATE SET
        status = $3,
        progress_percentage = $4,
        started_at = COALESCE(student_resource_progress.started_at, now()),
        completed_at = CASE WHEN $5 THEN COALESCE(student_resource_progress.completed_at, now()) ELSE NULL END,
        last_accessed_at = now(),
        updated_at = now()`,
};

(async () => {
  for (const [name, sql] of Object.entries(variants)) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const params = name === 'B_boolean_param'
        ? [1, 1, 'in_progress', 6, false]
        : [1, 1, 'in_progress', 6];
      await client.query(sql, params);
      console.log(name, 'OK');
      await client.query('ROLLBACK');
    } catch (e) {
      await client.query('ROLLBACK');
      console.log(name, 'FAILED:', e.message);
    } finally {
      client.release();
    }
  }
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });