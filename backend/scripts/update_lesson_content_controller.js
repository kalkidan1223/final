const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'lessonContentController.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add import of ensureLessonResources
if (!code.includes('ensureLessonResources')) {
  code = code.replace(
    "const { isValidVideoUrl } = require('../utils/videoValidation');",
    "const { isValidVideoUrl } = require('../utils/videoValidation');\nconst { ensureLessonResources } = require('../utils/learningAccess');"
  );
}

// 2. Update getLessonDetail
const targetSearch = `    const [materials, videos, quizzes, activities, statsRes] = await Promise.all([`;
const newBlock = `    await ensureLessonResources(id);

    const [materials, videos, quizzes, activities, statsRes, resourcesRes] = await Promise.all([
      query('SELECT * FROM learning_materials WHERE lesson_id = $1 ORDER BY display_order, created_at', [id]),
      query('SELECT * FROM videos WHERE lesson_id = $1 ORDER BY created_at', [id]),
      query(
        'SELECT id, title, description, instructions, time_limit_seconds, passing_score, max_score, status, attempt_limit, shuffle_questions, show_result_immediately FROM quizzes WHERE lesson_id = $1 ORDER BY created_at',
        [id]
      ),
      query('SELECT * FROM activities WHERE lesson_id = $1 ORDER BY display_order, created_at', [id]),
      query(
        \`SELECT
           (SELECT COUNT(*) FROM progress WHERE lesson_id = $1 AND status = 'completed')::int AS completed_students,
           (SELECT COUNT(*) FROM students WHERE grade_level_id = $2 AND is_active = TRUE)::int AS total_students\`,
        [id, lessonResult.rows[0].grade_level_id]
      ),
      query(
        \`SELECT lr.*,
                CASE 
                  WHEN lr.resource_type = 'video' THEN v.title
                  WHEN lr.resource_type = 'material' THEN m.title
                  WHEN lr.resource_type = 'activity' THEN a.title
                  WHEN lr.resource_type = 'quiz' THEN q.title
                END as resource_title,
                CASE 
                  WHEN lr.resource_type = 'video' THEN v.video_url
                  WHEN lr.resource_type = 'material' THEN m.file_url
                  WHEN lr.resource_type = 'activity' THEN a.activity_type
                  WHEN lr.resource_type = 'quiz' THEN NULL
                END as resource_detail,
                CASE
                  WHEN lr.resource_type = 'material' THEN m.type
                  ELSE NULL
                END as material_type,
                CASE
                  WHEN lr.resource_type = 'material' THEN m.content
                  ELSE NULL
                END as text_content,
                CASE
                  WHEN lr.resource_type = 'material' THEN m.metadata
                  ELSE NULL
                END as metadata,
                CASE
                  WHEN lr.resource_type = 'activity' THEN a.instructions
                  ELSE NULL
                END as instructions,
                CASE
                  WHEN lr.resource_type = 'activity' THEN a.activity_config
                  ELSE NULL
                END as activity_config
         FROM lesson_resources lr
         LEFT JOIN videos v ON lr.resource_type = 'video' AND lr.resource_id = v.id
         LEFT JOIN learning_materials m ON lr.resource_type = 'material' AND lr.resource_id = m.id
         LEFT JOIN activities a ON lr.resource_type = 'activity' AND lr.resource_id = a.id
         LEFT JOIN quizzes q ON lr.resource_type = 'quiz' AND lr.resource_id = q.id
         WHERE lr.lesson_id = $1
         ORDER BY lr.display_order, lr.created_at\`,
        [id]
      ),
    ]);`;

if (code.includes(targetSearch)) {
  code = code.replace(
    /const \[materials, videos, quizzes, activities, statsRes\] = await Promise\.all\(\[[^\]]*\]\);/s,
    newBlock
  );
}

// 3. Add resources to res.json in getLessonDetail
const jsonTarget = `    res.json({
      lesson: lessonResult.rows[0],
      materials: materials.rows,
      videos: videos.rows,
      quizzes: quizzes.rows,
      activities: activities.rows,`;

const jsonReplacement = `    res.json({
      lesson: lessonResult.rows[0],
      materials: materials.rows,
      videos: videos.rows,
      quizzes: quizzes.rows,
      activities: activities.rows,
      resources: resourcesRes.rows,`;

if (code.includes(jsonTarget)) {
  code = code.replace(jsonTarget, jsonReplacement);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated lessonContentController.js');

