require('dotenv').config();
const { query } = require('../src/config/db');

async function checkEmptyActivities() {
  try {
    console.log('🔍 Checking for activities with empty or invalid configurations...\n');
    
    const result = await query(`
      SELECT 
        a.id,
        a.title,
        a.activity_type,
        a.status,
        l.title as lesson_title,
        c.title as course_title,
        a.activity_config,
        CASE 
          WHEN a.activity_config IS NULL THEN 'No config'
          WHEN jsonb_typeof(a.activity_config) = 'null' THEN 'Null config'
          WHEN a.activity_config = '{}'::jsonb THEN 'Empty config'
          ELSE 'Has config'
        END as config_status
      FROM activities a
      JOIN lessons l ON l.id = a.lesson_id
      JOIN courses c ON c.id = l.course_id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC;
    `);
    
    const emptyActivities = result.rows.filter(row => row.config_status !== 'Has config');
    const activitiesWithConfig = result.rows.filter(row => row.config_status === 'Has config');
    
    console.log(`📊 Summary:`);
    console.log(`   Total active activities: ${result.rows.length}`);
    console.log(`   ✅ With configuration: ${activitiesWithConfig.length}`);
    console.log(`   ⚠️  Without configuration: ${emptyActivities.length}\n`);
    
    // Show all activities and their configs for debugging
    if (activitiesWithConfig.length > 0) {
      console.log('📋 Activities with configuration:\n');
      activitiesWithConfig.forEach(activity => {
        console.log(`   📝 ID: ${activity.id} - ${activity.title} (${activity.activity_type})`);
        console.log(`      Config:`, JSON.stringify(activity.activity_config, null, 2));
        console.log('');
      });
    }
    
    if (emptyActivities.length > 0) {
      console.log('⚠️  Activities needing configuration:\n');
      emptyActivities.forEach(activity => {
        console.log(`   📝 ID: ${activity.id}`);
        console.log(`      Title: ${activity.title}`);
        console.log(`      Type: ${activity.activity_type}`);
        console.log(`      Course: ${activity.course_title}`);
        console.log(`      Lesson: ${activity.lesson_title}`);
        console.log(`      Status: ${activity.config_status}`);
        console.log('');
      });
      
      console.log('💡 Instructors should edit these activities and add the required configuration.');
    } else {
      console.log('✅ All active activities have proper configuration!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkEmptyActivities();
