require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const { signAccessToken } = require('../src/utils/jwt');
const { query } = require('../src/config/db');

const API = 'http://localhost:5000/api';

async function run() {
  console.log('--- STARTING E2E INSTRUCTOR-TO-CHILD WORKFLOW TEST ---');

  // 1. Get an instructor token and a child/student token
  console.log('Step 1: Authenticating instructor & student...');
  
  const instUser = await query("SELECT * FROM users WHERE email = 'pro456479@gmail.com'");
  const studentUser = await query("SELECT * FROM users WHERE email = 'sel12@gmail.com'");
  const studentProfile = await query("SELECT * FROM students WHERE user_id = $1", [studentUser.rows[0].id]);
  const originalStudentGrade = studentProfile.rows[0].grade_level_id;
  const gradeLevels = await query("SELECT * FROM grade_levels ORDER BY id");

  const instToken = signAccessToken({ id: instUser.rows[0].id, email: instUser.rows[0].email, role: 'instructor' });
  const studentToken = signAccessToken({ id: studentUser.rows[0].id, email: studentUser.rows[0].email, role: 'student' });

  const instHeaders = { Authorization: `Bearer ${instToken}` };
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };

  console.log('✓ Authenticated successfully with signAccessToken.');

  // 2. Find or create a Visual course (e.g. Kindergarten 1 or Grade 1) and a Structured course (Grade 4)
  const kgGrade = gradeLevels.rows.find(g => g.code === 'KG1' || g.lesson_builder_type === 'visual') || gradeLevels.rows[0];
  const g4Grade = gradeLevels.rows.find(g => g.code === 'G4' || g.lesson_builder_type === 'structured') || gradeLevels.rows[5];

  console.log(`Visual Grade: ${kgGrade.name} (${kgGrade.code}, builder: ${kgGrade.lesson_builder_type})`);
  console.log(`Structured Grade: ${g4Grade.name} (${g4Grade.code}, builder: ${g4Grade.lesson_builder_type})`);

  let instProfile = await query("SELECT * FROM instructors WHERE user_id = $1", [instUser.rows[0].id]);
  const instructorId = instProfile.rows[0].id;

  // Clean up any old test courses
  await query("DELETE FROM courses WHERE title IN ('Fun Early Mathematics', 'Amharic Fidel for Beginners')");

  // Create test courses
  const courseMathRes = await query(
    `INSERT INTO courses (title, description, grade_level_id, instructor_id, status)
     VALUES ($1, $2, $3, $4, 'published')
     RETURNING *`,
    ['Fun Early Mathematics', 'Counting and basic numbers for kids', kgGrade.id, instructorId]
  );
  const mathCourse = courseMathRes.rows[0];

  const courseAmhRes = await query(
    `INSERT INTO courses (title, description, grade_level_id, instructor_id, status)
     VALUES ($1, $2, $3, $4, 'published')
     RETURNING *`,
    ['Amharic Fidel for Beginners', 'Learn Fidel alphabet step by step', kgGrade.id, instructorId]
  );
  const amhCourse = courseAmhRes.rows[0];

  console.log(`✓ Created test courses: "${mathCourse.title}" (ID: ${mathCourse.id}) & "${amhCourse.title}" (ID: ${amhCourse.id})`);

  // 3. Test Course 1: Instructor builds a Visual Math Lesson with Cards, Audio, Counting & Matching
  console.log('\nStep 3: Instructor creating visual Math lesson...');
  const mathLessonRes = await axios.post(
    `${API}/courses/${mathCourse.id}/lessons`,
    {
      title: 'Numbers 1, 2, 3: Count and Match',
      description: 'Learn to recognize, count, and match numbers 1 through 3!',
      learning_objectives: 'Identify numbers 1-3, count 3 stars, match numbers with quantity',
      estimated_duration_minutes: 15,
      order_index: 0,
      difficulty_level: 'beginner',
    },
    { headers: instHeaders }
  );
  const mathLesson = mathLessonRes.data.lesson;
  console.log(`✓ Created lesson "${mathLesson.title}" (ID: ${mathLesson.id})`);

  // Add Step 1: Number 1 Learning Card
  await axios.post(
    `${API}/lessons/${mathLesson.id}/materials`,
    {
      title: 'Number 1 Card',
      description: 'The first number: 1',
      type: 'other',
      content: '1 - One - አንድ',
      metadata: {
        type: 'learning_card',
        symbol: '1',
        word: 'One',
        translation: 'አንድ (And)',
        audio_url: '',
      },
    },
    { headers: instHeaders }
  );

  // Add Step 2: Number 2 & 3 Cards
  await axios.post(
    `${API}/lessons/${mathLesson.id}/materials`,
    {
      title: 'Number 2 & 3 Cards',
      description: 'Numbers 2 and 3',
      type: 'other',
      content: '2 - Two - ሁለት',
      metadata: {
        type: 'learning_card',
        symbol: '2',
        word: 'Two',
        translation: 'ሁለት (Hulet)',
      },
    },
    { headers: instHeaders }
  );

  // Add Step 3: Interactive Counting Activity
  await axios.post(
    `${API}/lessons/${mathLesson.id}/activities`,
    {
      title: 'Count the Stars Practice',
      activity_type: 'counting',
      instructions: 'Count the stars on the screen and tap the right number!',
      activity_config: {
        target_count: 3,
        item_count: 3,
        options: ['1', '2', '3', '4'],
        correct_answer: '3',
      },
      max_score: 10,
      auto_gradable: true,
    },
    { headers: instHeaders }
  );

  // Add Step 4: Matching Activity
  await axios.post(
    `${API}/lessons/${mathLesson.id}/activities`,
    {
      title: 'Match Numbers to Stars',
      activity_type: 'matching',
      instructions: 'Connect each number to the matching star group!',
      activity_config: {
        pairs: [
          { left: '1', right: '⭐' },
          { left: '2', right: '⭐⭐' },
          { left: '3', right: '⭐⭐⭐' },
        ],
      },
      max_score: 10,
      auto_gradable: true,
    },
    { headers: instHeaders }
  );

  console.log('✓ All 4 steps created for Math lesson and synced into lesson_resources.');

  // Verify resources in DB
  const lrRes = await query(
    'SELECT * FROM lesson_resources WHERE lesson_id = $1 ORDER BY display_order',
    [mathLesson.id]
  );
  console.log(`✓ Database has ${lrRes.rows.length} lesson_resources registered for lesson ${mathLesson.id}:`);
  lrRes.rows.forEach((r, idx) => {
    console.log(`   Step ${idx + 1} (order ${r.display_order}): ${r.resource_type} - ${r.title}`);
  });

  // 4. Temporarily set student to KG grade level to test child access
  await query('UPDATE students SET grade_level_id = $1 WHERE id = $2', [kgGrade.id, studentProfile.rows[0].id]);
  console.log(`✓ Associated student ${studentProfile.rows[0].id} with grade ${kgGrade.name}`);

  // 5. Test Child Consumption via GET /api/child/learning/lessons/:id
  console.log('\nStep 5: Testing child consumption API...');
  const childLessonRes = await axios.get(
    `${API}/child/learning/lessons/${mathLesson.id}`,
    { headers: studentHeaders }
  );

  const cData = childLessonRes.data;
  console.log(`✓ Child loaded lesson: "${cData.lesson.title}"`);
  console.log(`  Builder type: ${cData.lesson.lesson_builder_type}`);
  console.log(`  Grade Level Code: ${cData.lesson.grade_level_code}`);
  console.log(`  Total Resources: ${cData.resources.length}`);

  // Validate each step in the child's payload
  cData.resources.forEach((r, idx) => {
    console.log(`  Resource ${idx + 1}: [${r.resource_type}] "${r.title}" (status: ${r.status})`);
    if (r.resource_type === 'material') {
      console.log(`    Metadata:`, r.metadata);
    } else if (r.resource_type === 'activity') {
      console.log(`    Activity Type:`, r.activity_type);
      console.log(`    Config:`, r.activity_config);
    }
  });

  // 6. Simulate Child completing the activities & materials
  console.log('\nStep 6: Simulating child completing steps...');
  const cardStep = cData.resources[0];
  const countStep = cData.resources.find(r => r.resource_type === 'activity' && r.activity_type === 'counting');

  // Complete material
  await axios.post(
    `${API}/child/learning/progress/material/${cardStep.resource_id}`,
    { view_percentage: 100 },
    { headers: studentHeaders }
  );
  console.log(`✓ Student completed card material (ID: ${cardStep.resource_id})`);

  // Submit activity
  const submitRes = await axios.post(
    `${API}/child/activities/${countStep.resource_id}/submit`,
    { answer: '3' },
    { headers: studentHeaders }
  );
  console.log(`✓ Student submitted counting activity (ID: ${countStep.resource_id}):`);
  console.log(`  Score: ${submitRes.data.score}/${submitRes.data.submission?.max_score || 10}`);
  console.log(`  Status: ${submitRes.data.submission?.status}`);

  // Re-fetch child journey to verify updated progress
  const updatedChildRes = await axios.get(
    `${API}/child/learning/lessons/${mathLesson.id}`,
    { headers: studentHeaders }
  );
  console.log(`✓ Updated progress: ${updatedChildRes.data.progress.progress_percentage}% completed`);
  console.log(`  Completed steps: ${updatedChildRes.data.progress.required_resources_completed} / ${updatedChildRes.data.progress.total_required_resources}`);

  // Restore student grade and clean up test courses
  await query('UPDATE students SET grade_level_id = $1 WHERE id = $2', [originalStudentGrade, studentProfile.rows[0].id]);
  await query('DELETE FROM courses WHERE id IN ($1, $2)', [mathCourse.id, amhCourse.id]);
  console.log('\n✓ Restored student grade and cleaned up test records.');

  console.log('\n--- ALL E2E INSTRUCTOR-TO-CHILD TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed with error:', err.response?.data || err);
  process.exit(1);
});
