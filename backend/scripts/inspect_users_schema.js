require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../src/config/db');

async function inspect() {
  const usersCols = await query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'users'");
  console.log('users columns:', usersCols.rows);

  const sampleUsers = await query("SELECT id, email, full_name, role, status, is_active, email_verified FROM users LIMIT 5");
  console.log('sample users:', sampleUsers.rows);
}

inspect().catch(console.error);
