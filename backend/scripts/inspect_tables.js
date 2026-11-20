require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function inspectTables() {
  const iaCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'instructor_assignments'");
  console.log('instructor_assignments cols:', iaCols.rows.map(x => x.column_name));

  const coursesCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'courses'");
  console.log('courses cols:', coursesCols.rows.map(x => x.column_name));

  const iaRows = await query("SELECT * FROM instructor_assignments");
  console.log('instructor_assignments data:', iaRows.rows);

  const courses = await query("SELECT id, title, instructor_id, grade_level_id, subject_id, status FROM courses");
  console.log('courses data:', courses.rows);

  const lessons = await query("SELECT id, title, course_id, status FROM lessons");
  console.log('lessons data:', lessons.rows);
}

inspectTables().catch(console.error);
