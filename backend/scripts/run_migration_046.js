require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { query } = require('../src/config/db');

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '046_registration_verification_approval_notifications.sql'), 'utf8');
  console.log('Executing migration 046...');
  await query(sql);
  console.log('✓ Migration 046 completed successfully.');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
