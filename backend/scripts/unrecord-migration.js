// Re-runs a migration that was already applied, after un-recording it. For
// editing a migration in place during development.
require('dotenv/config');
const { query } = require('../src/config/db');

const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node scripts/unrecord-migration.js <filename>');
  process.exit(1);
}

(async () => {
  const r = await query('DELETE FROM schema_migrations WHERE filename = $1 RETURNING filename', [
    filename,
  ]);
  console.log(
    r.rowCount > 0
      ? `Un-recorded ${filename}. Run: node scripts/run-migration.js ${filename.split('_')[0]}`
      : `${filename} was not recorded, nothing to do.`
  );
  process.exit(0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
