require('dotenv').config();
const { pool } = require('../src/config/db');

async function main() {
  const cols = await pool.query(
    "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'activities' ORDER BY ordinal_position;"
  );
  console.log('ACTIVITIES COLUMNS:');
  console.log(cols.rows);

  // Check lesson_fidel_families join
  const sampleLesson = await pool.query('SELECT id, course_id, title FROM lessons ORDER BY id DESC LIMIT 1;');
  console.log('LATEST LESSON:', sampleLesson.rows[0]);

  const lff = await pool.query('SELECT * FROM lesson_fidel_families WHERE lesson_id = $1;', [sampleLesson.rows[0].id]);
  console.log('LFF ROWS:', lff.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
