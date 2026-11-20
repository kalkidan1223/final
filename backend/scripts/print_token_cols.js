require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function printCols() {
  const cols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'email_verification_tokens'");
  console.log(cols.rows);
}

printCols().catch(console.error);
