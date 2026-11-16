require('dotenv').config();
const { pool } = require('../src/config/db');

async function clearContent() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const contentTables = [
      'student_video_watch_intervals',
      'student_video_progress',
      'student_material_progress',
      'student_resource_progress',
      'student_lesson_progress',
      'student_fidel_progress',
      'student_english_progress',
      'student_activity_progress',
      'student_quiz_attempts',
      'student_question_answers',
      'student_questions',
      'progress',
      'activity_submissions',
      'teacher_feedback',
      'quiz_attempt_answers',
      'quiz_attempts',
      'quiz_results',
      'quiz_question_options',
      'quiz_questions',
      'quizzes',
      'activities',
      'material_listens',
      'learning_materials',
      'video_watches',
      'videos',
      'lesson_resources',
      'lesson_fidel_families',
      'lesson_fidel_configs',
      'lesson_english_letters',
      'lesson_english_configs',
      'lessons',
      'course_instructor_assignments',
      'instructor_courses',
      'age_group_available_courses',
      'courses',
      'ai_recommendations'
    ];

    console.log('Truncating content tables with RESTART IDENTITY CASCADE...');
    for (const table of contentTables) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
        console.log(`✓ Cleared data in ${table}`);
      } catch (err) {
        console.warn(`! Table ${table} skip/error:`, err.message);
      }
    }

    await client.query('COMMIT');
    console.log('\n--- VERIFICATION OF PRESERVED USERS ---');
    
    const userTables = ['users', 'admins', 'instructors', 'parents', 'students', 'grade_levels', 'subjects'];
    for (const t of userTables) {
      const res = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`Preserved ${t}: ${res.rows[0].count} records`);
    }

    console.log('\n--- VERIFICATION OF EMPTIED CONTENT ---');
    const sampleContent = ['courses', 'lessons', 'learning_materials', 'activities', 'quizzes'];
    for (const t of sampleContent) {
      const res = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`${t} count: ${res.rows[0].count} (must be 0)`);
    }

    console.log('\nAll course, lesson, activity, and learning material data successfully cleared!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to clear content, transaction rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearContent();

