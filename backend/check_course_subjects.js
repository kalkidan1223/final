require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkCourseSubjects() {
  const client = await pool.connect();
  try {
    console.log('Checking course subject assignments...\n');

    // Get all courses with their subjects
    const result = await client.query(`
      SELECT c.id, c.title, c.subject_id, s.name as subject_name, s.code as subject_code, c.grade_level_id
      FROM courses c
      LEFT JOIN subjects s ON s.id = c.subject_id
      ORDER BY c.title
    `);

    console.log('Course -> Subject Mapping:');
    console.log('='.repeat(80));
    result.rows.forEach(course => {
      console.log(`\n${course.title}`);
      console.log(`  ID: ${course.id}`);
      console.log(`  Subject: ${course.subject_name || 'NONE'} (${course.subject_code || 'N/A'})`);
      console.log(`  Subject ID: ${course.subject_id || 'NULL'}`);
      console.log(`  Grade Level ID: ${course.grade_level_id}`);
    });

    // Check what subjects exist
    console.log('\n\n');
    console.log('Available Subjects:');
    console.log('='.repeat(80));
    const subjects = await client.query('SELECT * FROM subjects ORDER BY code');
    subjects.rows.forEach(sub => {
      console.log(`\n${sub.name} (${sub.code})`);
      console.log(`  ID: ${sub.id}`);
      console.log(`  Language: ${sub.language}`);
      console.log(`  Active: ${sub.is_active}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCourseSubjects();
