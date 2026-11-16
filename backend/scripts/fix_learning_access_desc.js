const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'learningAccess.js');
let code = fs.readFileSync(filePath, 'utf8');

const target = "SELECT ct.id, ct.title, ${table === 'quizzes' ? 'ct.instructions' : 'ct.description'} as item_desc";

const replacement = "SELECT ct.id, ct.title, " +
  "${table === 'learning_materials' ? 'ct.description' : table === 'activities' ? 'ct.instructions' : table === 'quizzes' ? 'COALESCE(ct.instructions, ct.description)' : 'NULL'} as item_desc";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated learningAccess.js item_desc query');
} else {
  console.log('Target not found in learningAccess.js');
}

