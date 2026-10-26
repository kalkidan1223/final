require('dotenv').config();
const { pool } = require('../src/config/db');

async function main() {
  await pool.query('ALTER TABLE activities ALTER COLUMN grade_level_id_old DROP NOT NULL;');
  console.log('grade_level_id_old is now nullable');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
