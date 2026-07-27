const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Idle client errors should never crash the whole process
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Small wrapper so callers don't import `pg` directly and we can log slow
// queries in one place during development.
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`Slow query (${duration}ms): ${text}`);
    }
  }
  return result;
}

module.exports = { pool, query };
