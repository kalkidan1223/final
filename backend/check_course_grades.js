require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkCourseGradeLevels() {
  const client = await pool.connect();
  try {
    console.log('Checking course grade level assignments...\n');

    // Get all courses with their grade levels
    const result = await client.query(`
      SELECT c.id, c.title, c.grade_level_id, gl.name as grade_level_name, gl.code as grade_level_code
      FROM courses c
      LEFT JOIN grade_levels gl ON gl.id = c.grade_level_id
      ORDER BY c.title
    `);

    console.log('Course -> Grade Level Mapping:');
    console.log('='.repeat(80));
    result.rows.forEach(course => {
      console.log(`\n${course.title}`);
      console.log(`  ID: ${course.id}`);
      console.log(`  Grade Level: ${course.grade_level_name || 'NONE'} (${course.grade_level_code || 'N/A'})`);
      console.log(`  Grade Level ID: ${course.grade_level_id || 'NULL'}`);
    });

    // Check specifically for the courses mentioned in the error
    console.log('\n\n');
    console.log('Specific Courses from Error:');
    console.log('='.repeat(80));

    const specificCourses = await client.query(`
      SELECT c.id, c.title, c.grade_level_id, gl.name as grade_level_name, gl.code as grade_level_code
      FROM courses c
      LEFT JOIN grade_levels gl ON gl.id = c.grade_level_id
      WHERE c.title ILIKE '%Maths%'
         OR c.title ILIKE '%Fidel%'
         OR c.title ILIKE '%Animals%'
         OR c.title ILIKE '%Numbers%'
      ORDER BY c.title
    `);

    specificCourses.rows.forEach(course => {
      console.log(`\n${course.title}`);
      console.log(`  Grade Level: ${course.grade_level_name || 'NONE'} (${course.grade_level_code || 'N/A'})`);
      console.log(`  Grade Level ID: ${course.grade_level_id || 'NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCourseGradeLevels();
