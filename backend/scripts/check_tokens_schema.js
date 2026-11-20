require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function checkTokens() {
  const cols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'email_verification_tokens'");
  console.log('email_verification_tokens columns:', cols.rows);

  const regCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'registration_requests'");
  console.log('registration_requests columns:', regCols.rows.map(x => x.column_name));

  const instRegCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'instructor_registration_requests'");
  console.log('instructor_registration_requests columns:', instRegCols.rows.map(x => x.column_name));
}

checkTokens().catch(console.error);
