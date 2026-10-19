/**
 * Sync existing learning_materials to lesson_resources
 * ====================================================
 * This script creates lesson_resources entries for all existing materials
 * so that students can see them in their learning journey.
 */

const { query } = require('../src/config/db');

async function syncMaterials() {
  console.log('Syncing existing materials to lesson_resources...\n');

  try {
    // Get all learning materials
    const materialsRes = await query(
      `SELECT id, lesson_id, title, description, display_order
       FROM learning_materials
       ORDER BY lesson_id, display_order`
    );

    console.log(`Found ${materialsRes.rows.length} materials to sync`);

    let synced = 0;
    let skipped = 0;

    for (const material of materialsRes.rows) {
      // Check if already exists in lesson_resources
      const existsRes = await query(
        'SELECT 1 FROM lesson_resources WHERE lesson_id = $1 AND resource_type = $2 AND resource_id = $3',
        [material.lesson_id, 'material', material.id]
      );

      if (existsRes.rows.length > 0) {
        skipped++;
        continue;
      }

      // Get next display_order for this lesson
      const orderRes = await query(
        'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM lesson_resources WHERE lesson_id = $1',
        [material.lesson_id]
      );

      // Insert into lesson_resources
      await query(
        `INSERT INTO lesson_resources (lesson_id, resource_type, resource_id, display_order, is_required, title, description)
         VALUES ($1, 'material', $2, $3, true, $4, $5)`,
        [
          material.lesson_id,
          material.id,
          orderRes.rows[0].next_order,
          material.title,
          material.description
        ]
      );

      synced++;
      if (synced % 10 === 0) {
        console.log(`  Synced ${synced} materials...`);
      }
    }

    console.log(`\n✓ Sync complete!`);
    console.log(`  - Synced: ${synced} materials`);
    console.log(`  - Skipped (already exist): ${skipped}`);
    console.log(`\nStudents can now see these materials in their lessons!`);

  } catch (err) {
    console.error('Error syncing materials:', err.message);
    process.exit(1);
  }
}

syncMaterials()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script error:', err);
    process.exit(1);
  });
