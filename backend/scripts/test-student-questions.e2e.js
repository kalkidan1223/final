require('dotenv/config');
const { Pool } = require('pg');
const { signAccessToken } = require('../src/utils/jwt');
const app = require('../src/app');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let BASE = '';
let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) { passed += 1; console.log(`PASS  ${name}`); }
  else { failed += 1; console.log(`FAIL  ${name} ${extra}`); }
}

async function req(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

(async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  BASE = `http://127.0.0.1:${server.address().port}/api`;

  try {
    // ---- Fixtures -------------------------------------------------------
    const student = (await pool.query(
      `SELECT s.id AS student_id, s.user_id, u.email, u.full_name, s.age_group_id
       FROM students s JOIN users u ON u.id = s.user_id
       WHERE s.user_id IS NOT NULL AND s.is_active = TRUE ORDER BY s.id LIMIT 1`
    )).rows[0];
    const instr = (await pool.query(
      `SELECT i.id AS instructor_id, i.user_id, u.email
       FROM instructors i JOIN users u ON u.id = i.user_id ORDER BY i.id LIMIT 1`
    )).rows[0];
    const course = (await pool.query(
      `SELECT c.id AS course_id, c.instructor_id, c.age_group_id
       FROM courses c WHERE c.status='published' AND c.age_group_id = $1
       ORDER BY c.id LIMIT 1`, [student.age_group_id]
    )).rows[0];
    const lesson = (await pool.query(
      `SELECT id FROM lessons WHERE course_id = $1 ORDER BY order_index, id LIMIT 1`, [course.course_id]
    )).rows[0];

    console.log('Fixtures:', { student, instr, course, lesson });

    const studentToken = signAccessToken({ id: student.user_id, role: 'student', email: student.email });
    const instrToken = signAccessToken({ id: instr.user_id, role: 'instructor', email: instr.email });

    await pool.query('DELETE FROM student_questions WHERE student_id = $1', [student.student_id]);

    // ---- 1. Pending count starts at 0 ----------------------------------
    let r = await req('GET', '/child/questions/pending-count', { token: studentToken });
    check('pending-count returns 0 at start', r.status === 200 && r.data.pending_count === 0, JSON.stringify(r.data));

    // ---- 2. Submit question 1 ------------------------------------------
    r = await req('POST', '/child/questions', {
      token: studentToken,
      body: { question_text: '  Why do ሀ and ሁ sound different?  ', lesson_id: lesson.id },
    });
    check('submit Q1 -> 201', r.status === 201, JSON.stringify(r.data));
    const q1 = r.data.question;
    check('Q1 associated with lesson and instructor', !!q1 && q1.lesson_id === lesson.id && !!q1.instructor_id);
    check('Q1 trims whitespace', q1?.question_text === 'Why do ሀ and ሁ sound different?');
    check('pending_count = 1 after Q1', r.data.pending_count === 1);

    // ---- 3. Submit question 2 ------------------------------------------
    r = await req('POST', '/child/questions', {
      token: studentToken,
      body: { question_text: 'What is 2 + 3?', lesson_id: lesson.id },
    });
    check('submit Q2 -> 201', r.status === 201);
    const q2 = r.data.question;
    check('pending_count = 2 after Q2', r.data.pending_count === 2);

    // ---- 4. Third submission rejected (409) ----------------------------
    r = await req('POST', '/child/questions', {
      token: studentToken,
      body: { question_text: 'A third question', lesson_id: lesson.id },
    });
    check('submit Q3 -> 409 conflict', r.status === 409 && r.data.code === 'QUESTION_LIMIT_REACHED', JSON.stringify(r.data));

    // ---- 5. Validation ------------------------------------------------
    r = await req('POST', '/child/questions', { token: studentToken, body: { question_text: '    ', lesson_id: lesson.id } });
    check('whitespace-only question rejected (400)', r.status === 400, JSON.stringify(r.data));

    r = await req('POST', '/child/questions', { token: studentToken, body: { question_text: 'x'.repeat(600), lesson_id: lesson.id } });
    check('over-length question rejected (400)', r.status === 400, JSON.stringify(r.data));

    // ---- 6. Instructor sees the questions ------------------------------
    r = await req('GET', '/instructor/questions?status=waiting', { token: instrToken });
    check('instructor waiting list contains Q1 & Q2', r.status === 200 && r.data.questions.some((q) => q.id === q1.id) && r.data.questions.some((q) => q.id === q2.id));
    check('waiting list ordered oldest first', r.status === 200 && r.data.questions[0]?.id === q1.id);

    r = await req('GET', '/instructor/questions/summary', { token: instrToken });
    check('instructor summary total_unanswered >= 2', r.status === 200 && r.data.summary.total_unanswered >= 2, JSON.stringify(r.data));

    r = await req('GET', `/instructor/questions/${q1.id}`, { token: instrToken });
    check('instructor can open Q1 detail', r.status === 200 && r.data.question.id === q1.id);

    // ---- 7. Answer Q1 --------------------------------------------------
    r = await req('POST', `/instructor/questions/${q1.id}/answer`, {
      token: instrToken, body: { answer_text: 'ሀ has a hard sound, ሁ is softer. Watch the fidel video in this lesson.' },
    });
    check('answer Q1 -> 200', r.status === 200 && r.data.status === 'ANSWERED', JSON.stringify(r.data));

    // ---- 8. Duplicate answer rejected ----------------------------------
    r = await req('POST', `/instructor/questions/${q1.id}/answer`, { token: instrToken, body: { answer_text: 'again' } });
    check('second answer to Q1 -> 409', r.status === 409 && r.data.code === 'QUESTION_ALREADY_ANSWERED', JSON.stringify(r.data));

    // ---- 9. Slot released ----------------------------------------------
    r = await req('GET', '/child/questions/pending-count', { token: studentToken });
    check('pending_count = 1 after answer', r.status === 200 && r.data.pending_count === 1, JSON.stringify(r.data));

    r = await req('POST', '/child/questions', { token: studentToken, body: { question_text: 'Now can I ask again?', lesson_id: lesson.id } });
    check('child can ask again after a slot freed -> 201', r.status === 201, JSON.stringify(r.data));

    // ---- 10. Child history + answer visible ----------------------------
    r = await req('GET', '/child/questions', { token: studentToken });
    const answered = r.data.questions?.find((q) => q.id === q1.id);
    check('child sees answered Q1 with answer text', r.status === 200 && answered?.status === 'ANSWERED' && !!answered?.answer_text);
    check('child counts: pending = 2, answered >= 1', r.data.counts.pending === 2 && r.data.counts.answered >= 1, JSON.stringify(r.data.counts));

    // ---- 11. Child notification created --------------------------------
    r = await req('GET', '/child/notifications', { token: studentToken });
    const notif = r.data.notifications?.find((n) => String(n.related_question_id) === String(q1.id));
    check('child received answer notification linked to Q1', r.status === 200 && !!notif, JSON.stringify(r.data.notifications?.[0]));

    // ---- 12. Missing question ------------------------------------------
    r = await req('GET', `/child/questions/${q2.id + 99999}`, { token: studentToken });
    check('unknown question -> 404 for child', r.status === 404);

    // ---- 13. Instructor edit answer ------------------------------------
    r = await req('PATCH', `/instructor/questions/${q1.id}/answer`, { token: instrToken, body: { answer_text: 'Edited: ሀ is hard, ሁ is soft.' } });
    check('instructor can edit own answer -> 200', r.status === 200 && r.data.answer.answer_text.startsWith('Edited:'), JSON.stringify(r.data));

    // ---- 14. Unauthorized instructor -----------------------------------
    const tempEmail = `qa_temp_instr_${Date.now()}@test.local`;
    const tempUser = (await pool.query(
      `INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, 'x', 'instructor', 'QA Temp Instructor') RETURNING id`,
      [tempEmail]
    )).rows[0];
    await pool.query(`INSERT INTO instructors (user_id) VALUES ($1)`, [tempUser.id]);
    const tempToken = signAccessToken({ id: tempUser.id, role: 'instructor', email: tempEmail });

    r = await req('GET', `/instructor/questions/${q1.id}`, { token: tempToken });
    check('unauthorized instructor cannot view question -> 403', r.status === 403, JSON.stringify(r.data));

    r = await req('POST', `/instructor/questions/${q1.id}/answer`, { token: tempToken, body: { answer_text: 'hijack' } });
    check('unauthorized instructor cannot answer -> 403', r.status === 403, JSON.stringify(r.data));

    r = await req('GET', '/instructor/questions', { token: tempToken });
    check('unauthorized instructor list is empty', r.status === 200 && r.data.questions.length === 0);

    // ---- 15. Auth required ---------------------------------------------
    r = await req('GET', '/child/questions');
    check('no token -> 401', r.status === 401);

    // ---- 16. Concurrency: never exceed 2 pending ------------------------
    await pool.query('DELETE FROM student_questions WHERE student_id = $1', [student.student_id]);
    const attempts = Array.from({ length: 5 }, (_, i) =>
      req('POST', '/child/questions', { token: studentToken, body: { question_text: `Concurrent question ${i + 1}`, lesson_id: lesson.id } })
    );
    const results = await Promise.all(attempts);
    const created = results.filter((x) => x.status === 201).length;
    const conflicts = results.filter((x) => x.status === 409).length;
    check('concurrent submits: exactly 2 created', created === 2, JSON.stringify(results.map((x) => x.status)));
    check('concurrent submits: rest are 409 conflicts', conflicts === 3, JSON.stringify(results.map((x) => x.status)));
    const finalCount = (await pool.query(
      `SELECT COUNT(*)::int AS n FROM student_questions WHERE student_id = $1 AND status='WAITING_FOR_ANSWER'`, [student.student_id]
    )).rows[0].n;
    check('DB invariant: exactly 2 WAITING_FOR_ANSWER', finalCount === 2, `n=${finalCount}`);

    // ---- 17. Concurrency: duplicate answer ------------------------------
    const waitingId = (await pool.query(
      `SELECT id FROM student_questions WHERE student_id = $1 AND status='WAITING_FOR_ANSWER' ORDER BY id LIMIT 1`, [student.student_id]
    )).rows[0].id;
    const answerAttempts = await Promise.all([
      req('POST', `/instructor/questions/${waitingId}/answer`, { token: instrToken, body: { answer_text: 'Answer A' } }),
      req('POST', `/instructor/questions/${waitingId}/answer`, { token: instrToken, body: { answer_text: 'Answer B' } }),
    ]);
    const okCount = answerAttempts.filter((x) => x.status === 200).length;
    const conflictCount = answerAttempts.filter((x) => x.status === 409).length;
    check('concurrent duplicate answers: exactly one succeeds', okCount === 1 && conflictCount === 1, JSON.stringify(answerAttempts.map((x) => x.status)));
    const ansRows = (await pool.query('SELECT COUNT(*)::int AS n FROM student_question_answers WHERE question_id = $1', [waitingId])).rows[0].n;
    check('only one answer row stored', ansRows === 1, `n=${ansRows}`);

    // ---- Cleanup --------------------------------------------------------
    await pool.query('DELETE FROM student_questions WHERE student_id = $1', [student.student_id]);
    await pool.query('DELETE FROM users WHERE id = $1', [tempUser.id]);

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('TEST RUN ERROR', err);
    failed += 1;
  } finally {
    server.close();
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
