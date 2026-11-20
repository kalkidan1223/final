require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function cleanTestCourses() {
  // Delete the test courses created earlier (ID 15 & 16)
  await query("DELETE FROM courses WHERE id IN (15, 16)");
  console.log("✓ Deleted test courses 15 and 16.");

  // Check remaining courses for instructor 8
  const res = await query(`
    SELECT c.id, c.title, s.name as subject_name, gl.name as grade_name
    FROM courses c
    LEFT JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grade_levels gl ON gl.id = c.grade_level_id
    WHERE c.instructor_id = '8'
  `);
  console.log("Remaining courses for English teacher (instructor 8):", res.rows);
}

cleanTestCourses().catch(console.error);
