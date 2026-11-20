require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function inspectInstructors() {
  const users = await query(`
    SELECT u.id, u.email, u.full_name, u.role, i.id as instructor_id
    FROM users u
    LEFT JOIN instructors i ON i.user_id = u.id
    WHERE u.role = 'instructor'
  `);
  console.log('Instructors in DB:', users.rows);

  const assignments = await query(`
    SELECT ia.*, s.name as subject_name, gl.name as grade_name, u.email as instructor_email
    FROM instructor_assignments ia
    LEFT JOIN subjects s ON s.id = ia.subject_id
    LEFT JOIN grade_levels gl ON gl.id = ia.grade_level_id
    LEFT JOIN instructors i ON i.id = ia.instructor_id
    LEFT JOIN users u ON u.id = i.user_id
  `);
  console.log('Instructor assignments:', assignments.rows);

  const courses = await query(`
    SELECT c.id, c.title, c.instructor_id, u.email as instructor_email, s.name as subject_name, gl.name as grade_name
    FROM courses c
    LEFT JOIN instructors i ON i.id = c.instructor_id
    LEFT JOIN users u ON u.id = i.user_id
    LEFT JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN grade_levels gl ON gl.id = c.grade_level_id
  `);
  console.log('Courses in DB:', courses.rows);

  const lessons = await query(`
    SELECT l.id, l.title, l.course_id, c.title as course_title, c.instructor_id, u.email as instructor_email
    FROM lessons l
    JOIN courses c ON c.id = l.course_id
    LEFT JOIN instructors i ON i.id = c.instructor_id
    LEFT JOIN users u ON u.id = i.user_id
  `);
  console.log('Lessons in DB:', lessons.rows);
}

inspectInstructors().catch(console.error);
