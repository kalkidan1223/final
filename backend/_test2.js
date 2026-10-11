require('dotenv').config();
const { pool } = require('./src/config/db');

(async () => {
  const studentId = 1;
  const videoId = 3;
  const effectiveDuration = 1200;
  const uniqueWatched = 75;
  const lastPosition = 75;
  const watchPct = 6;
  const status = 'in_progress';
  const isCompleted = false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO student_video_progress (
        student_id, video_id, duration_seconds, watched_seconds, last_position_seconds,
        progress_percentage, status, watch_percentage, current_position_seconds,
        completed, last_watched_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
      ON CONFLICT (student_id, video_id)
      DO UPDATE SET
        duration_seconds = GREATEST(student_video_progress.duration_seconds, EXCLUDED.duration_seconds),
        watched_seconds = GREATEST(student_video_progress.watched_seconds, EXCLUDED.watched_seconds),
        last_position_seconds = EXCLUDED.last_position_seconds,
        progress_percentage = GREATEST(student_video_progress.progress_percentage, EXCLUDED.progress_percentage),
        watch_percentage = GREATEST(student_video_progress.watch_percentage, EXCLUDED.watch_percentage),
        current_position_seconds = EXCLUDED.current_position_seconds,
        status = CASE WHEN student_video_progress.status = 'completed' THEN 'completed' ELSE EXCLUDED.status END,
        completed = student_video_progress.completed OR EXCLUDED.completed,
        last_watched_at = now(),
        updated_at = now()`,
      [studentId, videoId, effectiveDuration, uniqueWatched, lastPosition, watchPct, status, watchPct, lastPosition, isCompleted]
    );
    console.log('UPSERT OK');
    await client.query('ROLLBACK');
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('UPSERT FAILED:', e.message);
  } finally {
    client.release();
  }

  // Now the resource-progress helper query used by updateResourceProgressFromVideo
  const client2 = await pool.connect();
  try {
    await client2.query('BEGIN');
    await client2.query(
      `INSERT INTO student_resource_progress (
        student_id, lesson_resource_id, status, progress_percentage,
        started_at, completed_at, last_accessed_at, updated_at
      ) VALUES ($1, $2, $3, $4, now(),
        CASE WHEN $3 = 'completed' THEN now() ELSE NULL END,
        now(), now())
      ON CONFLICT (student_id, lesson_resource_id)
      DO UPDATE SET
        status = $3,
        progress_percentage = $4,
        started_at = COALESCE(student_resource_progress.started_at, now()),
        completed_at = CASE WHEN $3 = 'completed' THEN COALESCE(student_resource_progress.completed_at, now()) ELSE NULL END,
        last_accessed_at = now(),
        updated_at = now()`,
      [studentId, 1, 'in_progress', 6]
    );
    console.log('RESOURCE PROGRESS OK');
    await client2.query('ROLLBACK');
  } catch (e) {
    await client2.query('ROLLBACK');
    console.log('RESOURCE PROGRESS FAILED:', e.message);
  } finally {
    client2.release();
  }
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });