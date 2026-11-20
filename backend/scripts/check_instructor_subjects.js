require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function checkInstructorCourses() {
  const res = await query(`
    SELECT DISTINCT s.name as subject_name, s.code as subject_code
    FROM courses c
    JOIN subjects s ON s.id = c.subject_id
    WHERE c.instructor_id = '8'
  `);
  console.log("Subjects for instructor 8:", res.rows);
}

checkInstructorCourses().catch(console.error);
