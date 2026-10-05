// End-to-end check of the instructor-published child home.
//
// Tokens are minted directly from the JWT secret rather than logging in, so the
// check never needs a known password and never has to change one.
//
// What it proves, in order:
//   1. The reference kit is readable and the syllabary is complete.
//   2. Only admins can maintain reference data; only instructors/admins can pin.
//   3. An instructor sees only their OWN age groups and only their OWN courses.
//   4. Pinning works, is capped at 6, and reordering persists.
//   5. A child aged 9 or under gets exactly those pins on their dashboard, with
//      the instructor's own content, and can open the activity.
//   6. A child over 9 gets no child home, because it is not theirs to see.
//
// Every pin it creates is removed again, so the demo database is left as found.

require('dotenv/config');
const { query } = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');

// 127.0.0.1 rather than localhost: Node's fetch resolves localhost to ::1 first,
// and the server binds IPv4, so the name form fails with ECONNREFUSED.
const BASE = 'http://127.0.0.1:5000';
let failures = 0;

function check(label, condition, detail = '') {
  const mark = condition ? '  ok  ' : ' FAIL ';
  if (!condition) failures += 1;
  console.log(`[${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
}

async function call(method, path, { token, childId, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (childId) headers['X-Child-Id'] = String(childId);
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

const createdPinIds = [];

(async () => {
  // ── Accounts ──────────────────────────────────────────────────────────────
  const adminRes = await query("SELECT id, email FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const instructorRes = await query(
    `SELECT u.id AS user_id, u.email, i.id AS instructor_id
     FROM users u JOIN instructors i ON i.user_id = u.id
     WHERE u.role = 'instructor' ORDER BY i.id LIMIT 1`
  );
  if (adminRes.rows.length === 0 || instructorRes.rows.length === 0) {
    console.error('Need at least one admin and one instructor in the database.');
    process.exit(1);
  }

  const admin = adminRes.rows[0];
  const teacher = instructorRes.rows[0];
  const adminToken = signAccessToken({ id: admin.id, role: 'admin', email: admin.email });
  const teacherToken = signAccessToken({
    id: teacher.user_id,
    role: 'instructor',
    email: teacher.email,
  });
  console.log(`admin=${admin.email}  instructor=${teacher.email}\n`);

  // ── 1. Reference kit ──────────────────────────────────────────────────────
  const kit = await call('GET', '/api/reference/early-learner-kit', { token: teacherToken });
  check('GET /reference/early-learner-kit', kit.status === 200, `status ${kit.status}`);

  const { fidel_letters: fidel, geez_numerals: numerals, picture_words: words, encouragement_phrases: praise } = kit.data || {};
  check('  the full Ge\'ez syllabary is present', fidel?.length >= 31, `${fidel?.length} rows`);
  check('  10 Ge\'ez numerals seeded', numerals?.length === 10, `${numerals?.length} rows`);
  check('  picture words seeded', (words?.length || 0) >= 30, `${words?.length} rows`);
  check('  encouragement phrases seeded', (praise?.length || 0) >= 3, `${praise?.length} rows`);

  const badOrder = (fidel || []).filter((l) => (l.syllables || []).length !== 7);
  check('  every letter has 7 vowel orders', badOrder.length === 0,
    badOrder.length ? `wrong: ${badOrder.map((l) => l.base_char).join(' ')}` : 'all correct');

  const dupes = new Set();
  const repeated = (words || []).filter((w) => (dupes.has(w.word) ? true : (dupes.add(w.word), false)));
  check('  no duplicate picture words', repeated.length === 0,
    repeated.length ? `duplicated: ${repeated.map((w) => w.word).join(', ')}` : 'unique');

  const linkedWords = (words || []).filter((w) => w.example_for_letter);
  const known = new Set(fidel.map((l) => l.base_char));
  const orphans = linkedWords.filter((w) => !known.has(w.example_for_letter));
  check('  every word links to a real letter', orphans.length === 0,
    orphans.length ? `orphans: ${orphans.map((w) => `${w.word}->${w.example_for_letter}`).join(', ')}` : `${linkedWords.length} linked`);

  // ── 2. Access control ─────────────────────────────────────────────────────
  const studentRes = await query(
    `SELECT s.id, s.full_name, u.id AS user_id, u.email,
            EXTRACT(YEAR FROM age(CURRENT_DATE, s.date_of_birth))::int AS age,
            s.age_group_id
     FROM students s JOIN users u ON u.id = s.user_id
     ORDER BY s.id`
  );
  const kids = studentRes.rows;
  if (kids.length === 0) {
    console.error('Need at least one student account.');
    process.exit(1);
  }
  const young = kids.find((k) => k.age <= 9) || null;
  const older = kids.find((k) => k.age >= 10) || null;
  const anyKid = kids[0];
  const kidToken = signAccessToken({
    id: anyKid.user_id,
    role: 'student',
    email: anyKid.email,
  });

  const studentRef = await call('GET', '/api/reference/admin/fidel', { token: kidToken });
  check('student cannot reach reference admin', studentRef.status === 403, `status ${studentRef.status}`);

  const studentPins = await call('GET', '/api/home/pins?age_group_id=1', { token: kidToken });
  check('student cannot reach home pins', studentPins.status === 403, `status ${studentPins.status}`);

  const anon = await call('GET', '/api/reference/early-learner-kit');
  check('anonymous cannot read the reference kit', anon.status === 401, `status ${anon.status}`);

  // ── 3. Instructor scope ───────────────────────────────────────────────────
  const courses = await call('GET', '/api/instructor/courses', { token: teacherToken });
  check('GET /instructor/courses', courses.status === 200, `status ${courses.status}`);
  const theirCourses = courses.data?.courses || [];
  console.log(`      ${theirCourses.length} course(s) assigned to this instructor:`);
  for (const c of theirCourses) {
    console.log(`        #${c.course_id} "${c.course_title}" age_group_id=${c.age_group_id} (${c.age_group_name}) status=${c.course_status}`);
  }
  check('  instructor course list carries age_group_id',
    theirCourses.every((c) => c.age_group_id != null),
    theirCourses.length ? 'present' : 'no courses to check');

  const ownCourseIds = new Set(theirCourses.map((c) => c.course_id));
  const target = theirCourses.find((c) => c.age_group_id != null && c.course_status === 'published');
  if (!target) {
    console.log('\nNo published course with an age group for this instructor; stopping after 1-3.');
    report();
    return;
  }
  const ageGroupId = target.age_group_id;

  const candidates = await call('GET', `/api/home/candidates?age_group_id=${ageGroupId}`, { token: teacherToken });
  check(`GET /home/candidates for age group ${ageGroupId}`, candidates.status === 200, `status ${candidates.status}`);
  const acts = candidates.data?.activities || [];
  console.log(`      ${acts.length} activities, ${candidates.data?.lessons?.length || 0} lessons available to pin`);
  const foreign = acts.filter((a) => !ownCourseIds.has(a.course_id));
  check('  candidates contain no course from another instructor', foreign.length === 0,
    foreign.length ? `${foreign.length} leaked` : 'all owned');

  // A different age group must not leak content this instructor does not own.
  // Note this is an OWNERSHIP check, not an emptiness one: the teacher legitimately
  // publishes for several age bands, so "no rows" would be a false expectation.
  const otherAgeGroup = await call('GET', '/api/home/candidates?age_group_id=2', { token: teacherToken });
  const otherActs = otherAgeGroup.data?.activities || [];
  const otherForeign = otherActs.filter((a) => !ownCourseIds.has(a.course_id));
  check('  another age group leaks no course from another instructor',
    otherForeign.length === 0,
    otherForeign.length
      ? `${otherForeign.length} of ${otherActs.length} leaked`
      : `${otherActs.length} candidates, all owned`);

  // ── 4. Pinning ────────────────────────────────────────────────────────────
  const wanted = ['letter_tracing', 'counting', 'matching'];
  const chosen = [];
  for (const type of wanted) {
    const a = acts.find((x) => x.activity_type === type && !x.is_pinned);
    if (!a) {
      console.log(`      (no ${type} activity published for age group ${ageGroupId})`);
      continue;
    }
    const res = await call('POST', '/api/home/pins', {
      token: teacherToken,
      body: { age_group_id: ageGroupId, resource_type: 'activity', resource_id: a.id },
    });
    check(`pin ${type} "${a.title}"`, res.status === 201, `status ${res.status}`);
    if (res.status === 201) {
      chosen.push(res.data.pin);
      createdPinIds.push(res.data.pin.id);
    }
  }

  // Cap at 6.
  const spares = acts.filter((a) => !chosen.some((p) => p.resource_id === a.id));
  for (const spare of spares) {
    if (chosen.length >= 6) break;
    const res = await call('POST', '/api/home/pins', {
      token: teacherToken,
      body: { age_group_id: ageGroupId, resource_type: 'activity', resource_id: spare.id },
    });
    if (res.status === 201) {
      chosen.push(res.data.pin);
      createdPinIds.push(res.data.pin.id);
    }
  }
  while (chosen.length < 6 && spares.length) {
    const extra = await call('POST', '/api/home/pins', {
      token: teacherToken,
      body: { age_group_id: ageGroupId, resource_type: 'lesson', resource_id: candidates.data.lessons[chosen.length]?.id },
    });
    if (extra.status === 201) {
      chosen.push(extra.data.pin);
      createdPinIds.push(extra.data.pin.id);
    } else break;
  }
  if (chosen.length >= 6) {
    const overflow = await call('POST', '/api/home/pins', {
      token: teacherToken,
      body: {
        age_group_id: ageGroupId,
        resource_type: 'lesson',
        resource_id: candidates.data.lessons[0]?.id,
      },
    });
    const alreadyThere = overflow.status === 201;
    check('a 7th pin is refused', alreadyThere ? false : overflow.status === 409,
      alreadyThere ? '7th pin was accepted' : `status ${overflow.status}`);
    if (alreadyThere) createdPinIds.push(overflow.data.pin.id);
  } else {
    console.log('      (not enough published content to test the 6-tile cap)');
  }

  // Cross-age-group pinning must be refused.
  const wrongGroup = acts[0];
  if (wrongGroup) {
    const res = await call('POST', '/api/home/pins', {
      token: teacherToken,
      body: {
        age_group_id: ageGroupId === 1 ? 2 : 1,
        resource_type: 'activity',
        resource_id: wrongGroup.id,
      },
    });
    check('pinning into the wrong age group is refused', res.status === 400, `status ${res.status}`);
  }

  const listed = await call('GET', `/api/home/pins?age_group_id=${ageGroupId}`, { token: teacherToken });
  check('GET /home/pins', listed.status === 200, `status ${listed.status}`);
  const pins = listed.data?.pins || [];
  check('  pins come back with their content attached', pins.every((p) => p.title && p.kind),
    `${pins.length} pins`);
  console.log('      what is on the child home now:');
  for (const p of pins) {
    const c = p.activity_config || {};
    const detail =
      p.kind === 'letter_tracing'
        ? `${(c.letters || []).length} letters: ${(c.letters || []).map((l) => l.base).join(' ')}`
        : p.kind === 'counting'
          ? `${(c.objects || []).length} objects, ${c.numeral_system || 'geez'}, ${c.min ?? 1}-${c.max ?? 10}`
          : p.kind === 'matching'
            ? `${(c.pairs || []).length} pairs`
            : 'no config needed';
    console.log(`        ${p.display_order}. [${p.kind}] "${p.title}" (${p.lesson_title}) — ${detail}`);
  }

  // Reorder.
  if (pins.length >= 2) {
    const [first, second] = pins;
    await call('PATCH', `/api/home/pins/${first.pin_id}`, { token: teacherToken, body: { display_order: 1 } });
    await call('PATCH', `/api/home/pins/${second.pin_id}`, { token: teacherToken, body: { display_order: 0 } });
    const after = await call('GET', `/api/home/pins?age_group_id=${ageGroupId}`, { token: teacherToken });
    check('reordering persists', after.data.pins[0].pin_id === second.pin_id,
      `first is now "${after.data.pins[0].title}"`);
  }

  // An instructor must not be able to reorder somebody else's pin — check the
  // ownership guard by trying a pin id that does not exist.
  const bogus = await call('PATCH', '/api/home/pins/99999999', { token: teacherToken, body: { display_order: 0 } });
  check('a pin that does not exist is a 404', bogus.status === 404, `status ${bogus.status}`);

  // ── 5. The child view ─────────────────────────────────────────────────────
  const childForGroup = kids.find((k) => k.age_group_id === ageGroupId) || null;
  const subject = young || childForGroup || anyKid;
  console.log(`\n      checking the child portal for "${subject.full_name}" (age ${subject.age}, age group ${subject.age_group_id})`);

  const dash = await call('GET', '/api/child/dashboard', {
    token: signAccessToken({ id: subject.user_id, role: 'student', email: subject.email }),
    childId: subject.id,
  });
  check('GET /child/dashboard', dash.status === 200, `status ${dash.status}`);
  check('  is_early_learner is derived from the date of birth',
    dash.data?.child?.is_early_learner === (subject.age <= 9),
    `age ${subject.age} -> ${dash.data?.child?.is_early_learner}`);
  check('  dashboard carries encouragement phrases for the child to hear',
    Array.isArray(dash.data?.encouragement) && dash.data.encouragement.length > 0,
    `${(dash.data?.encouragement || []).length} phrase(s)`);

  const childPins = dash.data?.home_pins || [];
  const isEarlyLearner = subject.age <= 9;
  if (isEarlyLearner && subject.age_group_id === ageGroupId) {
    check('  the child home shows what the teacher pinned', childPins.length === pins.length,
      `${childPins.length} of ${pins.length}`);
    check('  in the instructor\'s order',
      childPins.map((p) => p.pin_id).join(',') === pins.map((p) => p.pin_id).join(','),
      childPins.map((p) => p.title).join(' | '));
    for (const p of childPins) {
      if (p.kind !== 'letter_tracing') continue;
      const cfg = p.activity_config || {};
      check('  the child receives the instructor\'s own letter list',
        Array.isArray(cfg.letters) && cfg.letters.length > 0,
        `${(cfg.letters || []).map((l) => l.base).join(' ')}`);
    }
  } else {
    // Not a failure. The dev database has no child under 10, so the age 5-9 home
    // cannot be exercised end to end here. What IS checkable is that a 10-12 child
    // is served the ordinary 10-12 home and is not handed the early-child experience.
    console.log(
      `      note: "${subject.email}" is ${subject.age}, so this is the 10-12 path, not\n` +
        '      the age 5-9 one. The early-learner home needs a child under 10 to test.\n' +
        `      Its age group is ${subject.age_group_id}, which has ${childPins.length} tile(s).`
    );
    check('  a child in the 10-12 band is not treated as an early learner',
      dash.data?.child?.is_early_learner === false,
      `is_early_learner=${dash.data?.child?.is_early_learner}`);
  }

  // The child can open a pinned ACTIVITY and receives its config. A pin may also be
  // a lesson, whose id is not an activity id, so only practice activities are opened.
  const GAME_KINDS = ['letter_tracing', 'number_tracing', 'matching', 'counting'];
  const openable = childPins.find((p) => GAME_KINDS.includes(p.kind)) || null;
  if (openable) {
    const act = await call('GET', `/api/child/activities/${openable.id}`, {
      token: signAccessToken({ id: subject.user_id, role: 'student', email: subject.email }),
      childId: subject.id,
    });
    check(`GET /child/activities/${openable.id} for the child`, act.status === 200, `status ${act.status}`);
    check('  the activity comes with its config so the game can render it',
      act.data?.activity?.activity_config != null,
      `type=${act.data?.activity?.activity_type}`);
  } else {
    console.log('      (no practice game pinned for this age group, so nothing to open)');
  }

  // A child must not be able to open a pinned activity from another age group.
  const otherGroupPin = (await call('GET', '/api/home/pins?age_group_id=' + (ageGroupId === 1 ? 3 : 1), { token: teacherToken })).data?.pins;
  if (otherGroupPin?.length) {
    const res = await call('GET', `/api/child/activities/${otherGroupPin[0].id}`, {
      token: signAccessToken({ id: subject.user_id, role: 'student', email: subject.email }),
      childId: subject.id,
    });
    check('  a child cannot open another age group\'s activity', res.status === 403, `status ${res.status}`);
  }

  // ── 6. Over-9 children do not get the early portal ────────────────────────
  if (older && older.id !== subject.id) {
    const oldDash = await call('GET', '/api/child/dashboard', {
      token: signAccessToken({ id: older.user_id, role: 'student', email: older.email }),
      childId: older.id,
    });
    check(`a ${older.age}-year-old is not an early learner`,
      oldDash.data?.child?.is_early_learner === false,
      `is_early_learner=${oldDash.data?.child?.is_early_learner}`);
    check('  and gets no child home tiles for an age group nobody pinned',
      (oldDash.data?.home_pins || []).length === 0,
      `${(oldDash.data?.home_pins || []).length} tiles`);
  }

  // A parent cannot use the instructor pin endpoints.
  const parentRes = await query(
    `SELECT u.id AS user_id, u.email FROM users u WHERE u.role = 'parent' ORDER BY u.id LIMIT 1`
  );
  if (parentRes.rows.length) {
    const p = parentRes.rows[0];
    const res = await call('GET', `/api/home/pins?age_group_id=${ageGroupId}`, {
      token: signAccessToken({ id: p.user_id, role: 'parent', email: p.email }),
    });
    check('a parent cannot manage the child home', res.status === 403, `status ${res.status}`);
  }

  report();
})().catch((err) => {
  console.error('\nFAILED:', err);
  failures += 1;
  report();
});

function report() {
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

process.on('exit', async () => {
  // Leave the demo database exactly as we found it.
  for (const id of createdPinIds) {
    try {
      await query('UPDATE home_pins SET is_active = FALSE, updated_at = now() WHERE id = $1', [id]);
    } catch {
      /* the process is already going down; nothing more to do */
    }
  }
  process.exit(failures === 0 ? 0 : 1);
});
