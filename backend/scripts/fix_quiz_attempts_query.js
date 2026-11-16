const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'childLearningController.js');
let code = fs.readFileSync(filePath, 'utf8');

const target = "SELECT qa_inner.score, qa_inner.percentage, qa_inner.is_passed";
const replacement = "SELECT qa_inner.score, qa_inner.percentage, qa_inner.passed as is_passed";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated childLearningController.js quiz attempts query');
} else {
  console.log('Target not found in childLearningController.js');
}

