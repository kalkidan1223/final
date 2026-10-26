require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration 038: subject_grade_assignments.sql...');

    await client.query('BEGIN');

    // Create subject_grade_assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subject_grade_assignments (
        id SERIAL PRIMARY KEY,
        subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        grade_level_id INT NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
        assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE (subject_id, grade_level_id)
      )
    `);
    console.log('✓ Created subject_grade_assignments table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subject_grade_subject ON subject_grade_assignments(subject_id)
    `);
    console.log('✓ Created index on subject_id');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subject_grade_grade ON subject_grade_assignments(grade_level_id)
    `);
    console.log('✓ Created index on grade_level_id');

    await client.query('COMMIT');
    console.log('Migration 038 completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
