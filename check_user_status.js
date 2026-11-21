const path = require('path');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const db = require('./backend/src/config/db');

async function test() {
  try {
    const inst = await db.query("SELECT id, full_name, email, status, email_verified, submitted_at, reviewed_at FROM instructor_registration_requests WHERE email ILIKE '%onelx758%'");
    console.log('INST REQUEST:', inst.rows);
    const parent = await db.query("SELECT id, full_name, email, status, email_verified, submitted_at, reviewed_at FROM registration_requests WHERE email ILIKE '%onelx758%'");
    console.log('PARENT REQUEST:', parent.rows);
    const users = await db.query("SELECT id, full_name, email, role, status, email_verified FROM users WHERE email ILIKE '%onelx758%'");
    console.log('USERS:', users.rows);
    const tokens = await db.query("SELECT * FROM email_verification_tokens WHERE email ILIKE '%onelx758%' ORDER BY id DESC LIMIT 5");
    console.log('TOKENS:', tokens.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
