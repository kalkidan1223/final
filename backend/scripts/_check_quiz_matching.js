// End-to-end check for MATCHING quiz questions.
//
// Covers the two bugs that made matching quizzes look empty in the instructor
// builder, plus the child-side grading that was never implemented:
//   1. A matching question sent with the payload the builder now produces
//      (options = { pairs: [...] }) survives a create + bulk-save round-trip.
//   2. GET /api/quizzes/:id returns the pairs intact, which is what the
//      builder's fetchQuestions now keeps instead of overwriting with [].
//   3. The child grader marks an all-correct selection correct, a mismatched
//      one wrong, and a partial one wrong.
//
// Tokens are minted from the JWT secret, so no password is needed. The quiz it
// creates is deleted again, leaving the demo database as found.

require('dotenv/config');
const { query } = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');
const { gradeAnswer, correctAnswerText } = require('../src/utils/quizGrading');

const BASE = 'http://127.0.0.1:5000';
let failures = 0;

function check(label, condition, detail = '') {
  const mark = condition ? '  ok  ' : ' FAIL ';
  if (!condition) failures += 1;
  console.log(`[${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
}

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

const PAIRS = [
  { question: '4 + 4', answer: '8' },
  { question: '8 + 8', answer: '16' },
  { question: '45 + 46', answer: '91' },
];

let createdQuizId = null;

(async () => {
  // ── Accounts ─────────────────────────────────────────────────────────────
  const instructorRes = await query(
    `SELECT u.id AS user_id, u.email, i.id AS instructor_id
     FROM users u JOIN instructors i ON i.user_id = u.id
     WHERE u.role = 'instructor' ORDER BY i.id LIMIT 1`
  );
  if (instructorRes.rows.length === 0) {
    console.error('Need an instructor account.');
    process.exit(1);
  }
  const teacher = instructorRes.rows[0];
  const teacherToken = signAccessToken({
    id: teacher.user_id,
    role: 'instructor',
    email: teacher.email,
  });

  const lessonRes = await query(
    `SELECT l.id
     FROM lessons l JOIN courses c ON c.id = l.course_id
     WHERE c.instructor_id = $1
     ORDER BY l.id LIMIT 1`,
    [teacher.instructor_id]
  );
  if (lessonRes.rows.length === 0) {
    console.error('Instructor has no lessons.');
    process.exit(1);
  }
  const lessonId = lessonRes.rows[0].id;
  console.log(`instructor=${teacher.email}  lesson=#${lessonId}\n`);

  // ── 1. Create the quiz, then bulk-save a matching question ────────────────
  const created = await call('POST', `/api/lessons/${lessonId}/quizzes`, {
    token: teacherToken,
    body: { title: 'TEST matching quiz (safe to delete)', status: 'inactive' },
  });
  check('POST /lessons/:id/quizzes', created.status === 201, `status ${created.status}`);
  if (created.status !== 201) {
    report();
    return;
  }
  createdQuizId = created.data.quiz.id;

  // Exactly what the fixed builder sends: options = { pairs }, identity mapping.
  const bulkPayload = {
    questions: [
      {
        question_text: 'Match the following items correctly',
        question_type: 'matching',
        correct_answer: JSON.stringify(PAIRS.map((_, i) => i)),
        points: 1,
        explanation: null,
        options: { pairs: PAIRS },
        question_config: null,
      },
    ],
  };
  const saved = await call('PUT', `/api/quizzes/${createdQuizId}/questions`, {
    token: teacherToken,
    body: bulkPayload,
  });
  check('PUT /quizzes/:id/questions (matching)', saved.status === 200, `status ${saved.status}`);

  // ── 2. The builder's edit load path ───────────────────────────────────────
  const fetched = await call('GET', `/api/quizzes/${createdQuizId}`, { token: teacherToken });
  check('GET /quizzes/:id', fetched.status === 200, `status ${fetched.status}`);
  const q = (fetched.data?.questions || [])[0];
  check('  a matching question came back', !!q && q.question_type === 'matching', q ? q.question_type : 'none');
  const returnedPairs = q?.options?.pairs;
  check(
    '  options.pairs survived the round-trip',
    Array.isArray(returnedPairs) && returnedPairs.length === PAIRS.length,
    `got ${Array.isArray(returnedPairs) ? returnedPairs.length : typeof returnedPairs}`
  );
  check(
    '  questions and answers are not swapped',
    Array.isArray(returnedPairs) &&
      returnedPairs.every((p, i) => p.question === PAIRS[i].question && p.answer === PAIRS[i].answer),
    Array.isArray(returnedPairs) ? JSON.stringify(returnedPairs) : 'n/a'
  );

  // ── 3. The single-question add path (used when editing) ───────────────────
  const added = await call('POST', `/api/quizzes/${createdQuizId}/questions`, {
    token: teacherToken,
    body: {
      question_text: 'Match the following items correctly',
      question_type: 'matching',
      correct_answer: JSON.stringify(PAIRS.map((_, i) => i)),
      points: 2,
      options: { pairs: PAIRS.slice(0, 2) },
    },
  });
  check('POST /quizzes/:id/questions (matching)', added.status === 201, `status ${added.status}`);
  check(
    '  the new question keeps its pairs',
    Array.isArray(added.data?.question?.options?.pairs) && added.data.question.options.pairs.length === 2,
    added.data?.question ? `${added.data.question.options?.pairs?.length} pair(s)` : 'no question'
  );

  // ── 4. Grading ────────────────────────────────────────────────────────────
  const gradeQ = { question_type: 'matching', options: { pairs: PAIRS } };
  check('all-correct selection is graded correct',
    gradeAnswer(gradeQ, JSON.stringify({ 0: '8', 1: '16', 2: '91' })) === true);
  check('a swapped answer is graded wrong',
    gradeAnswer(gradeQ, JSON.stringify({ 0: '16', 1: '8', 2: '91' })) === false);
  check('a partial selection is graded wrong',
    gradeAnswer(gradeQ, JSON.stringify({ 0: '8' })) === false);
  check('text answers are compared case-insensitively',
    gradeAnswer({ question_type: 'short_answer', correct_answer: 'Addis Ababa' }, ' addis ababa ') === true);
  check('the review text lists each pair',
    correctAnswerText(gradeQ).includes('4 + 4 → 8'),
    correctAnswerText(gradeQ));

  report();
})().catch((err) => {
  console.error('\nFAILED:', err);
  failures += 1;
  report();
});

async function cleanup() {
  if (createdQuizId) {
    try {
      await query('DELETE FROM quizzes WHERE id = $1', [createdQuizId]);
    } catch {
      /* nothing more to do during shutdown */
    }
  }
}

function report() {
  cleanup().finally(() => {
    console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
    process.exit(failures === 0 ? 0 : 1);
  });
}
