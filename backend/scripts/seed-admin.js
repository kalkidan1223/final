require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/db');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@brana.edu').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234';
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Administrator';

async function seedAdmin() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
    if (existing.rows.length > 0) {
      console.log(`Admin already exists: ${ADMIN_EMAIL}`);
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, is_active)
       VALUES ($1, $2, 'admin', $3, TRUE)
       RETURNING id, email, full_name, role`,
      [ADMIN_EMAIL, passwordHash, ADMIN_NAME]
    );
    const user = userResult.rows[0];

    await client.query('INSERT INTO admins (user_id) VALUES ($1)', [user.id]);
    await client.query('COMMIT');

    console.log('Default admin account created:');
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log('Change the password after first login.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err.message);
  process.exit(1);
});
