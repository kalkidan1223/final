require('dotenv').config();
const { query } = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');

const BASE = 'http://127.0.0.1:5000';
async function call(method, path, token, childId) {
  const headers = { Authorization: 'Bearer ' + token };
  if (childId) headers['X-Child-Id'] = String(childId);
  const res = await fetch(BASE + path, { method, headers });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data: data };
}

(async () => {
  // find a fidel lesson
  const lr = await query("SELECT lesson_id FROM lesson_fidel_families LIMIT 1");
  const lessonId = lr.rows[0].lesson_id;
  console.log('lessonId', lessonId);
  const studentRes = await query("SELECT u.id AS user_id, u.email, s.id AS student_id FROM users u JOIN students s ON s.user_id=u.id WHERE u.email='sel12@gmail.com'");
  const st = studentRes.rows[0];
  const token = signAccessToken({ id: st.user_id, role: 'student', email: st.email });
  const res = await call('GET', '/api/student/lessons/' + lessonId + '/fidel-content', token, st.student_id);
  console.log('status', res.status);
  if (res.data && res.data.families) {
    const fam = res.data.families[0];
    console.log('family', fam.base_character);
    if (fam.forms) {
      fam.forms.forEach(f => console.log(f.display_order, f.character, f.audio_url));
    }
  } else {
    console.log(JSON.stringify(res.data));
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });