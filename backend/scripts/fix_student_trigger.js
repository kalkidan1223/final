require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function fixTrigger() {
  await query("DROP TRIGGER IF EXISTS trg_student_account_rule ON students;");
  await query("DROP FUNCTION IF EXISTS enforce_student_account_rule() CASCADE;");
  console.log('✓ Dropped trg_student_account_rule on students successfully.');
}

fixTrigger().catch(console.error);
