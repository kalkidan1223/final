require('dotenv/config');
const { Pool } = require('pg');
const { signAccessToken } = require('../src/utils/jwt');
const app = require('../src/app');
const ttsService = require('../src/services/tts/TtsService');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let BASE = '';
let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`[PASS] ${name}`);
  } else {
    failed += 1;
    console.error(`[FAIL] ${name} -> ${extra}`);
  }
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
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING BRANA YOUTH FIDEL LEARNING & TTS TEST SUITE');
  console.log('====================================================');

  // Force mock TTS provider for fast, deterministic, zero-cost test suite
  process.env.TTS_PROVIDER = 'mock';

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  BASE = `http://127.0.0.1:${server.address().port}/api`;

  try {
    // ------------------------------------------------------------------------
    // SETUP FIXTURES & TEST IDENTITIES
    // ------------------------------------------------------------------------
    // 1. Get or setup an active instructor
    let instructorRow = (
      await pool.query(
        `SELECT i.id AS instructor_id, i.user_id, u.email, u.full_name
         FROM instructors i
         JOIN users u ON u.id = i.user_id
         ORDER BY i.id ASC LIMIT 1`
      )
    ).rows[0];

    // 2. Get an unauthorized user (to test permission denial)
    let otherUserRow = (
      await pool.query(
        `SELECT u.id, u.email, u.role
         FROM users u
         WHERE u.id != $1 AND u.role = 'instructor'
         LIMIT 1`,
        [instructorRow.user_id]
      )
    ).rows[0];

    if (!otherUserRow) {
      // Create a dummy second instructor for negative auth tests
      const dummyRes = await pool.query(
        `INSERT INTO users (email, password_hash, role, full_name)
         VALUES ('unassigned_teacher@brana.edu', 'hash', 'instructor', 'Unassigned Teacher')
         ON CONFLICT (email) DO UPDATE SET role = 'instructor'
         RETURNING id, email, role`
      );
      await pool.query(
        `INSERT INTO instructors (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [dummyRes.rows[0].id]
      );
      otherUserRow = dummyRes.rows[0];
    }

    // 3. Create a dedicated test course assigned to instructorRow
    const gradeRes = await pool.query(`SELECT id FROM grade_levels LIMIT 1`);
    const subRes = await pool.query(`SELECT id FROM subjects WHERE code = 'AMH' OR language = 'Amharic' LIMIT 1`);
    const gradeId = gradeRes.rows[0]?.id || 1;
    const subId = subRes.rows[0]?.id || 1;

    const createdCourse = await pool.query(
      `INSERT INTO courses (instructor_id, grade_level_id, subject_id, title, status, sequential_learning)
       VALUES ($1, $2, $3, 'Amharic Fidel Practice Test Course ' || floor(random() * 10000), 'published', FALSE)
       RETURNING id, title, grade_level_id, subject_id`,
      [instructorRow.instructor_id, gradeId, subId]
    );
    let courseRow = createdCourse.rows[0];

    // 4. Get active student matching course grade level
    let studentRow = (
      await pool.query(
        `SELECT s.id AS student_id, s.user_id, u.email, u.full_name, s.grade_level_id
         FROM students s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.is_active = TRUE AND (s.grade_level_id = $1 OR $1 IS NULL)
         ORDER BY s.id ASC LIMIT 1`,
        [courseRow.grade_level_id]
      )
    ).rows[0];

    if (!studentRow) {
      studentRow = (
        await pool.query(
          `SELECT s.id AS student_id, s.user_id, s.grade_level_id
           FROM students s WHERE s.is_active = TRUE LIMIT 1`
        )
      ).rows[0];
      // ensure student has access to course grade
      await pool.query(`UPDATE students SET grade_level_id = $1 WHERE id = $2`, [
        courseRow.grade_level_id,
        studentRow.student_id,
      ]);
    }

    // If student has no direct login account, find their parent
    let studentToken = null;
    let parentToken = null;
    if (studentRow.user_id) {
      studentToken = signAccessToken({ id: studentRow.user_id, role: 'student', email: studentRow.email || 'student@brana.edu' });
    }
    const parentRow = (
      await pool.query(
        `SELECT p.id, p.user_id, u.email
         FROM parents p
         JOIN users u ON u.id = p.user_id
         JOIN students s ON s.parent_id = p.id
         WHERE s.id = $1 LIMIT 1`,
        [studentRow.student_id]
      )
    ).rows[0];

    if (parentRow) {
      parentToken = signAccessToken({ id: parentRow.user_id, role: 'parent', email: parentRow.email });
      if (!studentToken) studentToken = parentToken; // Parent acts on behalf of child
    }

    const instructorToken = signAccessToken({
      id: instructorRow.user_id,
      role: 'instructor',
      email: instructorRow.email,
    });
    const unauthorizedToken = signAccessToken({
      id: otherUserRow.id,
      role: 'instructor',
      email: otherUserRow.email,
    });
    const adminToken = signAccessToken({
      id: 999999,
      role: 'admin',
      email: 'admin@brana.edu',
    });

    console.log('Active Fixtures:');
    console.log({
      courseId: courseRow.id,
      instructorId: instructorRow.instructor_id,
      studentId: studentRow.student_id,
    });

    // ========================================================================
    // 1. DATABASE INTEGRITY TESTS
    // ========================================================================
    console.log('\n--- 1. DATABASE TESTS ---');

    // Test: 'ሀ' family exists and contains exactly 7 forms
    const haForms = await pool.query(
      `SELECT c.character, c.display_order, c.character_name, c.speech_text
       FROM fidel_families f
       JOIN fidel_characters c ON c.family_id = f.id
       WHERE f.base_character = 'ሀ' AND c.is_active = TRUE
       ORDER BY c.display_order ASC`
    );
    check('Family ሀ contains exactly 7 forms', haForms.rows.length === 7, `Got ${haForms.rows.length}`);

    const expectedHa = ['ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ'];
    const actualHa = haForms.rows.map((r) => r.character);
    check(
      'Forms are in curriculum-defined order: ሀ, ሁ, ሂ, ሃ, ሄ, ህ, ሆ',
      JSON.stringify(actualHa) === JSON.stringify(expectedHa),
      `Got ${actualHa.join(', ')}`
    );

    // Test: Speech text and character are separate fields
    const hasSpeechTextCol = haForms.rows.every((r) => r.speech_text && r.character);
    check('Speech text and character are distinct database fields', hasSpeechTextCol);

    // Test: Unique constraint on family_id and character rejects duplicate
    let duplicateRejected = false;
    try {
      const famId = (await pool.query("SELECT id FROM fidel_families WHERE base_character = 'ሀ'")).rows[0].id;
      await pool.query(
        `INSERT INTO fidel_characters (family_id, character, display_order, speech_text)
         VALUES ($1, 'ሀ', 1, 'ሀ')`,
        [famId]
      );
    } catch (err) {
      duplicateRejected = true;
    }
    check('Database rejects duplicate character within same family', duplicateRejected);

    // ========================================================================
    // 2. INSTRUCTOR WORKFLOW TESTS
    // ========================================================================
    console.log('\n--- 2. INSTRUCTOR WORKFLOW TESTS ---');

    // Test: Catalogue API lists families
    const catRes = await req('GET', '/fidel-families', { token: instructorToken });
    check('Catalogue API returns 200 and list of families', catRes.status === 200 && catRes.data.families.length >= 24);

    const haFamInCat = catRes.data.families.find((f) => f.base_character === 'ሀ');
    check('Catalogue entry for ሀ automatically lists 7 forms count', haFamInCat && haFamInCat.form_count === 7);

    // Test: Unauthorized instructor cannot create or edit lesson in course not assigned
    const unauthCreate = await req('POST', `/instructor/courses/${courseRow.id}/fidel-lessons`, {
      token: unauthorizedToken,
      body: { title: 'Illegal Lesson', family_ids: [haFamInCat.id] },
    });
    check('Instructor cannot create lesson in unassigned course (403)', unauthCreate.status === 403);

    // Test: Assigned instructor creates a fidel lesson selecting family ሀ
    const createRes = await req('POST', `/instructor/courses/${courseRow.id}/fidel-lessons`, {
      token: instructorToken,
      body: {
        title: 'Mastering the Ha Family',
        description: 'First steps in Amharic fidel learning for young children',
        learning_objectives: 'Identify and pronounce all seven forms of ሀ',
        family_ids: [haFamInCat.id],
        practice_settings: {
          activities_enabled: ['listen_explore', 'listen_identify', 'sound_match', 'quiz'],
          listening_required_first: true,
          require_all_audio_ready: true,
        },
      },
    });
    check('Assigned instructor successfully creates fidel lesson', createRes.status === 201 && createRes.data.lesson.id);
    const createdLessonId = createRes.data.lesson.id;

    // Test: Lesson detail automatically loads all seven forms without manual selection
    const detailRes = await req('GET', `/instructor/fidel-lessons/${createdLessonId}`, {
      token: instructorToken,
    });
    check('Lesson detail returns 200', detailRes.status === 200);
    const detailFam = detailRes.data.families[0];
    check('Lesson detail automatically includes 7 forms of selected family', detailFam && detailFam.forms.length === 7);
    check(
      'Forms in lesson match: ሀ, ሁ, ሂ, ሃ, ሄ, ህ, ሆ',
      JSON.stringify(detailFam.forms.map((f) => f.character)) === JSON.stringify(expectedHa)
    );

    // Test: Reordering and adding multiple families
    const leFamInCat = catRes.data.families.find((f) => f.base_character === 'ለ');
    const updateRes = await req('PUT', `/instructor/fidel-lessons/${createdLessonId}`, {
      token: instructorToken,
      body: {
        family_ids: [leFamInCat.id, haFamInCat.id], // reordered: ለ first, then ሀ
      },
    });
    check('Instructor can update and reorder selected families', updateRes.status === 200);

    const reorderedDetail = await req('GET', `/instructor/fidel-lessons/${createdLessonId}`, {
      token: instructorToken,
    });
    const reorderedBases = reorderedDetail.data.families.map((f) => f.base_character);
    check('Reordered families preserved in database (ለ then ሀ)', JSON.stringify(reorderedBases) === JSON.stringify(['ለ', 'ሀ']));

    // Restore to ሀ for clean child test
    await req('PUT', `/instructor/fidel-lessons/${createdLessonId}`, {
      token: instructorToken,
      body: { family_ids: [haFamInCat.id] },
    });

    // Test: Validation rejects publishing without title or with 0 families
    const badPublish = await req('PUT', `/instructor/fidel-lessons/${createdLessonId}`, {
      token: instructorToken,
      body: { title: '', family_ids: [] },
    });
    check('Invalid update rejected with 400', badPublish.status === 400);

    // ========================================================================
    // 3. TTS INTEGRATION & AUDIO CACHING TESTS
    // ========================================================================
    console.log('\n--- 3. TTS INTEGRATION & CACHING TESTS ---');

    const firstForm = detailFam.forms[0]; // 'ሀ'
    // Test: Audio preview endpoint generates/retrieves asset
    const prevRes = await req('POST', `/instructor/fidel-characters/${firstForm.id}/audio-preview`, {
      token: instructorToken,
    });
    check('Audio preview returns valid audio asset', prevRes.status === 200 && prevRes.data.asset.audio_url);

    // Test: Cached audio is reused without redundant synthesis
    const prevRes2 = await req('POST', `/instructor/fidel-characters/${firstForm.id}/audio-preview`, {
      token: instructorToken,
    });
    check(
      'Cached audio asset ID is reused on subsequent call',
      prevRes.data.asset.id === prevRes2.data.asset.id && prevRes.data.asset.speech_text_hash === prevRes2.data.asset.speech_text_hash
    );

    // Test: Concurrent requests for same asset do not duplicate generation
    const [c1, c2, c3] = await Promise.all([
      req('POST', `/instructor/fidel-characters/${firstForm.id}/audio-preview`, { token: instructorToken }),
      req('POST', `/instructor/fidel-characters/${firstForm.id}/audio-preview`, { token: instructorToken }),
      req('POST', `/instructor/fidel-characters/${firstForm.id}/audio-preview`, { token: instructorToken }),
    ]);
    check('Concurrent requests resolve cleanly with same asset', c1.data.asset.id === c2.data.asset.id && c2.data.asset.id === c3.data.asset.id);

    // Test: Pronunciation issue reporting
    const reportRes = await req('POST', `/instructor/fidel-audio-assets/${prevRes.data.asset.id}/report-issue`, {
      token: instructorToken,
      body: { issue_type: 'vowel_length', description: 'Sound should be slightly shorter for Grade 1 primer' },
    });
    check('Instructor can report pronunciation issue', reportRes.status === 201 && reportRes.data.report.id);

    // Test: Admin speech text update invalidates audio cache
    const adminUpdate = await req('PUT', `/admin/fidel-characters/${firstForm.id}`, {
      token: adminToken,
      body: { speech_text: 'ሀ' },
    });
    check('Admin can update speech configuration', adminUpdate.status === 200);

    // Prewarm and publish the lesson
    const pubRes = await req('POST', `/instructor/fidel-lessons/${createdLessonId}/publish`, {
      token: instructorToken,
    });
    check('Instructor publishes fidel lesson successfully', pubRes.status === 200 && pubRes.data.is_published === true);

    // ========================================================================
    // 4. CHILD LEARNING & AUDIO PLAYBACK TESTS
    // ========================================================================
    console.log('\n--- 4. CHILD LEARNING & PROGRESS TESTS ---');

    // Child headers if parent token
    const childHeaders = parentRow ? { 'X-Child-Id': String(studentRow.student_id) } : {};

    // Test: Child opens published lesson
    const childContent = await req('GET', `/student/lessons/${createdLessonId}/fidel-content`, {
      token: studentToken,
      headers: childHeaders,
    });
    check('Child accesses published lesson content (200)', childContent.status === 200);
    check('Child sees selected family ሀ', childContent.data.families[0]?.base_character === 'ሀ');

    const childForms = childContent.data.families[0].forms;
    check('Child sees all 7 forms with audio URLs', childForms.length === 7 && childForms.every((f) => f.audio_url));

    // Test: Child clicks a form to hear pronunciation -> records listen count
    const targetForm = childForms[0]; // 'ሀ'
    const listenRes1 = await req('POST', `/student/lessons/${createdLessonId}/fidel-progress`, {
      token: studentToken,
      headers: childHeaders,
      body: { fidel_character_id: targetForm.id },
    });
    check('Listening progress recorded successfully', listenRes1.status === 200 && listenRes1.data.progress.listen_count === 1);

    // Test: Child replays pronunciation -> listen_count increments
    const listenRes2 = await req('POST', `/student/lessons/${createdLessonId}/fidel-progress`, {
      token: studentToken,
      headers: childHeaders,
      body: { fidel_character_id: targetForm.id },
    });
    check('Replay increments listen count to 2', listenRes2.data.progress.listen_count === 2);

    // Test: Listening is NOT marked as mastery/practice completed
    check('Listening alone does NOT mark practice completed', listenRes2.data.progress.practice_completed_at === null);

    // Test: Progress persists upon refreshing / re-fetching
    const refetchProgress = await req('GET', `/student/lessons/${createdLessonId}/fidel-progress`, {
      token: studentToken,
      headers: childHeaders,
    });
    const storedCharProgress = refetchProgress.data.character_progress.find(
      (p) => String(p.fidel_character_id) === String(targetForm.id)
    );
    check('Progress persists after re-fetching', storedCharProgress && storedCharProgress.listen_count === 2);

    // Test: Child completes practice activity -> authoritative mastery recorded
    const completeRes = await req('POST', `/student/lessons/${createdLessonId}/fidel-practice-complete`, {
      token: studentToken,
      headers: childHeaders,
      body: {
        character_ids: childForms.map((f) => f.id),
        score: 100,
      },
    });
    check('Practice completion endpoint succeeds', completeRes.status === 200 && completeRes.data.is_completed === true);
    check('Lesson progress marked 100%', completeRes.data.progress_percentage === 100);

    // Verify student_lesson_progress in database
    const dbLessonProgress = await pool.query(
      `SELECT status, progress_percentage FROM student_lesson_progress WHERE student_id = $1 AND lesson_id = $2`,
      [studentRow.student_id, createdLessonId]
    );
    check(
      'PostgreSQL student_lesson_progress status is "completed"',
      dbLessonProgress.rows[0]?.status === 'completed' && Number(dbLessonProgress.rows[0]?.progress_percentage) === 100
    );

    // ========================================================================
    // 5. SECURITY & ACCESS CONTROL TESTS
    // ========================================================================
    console.log('\n--- 5. SECURITY & ACCESS TESTS ---');

    // Test: Student cannot publish instructor lessons
    const studentPublish = await req('POST', `/instructor/fidel-lessons/${createdLessonId}/publish`, {
      token: studentToken,
    });
    check('Student cannot publish lessons (403)', studentPublish.status === 403);

    // Test: Student cannot alter global pronunciation catalogue
    const studentCatalogAlter = await req('PUT', `/admin/fidel-characters/${firstForm.id}`, {
      token: studentToken,
      body: { speech_text: 'hacked' },
    });
    check('Student cannot alter global pronunciation catalogue (403)', studentCatalogAlter.status === 403);

    // Test: Child cannot open unpublished lesson
    const unpubRes = await pool.query(
      `INSERT INTO lessons (course_id, title, status, order_index) VALUES ($1, 'Secret Unpublished Lesson', 'inactive', 99) RETURNING id`,
      [courseRow.id]
    );
    await pool.query(
      `INSERT INTO lesson_fidel_configs (lesson_id, is_published) VALUES ($1, FALSE)`,
      [unpubRes.rows[0].id]
    );
    const secretLessonId = unpubRes.rows[0].id;

    const childSecretAccess = await req('GET', `/student/lessons/${secretLessonId}/fidel-content`, {
      token: studentToken,
      headers: childHeaders,
    });
    check('Child cannot access unpublished lesson (403)', childSecretAccess.status === 403);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    server.close();
    await pool.end();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Unexpected error during test execution:', err);
    server.close();
    await pool.end();
    process.exit(1);
  }
}

runTestSuite();
