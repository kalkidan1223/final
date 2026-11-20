require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function checkLessons() {
  const res = await query(`
    SELECT l.id, l.title, l.course_id, c.title as course_title, s.name as subject_name
    FROM lessons l
    JOIN courses c ON c.id = l.course_id
    LEFT JOIN subjects s ON s.id = c.subject_id
    WHERE c.instructor_id = '8'
  `);
  console.log("Lessons for instructor 8:", res.rows);
}

checkLessons().catch(console.error);
