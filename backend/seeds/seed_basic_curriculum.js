/**
 * Basic curriculum seed
 * ====================
 * Creates a minimal sample course structure to demonstrate the system.
 * Instructors should create their own content through the portal.
 *
 * Idempotent: safe to run repeatedly.
 */

const { query } = require('../src/config/db');

async function seed() {
  console.log('Seeding basic sample content...\n');

  // Get the first instructor
  const instructorRes = await query(
    'SELECT id, user_id FROM instructors ORDER BY id ASC LIMIT 1'
  );
  if (instructorRes.rows.length === 0) {
    console.error('No instructor account exists. Create one before seeding.');
    process.exit(1);
  }
  const instructorId = instructorRes.rows[0].id;

  // Create a simple sample course
  const courseRes = await query(
    `INSERT INTO courses (instructor_id, age_group_id, title, description, thumbnail_url, status)
     VALUES ($1, $2, $3, $4, $5, 'published')
     ON CONFLICT (instructor_id, age_group_id, title)
     DO UPDATE SET description = EXCLUDED.description,
                   thumbnail_url = EXCLUDED.thumbnail_url,
                   status = 'published',
                   updated_at = now()
     RETURNING id`,
    [
      instructorId,
      1, // Age group 1
      'Sample Course',
      'A sample course to demonstrate the system. Instructors should create their own content.',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600'
    ]
  );
  const courseId = courseRes.rows[0].id;
  console.log('✓ Sample course created');

  // Assign instructor to the course
  await query(
    `INSERT INTO instructor_assignments
       (instructor_id, course_id, age_group_id, academic_year_id, status, assigned_by)
     SELECT $1, $2, $3, ay.id, 'active', $1
       FROM (SELECT id FROM academic_years ORDER BY id LIMIT 1) ay
      WHERE NOT EXISTS (
        SELECT 1 FROM instructor_assignments ia
         WHERE ia.instructor_id = $1
           AND ia.course_id = $2
           AND ia.age_group_id = $3
      )`,
    [instructorId, courseId, 1]
  );
  
  await query(
    `UPDATE instructor_assignments
        SET status = 'active', updated_at = now()
      WHERE instructor_id = $1 AND course_id = $2 AND age_group_id = $3`,
    [instructorId, courseId, 1]
  );
  console.log('✓ Instructor assigned to course');

  // Create a sample lesson
  const lessonRes = await query(
    `INSERT INTO lessons (course_id, title, description, order_index)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (course_id, order_index)
     DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now()
     RETURNING id`,
    [courseId, 'Sample Lesson', 'Use the instructor portal to add activities and content.', 1]
  );
  console.log('✓ Sample lesson created');

  console.log('\n✓ Basic structure seeded successfully');
  console.log('\nNext steps:');
  console.log('1. Log in as an instructor');
  console.log('2. Navigate to your courses');
  console.log('3. Create lessons and activities using the portal');
  console.log('4. Pin activities to the child home for your age groups');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding error:', err.message);
    process.exit(1);
  });
