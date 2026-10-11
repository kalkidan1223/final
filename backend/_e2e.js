require('dotenv').config();
const { query, pool } = require('./src/config/db');
const ctrl = require('./src/controllers/childLearningController');
const { getLessonAccess } = require('./src/utils/learningAccess');

const S = 1; // student 1

function mockRes() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

async function call(fn, req) {
  const res = mockRes();
  let err = null;
  await fn(req, res, (e) => { err = e; });
  return { status: res.statusCode, body: res.body, err };
}

(async () => {
  const user = (await query('SELECT user_id FROM students WHERE id=$1', [S])).rows[0];
  const reqUser = { id: user.user_id, role: 'student' };

  // clean slate
  await query('DELETE FROM student_video_progress WHERE student_id=$1', [S]);
  await query('DELETE FROM student_video_watch_intervals WHERE student_id=$1', [S]);
  await query('DELETE FROM student_resource_progress WHERE student_id=$1', [S]);
  await query('DELETE FROM student_lesson_progress WHERE student_id=$1', [S]);
  await query('DELETE FROM activity_submissions WHERE student_id=$1', [S]);

  // 1) VIDEO progress write should now succeed (was rolling back before)
  const v = await call(ctrl.updateVideoProgress, {
    user: reqUser, params: { videoId: '3' },
    body: { current_position_seconds: 60, duration_seconds: 1200, position: { from: 0, to: 60 } },
  });
  const svp = await query('SELECT status, watched_seconds, progress_percentage FROM student_video_progress WHERE student_id=$1 AND video_id=3', [S]);
  console.log('video update status:', v.status, '| err:', v.err && v.err.message, '| saved row:', JSON.stringify(svp.rows[0] || null));

  // Simulate genuine watching ~92% of the 1200s video, then re-post.
  for (let t = 60; t < 1104; t += 12) {
    await query('INSERT INTO student_video_watch_intervals (student_id, video_id, start_seconds, end_seconds) VALUES ($1,3,$2,$3)', [S, t, t + 12]);
  }
  const v2 = await call(ctrl.updateVideoProgress, {
    user: reqUser, params: { videoId: '3' },
    body: { current_position_seconds: 1104, duration_seconds: 1200, position: { from: 1104, to: 1110 } },
  });
  const svp2 = await query('SELECT status, progress_percentage FROM student_video_progress WHERE student_id=$1 AND video_id=3', [S]);
  console.log('after genuine watch:', v2.status, '| completed:', JSON.stringify(svp2.rows[0]));

  // 2) Activity completion (needs a submission first)
  await query(
    `INSERT INTO activity_submissions (activity_id, student_id, submitted_by, submission_text, status)
     VALUES (135, $1, 'student', 'done', 'graded')`,
    [S]
  );
  const a = await call(ctrl.completeActivity, { user: reqUser, params: { activityId: '135' }, body: {} });
  console.log('activity complete status:', a.status, '| body:', JSON.stringify(a.body));

  // 3) Lesson aggregate + next-lesson lock
  const slp = await query('SELECT status, progress_percentage, required_resources_completed, total_required_resources FROM student_lesson_progress WHERE student_id=$1 AND lesson_id=1', [S]);
  console.log('lesson 1 progress:', JSON.stringify(slp.rows[0] || null));
  const l1 = await getLessonAccess(S, 1);
  const l2 = await getLessonAccess(S, 2);
  console.log('lesson1 locked:', l1.isLocked, '| lesson2 locked:', l2.isLocked, '(expect false / false)');

  // cleanup
  await query('DELETE FROM student_video_progress WHERE student_id=$1', [S]);
  await query('DELETE FROM student_video_watch_intervals WHERE student_id=$1', [S]);
  await query('DELETE FROM student_resource_progress WHERE student_id=$1', [S]);
  await query('DELETE FROM student_lesson_progress WHERE student_id=$1', [S]);
  await query('DELETE FROM activity_submissions WHERE student_id=$1', [S]);
  console.log('cleaned up');
  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });