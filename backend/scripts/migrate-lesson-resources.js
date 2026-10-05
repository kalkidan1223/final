/**
 * Migrate Existing Lesson Content to lesson_resources Table
 * 
 * This script populates the lesson_resources table with existing videos,
 * materials, activities, and quizzes so they appear in the new learning journey.
 * 
 * Run with: node scripts/migrate-lesson-resources.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateLessonResources() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting lesson resources migration...\n');
    
    await client.query('BEGIN');
    
    // Get all lessons
    const lessonsResult = await client.query('SELECT id, title FROM lessons ORDER BY id');
    const lessons = lessonsResult.rows;
    
    console.log(`📚 Found ${lessons.length} lessons to process\n`);
    
    let totalResources = 0;
    
    for (const lesson of lessons) {
      console.log(`Processing Lesson ${lesson.id}: ${lesson.title}`);
      let displayOrder = 0;
      let lessonResourceCount = 0;
      
      // Check if lesson already has resources
      const existingCheck = await client.query(
        'SELECT COUNT(*) as count FROM lesson_resources WHERE lesson_id = $1',
        [lesson.id]
      );
      
      if (parseInt(existingCheck.rows[0].count) > 0) {
        console.log(`  ⏭️  Already has ${existingCheck.rows[0].count} resources, skipping\n`);
        continue;
      }
      
      // 1. Add Videos
      const videosResult = await client.query(
        'SELECT id, title FROM videos WHERE lesson_id = $1 ORDER BY created_at',
        [lesson.id]
      );
      
      for (const video of videosResult.rows) {
        await client.query(
          `INSERT INTO lesson_resources 
           (lesson_id, resource_type, resource_id, display_order, is_required, title, description) 
           VALUES ($1, 'video', $2, $3, true, $4, 'Watch this video to learn')
           ON CONFLICT (lesson_id, resource_type, resource_id) DO NOTHING`,
          [lesson.id, video.id, displayOrder++, video.title]
        );
        lessonResourceCount++;
        console.log(`  ✓ Added video: ${video.title}`);
      }
      
      // 2. Add Materials
      const materialsResult = await client.query(
        'SELECT id, title FROM learning_materials WHERE lesson_id = $1 ORDER BY created_at',
        [lesson.id]
      );
      
      for (const material of materialsResult.rows) {
        await client.query(
          `INSERT INTO lesson_resources 
           (lesson_id, resource_type, resource_id, display_order, is_required, title, description) 
           VALUES ($1, 'material', $2, $3, true, $4, 'Read and learn from this material')
           ON CONFLICT (lesson_id, resource_type, resource_id) DO NOTHING`,
          [lesson.id, material.id, displayOrder++, material.title]
        );
        lessonResourceCount++;
        console.log(`  ✓ Added material: ${material.title}`);
      }
      
      // 3. Add Activities
      const activitiesResult = await client.query(
        'SELECT id, title FROM activities WHERE lesson_id = $1 ORDER BY created_at',
        [lesson.id]
      );
      
      for (const activity of activitiesResult.rows) {
        await client.query(
          `INSERT INTO lesson_resources 
           (lesson_id, resource_type, resource_id, display_order, is_required, title, description) 
           VALUES ($1, 'activity', $2, $3, true, $4, 'Complete this activity to practice')
           ON CONFLICT (lesson_id, resource_type, resource_id) DO NOTHING`,
          [lesson.id, activity.id, displayOrder++, activity.title]
        );
        lessonResourceCount++;
        console.log(`  ✓ Added activity: ${activity.title}`);
      }
      
      // 4. Add Quizzes
      const quizzesResult = await client.query(
        'SELECT id, title FROM quizzes WHERE lesson_id = $1 ORDER BY created_at',
        [lesson.id]
      );
      
      for (const quiz of quizzesResult.rows) {
        await client.query(
          `INSERT INTO lesson_resources 
           (lesson_id, resource_type, resource_id, display_order, is_required, title, description) 
           VALUES ($1, 'quiz', $2, $3, true, $4, 'Test your knowledge with this quiz')
           ON CONFLICT (lesson_id, resource_type, resource_id) DO NOTHING`,
          [lesson.id, quiz.id, displayOrder++, quiz.title]
        );
        lessonResourceCount++;
        console.log(`  ✓ Added quiz: ${quiz.title}`);
      }
      
      if (lessonResourceCount > 0) {
        console.log(`  📦 Total: ${lessonResourceCount} resources added\n`);
        totalResources += lessonResourceCount;
      } else {
        console.log(`  ℹ️  No resources found for this lesson\n`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log(`📊 Total resources migrated: ${totalResources}\n`);
    
    // Show summary
    const summaryResult = await client.query(`
      SELECT 
        resource_type,
        COUNT(*) as count
      FROM lesson_resources
      GROUP BY resource_type
      ORDER BY resource_type
    `);
    
    console.log('📈 Summary by resource type:');
    summaryResult.rows.forEach(row => {
      console.log(`   ${row.resource_type}: ${row.count}`);
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateLessonResources()
  .then(() => {
    console.log('\n✨ All done! Your existing lessons now have learning journeys.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
