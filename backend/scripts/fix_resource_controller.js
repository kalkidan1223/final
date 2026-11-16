const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'lessonResourceController.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of the restrictive access check with canManageLesson
const regex = /\s*\/\/ Verify instructor has access\s*const accessCheck = await query\(\s*`SELECT c\.id FROM courses c\s*JOIN lessons l ON l\.course_id = c\.id\s*JOIN instructors i ON c\.instructor_id = i\.id\s*WHERE l\.id = \$1 AND i\.user_id = \$2`,\s*\[lessonId, req\.user\.id\]\s*\);\s*if \(accessCheck\.rows\.length === 0 && req\.user\.role !== 'admin'\) \{\s*return res\.status\(403\)\.json\(\{ error: 'Access denied' \}\);\s*\}/g;

const replacement = `
    // Verify instructor has access
    const allowed = await canManageLesson(req.user, lessonId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }`;

const matches = content.match(regex);
console.log('Matches found:', matches ? matches.length : 0);

if (matches && matches.length > 0) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated lessonResourceController.js');
} else {
  console.log('No matches found for regex');
}

