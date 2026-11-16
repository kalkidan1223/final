require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function check() {
  const attempts = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'quiz_attempts'");
  console.log('quiz_attempts columns:', attempts.rows.map(x => x.column_name));

  const results = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'quiz_results'");
  console.log('quiz_results columns:', results.rows.map(x => x.column_name));
}

check().catch(console.error);

