require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration 036: instructor_grade_level_assignments.sql...');

    await client.query('BEGIN');

    // Step 1: Allow courses to exist without an instructor
    await client.query(`
      ALTER TABLE courses ALTER COLUMN instructor_id DROP NOT NULL
    `);
    console.log('✓ Made courses.instructor_id nullable');

    // Step 2: Create instructor_grade_levels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS instructor_grade_levels (
        instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
        grade_level_id INT NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
        assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (instructor_id, grade_level_id)
      )
    `);
    console.log('✓ Created instructor_grade_levels table');

    // Step 3: Migrate existing grade scopes from instructor_assignments
    const result = await client.query(`
      INSERT INTO instructor_grade_levels (instructor_id, grade_level_id)
      SELECT DISTINCT instructor_id, grade_level_id
      FROM instructor_assignments
      WHERE grade_level_id IS NOT NULL
      ON CONFLICT (instructor_id, grade_level_id) DO NOTHING
      RETURNING *
    `);
    console.log(`✓ Migrated ${result.rows.length} existing grade level assignments`);

    await client.query('COMMIT');
    console.log('Migration 036 completed successfully!');

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
