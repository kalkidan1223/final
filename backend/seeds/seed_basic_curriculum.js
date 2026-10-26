/**
 * Creates one small grade-linked sample course structure for development.
 * This seed is idempotent and requires a configured grade level and instructor.
 */

const { query } = require('../src/config/db');

async function seed() {
  const instructorResult = await query('SELECT id, user_id FROM instructors ORDER BY id LIMIT 1');
  const gradeResult = await query(
    "SELECT id FROM grade_levels WHERE code = 'KG1' AND is_active = TRUE LIMIT 1"
  );
  if (!instructorResult.rows.length || !gradeResult.rows.length) {
    throw new Error('Create an instructor and an active KG1 grade level before seeding.');
  }

  const instructorId = instructorResult.rows[0].id;
  const assignedBy = instructorResult.rows[0].user_id;
  const gradeLevelId = gradeResult.rows[0].id;
  const existingCourse = await query(
    'SELECT id FROM courses WHERE instructor_id = $1 AND grade_level_id = $2 AND title = $3 LIMIT 1',
    [instructorId, gradeLevelId, 'Sample Course']
  );
  const courseResult = existingCourse.rows[0]
    ? existingCourse
    : await query(
      `INSERT INTO courses (instructor_id, grade_level_id, title, description, thumbnail_url, status)
       VALUES ($1, $2, 'Sample Course', $3, $4, 'published') RETURNING id`,
      [instructorId, gradeLevelId,
        'A sample course to demonstrate the system. Instructors should create their own content.',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600']
    );
  const courseId = courseResult.rows[0].id;

  await query(
    `INSERT INTO instructor_assignments (instructor_id, course_id, grade_level_id, status, assigned_by)
     SELECT $1, $2, $3, 'active', $4
     WHERE NOT EXISTS (
       SELECT 1 FROM instructor_assignments WHERE instructor_id = $1 AND course_id = $2
     )`,
    [instructorId, courseId, gradeLevelId, assignedBy]
  );

  await query(
    `INSERT INTO lessons (course_id, title, description, order_index)
     SELECT $1, 'Sample Lesson', 'Use the instructor portal to add activities and content.', 1
     WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE course_id = $1 AND order_index = 1)`,
    [courseId]
  );

  console.log('Grade-based sample course and lesson are ready.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding error:', err.message);
    process.exit(1);
  });
