require('dotenv').config();
const { pool } = require('../src/config/db');

async function main() {
  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('TABLES IN DB:');
    console.log(res.rows.map(r => r.table_name));

    // Also check if migrations table exists
    const hasMigrations = res.rows.some(r => r.table_name === 'migrations');
    if (hasMigrations) {
      const migs = await pool.query('SELECT * FROM migrations ORDER BY id DESC LIMIT 10;');
      console.log('RECENT MIGRATIONS:', migs.rows);
    }

    // Check fidel_letters table if present
    const hasFidelLetters = res.rows.some(r => r.table_name === 'fidel_letters');
    if (hasFidelLetters) {
      const fl = await pool.query('SELECT COUNT(*) FROM fidel_letters;');
      console.log('FIDEL LETTERS COUNT:', fl.rows[0].count);
      const sample = await pool.query('SELECT * FROM fidel_letters ORDER BY teaching_order ASC LIMIT 5;');
      console.log('FIDEL SAMPLE:', sample.rows);
    }

    // Check courses and subjects
    const courses = await pool.query(`
      SELECT c.id, c.title, c.status, s.name as subject_name, g.name as grade_name
      FROM courses c
      LEFT JOIN subjects s ON s.id = c.subject_id
      LEFT JOIN grade_levels g ON g.id = c.grade_level_id
      ORDER BY c.id;
    `);
    console.log('COURSES COUNT:', courses.rows.length);
    console.log('SAMPLE COURSES:', courses.rows.slice(0, 5));

    // Check instructors
    const instructors = await pool.query(`
      SELECT i.id, u.email, u.full_name, u.role
      FROM instructors i
      JOIN users u ON u.id = i.user_id;
    `);
    console.log('INSTRUCTORS:', instructors.rows);

    // Check students
    const students = await pool.query(`
      SELECT s.id, s.full_name, s.user_id, s.grade_level_id, g.name as grade_name
      FROM students s
      LEFT JOIN grade_levels g ON g.id = s.grade_level_id
      LIMIT 5;
    `);
    console.log('SAMPLE STUDENTS:', students.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error in inspect_db:', err);
    process.exit(1);
  }
}

main();
