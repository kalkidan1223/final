require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function assignSubjectsToCourses() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Assigning subjects to courses...\n');

    // Get subject IDs
    const subjects = await client.query('SELECT id, code, name FROM subjects WHERE is_active = TRUE');
    const subjectMap = {};
    subjects.rows.forEach(s => {
      subjectMap[s.code] = s.id;
      subjectMap[s.name.toLowerCase()] = s.id;
    });

    console.log('Available subjects:', Object.keys(subjectMap).join(', '));

    // Assign subjects based on course titles
    const assignments = [
      { title: 'Maths', subject_id: subjectMap['MATH'] },
      { title: 'የአማርኛ ፊደላት ለህፃናት', subject_id: subjectMap['AMH'] },
      { title: 'የኢትዮጵያ ቁጥሮችና ሂሳብ', subject_id: subjectMap['MATH'] },
      { title: 'የኢትዮጵያ እንስሳት', subject_id: subjectMap['SCI'] },
      { title: 'የጥሩ ምግብና ዕቅር', subject_id: subjectMap['SCI'] },
    ];

    for (const assignment of assignments) {
      if (!assignment.subject_id) {
        console.log(`⚠ Skipping "${assignment.title}" - subject not found`);
        continue;
      }

      const result = await client.query(
        'UPDATE courses SET subject_id = $1 WHERE title ILIKE $2 RETURNING title, subject_id',
        [assignment.subject_id, `%${assignment.title}%`]
      );

      if (result.rows.length > 0) {
        console.log(`✓ Assigned subject to: ${result.rows[0].title}`);
      }
    }

    await client.query('COMMIT');
    console.log('\nSubject assignment complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

assignSubjectsToCourses();
