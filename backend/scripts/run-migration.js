// Applies a numbered migration file once, printing what it did.
//   node scripts/run-migration.js 024
// Exits 0 if the file has already been applied, so it is safe to re-run.
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const number = process.argv[2];
if (!number) {
  console.error('Usage: node scripts/run-migration.js <number>');
  process.exit(1);
}

const dir = path.join(__dirname, '..', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.startsWith(`${number}_`));
if (files.length === 0) {
  console.error(`No migration starting with "${number}_" in ${dir}`);
  process.exit(1);
}
if (files.length > 1) {
  console.error(`Ambiguous: ${files.join(', ')}`);
  process.exit(1);
}

const file = path.join(dir, files[0]);
const sql = fs.readFileSync(file, 'utf8');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    // Record what has been applied, so a re-run is a no-op rather than an error.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    const already = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [files[0]]
    );
    if (already.rowCount > 0) {
      console.log(`${files[0]} was already applied. Nothing to do.`);
      return;
    }

    console.log(`Applying ${files[0]}...`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [files[0]]);
    await client.query('COMMIT');
    console.log(`${files[0]} applied.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`${files[0]} FAILED: ${err.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
