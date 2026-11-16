const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'childLearningController.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Fix materialProgress scope
code = code.replace(
  "    const client = await pool.connect();\n    try {\n      await client.query('BEGIN');\n\n      const result = await client.query(",
  "    let materialProgress = null;\n    const client = await pool.connect();\n    try {\n      await client.query('BEGIN');\n\n      const result = await client.query("
);
code = code.replace(
  "      const materialProgress = result.rows[0];",
  "      materialProgress = result.rows[0];"
);

// 2. Expose concrete content on resource object in getLessonJourney
const mapTarget = `      return {
        id: resource.id,
        resource_type: resource.resource_type,
        resource_id: resource.resource_id,
        title: resource.title,
        description: resource.description,
        display_order: resource.display_order,
        is_required: resource.is_required,
        status,
        progress_percentage: resource.progress_percentage || (status === 'completed' ? 100 : 0),
        completed_at: resource.completed_at,
        time_spent_seconds: resource.time_spent_seconds || 0,
        is_locked: isLocked,`;

const mapReplacement = `      return {
        id: resource.id,
        resource_type: resource.resource_type,
        resource_id: resource.resource_id,
        title: resource.title,
        description: resource.description,
        display_order: resource.display_order,
        is_required: resource.is_required,
        status,
        progress_percentage: resource.progress_percentage || (status === 'completed' ? 100 : 0),
        completed_at: resource.completed_at,
        time_spent_seconds: resource.time_spent_seconds || 0,
        is_locked: isLocked,
        material_type: resource.material_type,
        file_url: resource.material_file_url,
        thumbnail_url: resource.material_thumbnail_url,
        text_content: resource.material_text_content,
        metadata: resource.material_metadata,
        video_url: resource.video_url,
        source_type: resource.video_source_type,
        duration_seconds: resource.video_duration_seconds,
        activity_type: resource.activity_type,
        instructions: resource.activity_instructions,
        activity_config: resource.activity_config,
        resource_url: resource.activity_resource_url,
        max_score: resource.activity_max_score,
        auto_gradable: resource.activity_auto_gradable,
        submission: resource.submission_id ? {
          id: resource.submission_id,
          status: resource.submission_status,
          score: resource.submission_score,
          submission_text: resource.submission_text,
          submission_url: resource.submission_url,
        } : null,`;

if (code.includes(mapTarget)) {
  code = code.replace(mapTarget, mapReplacement);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully fixed childLearningController.js');

