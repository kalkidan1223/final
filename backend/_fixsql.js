const fs = require('fs');
const file = 'src/controllers/childLearningController.js';
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
if (crlf) src = src.replace(/\r\n/g, '\n');

// The `status` value is passed in $3 and also compared inside CASE. PostgreSQL
// cannot infer one type for the parameter, so cast it explicitly to text.
const edits = [
  ["$3 != 'not_started'", "$3::text != 'not_started'"],
  ["$3 = 'completed'", "$3::text = 'completed'"],
  ['status = $3,', 'status = $3::text,'],
  ['($1, $2, $3, $4, $5, $6,', '($1, $2, $3::text, $4, $5, $6,'],
  ['($1, $2, $3, $4, now(),', '($1, $2, $3::text, $4, now(),'],
];

for (const [find, repl] of edits) {
  const n = src.split(find).length - 1;
  if (n === 0) { console.error('NO MATCH for', JSON.stringify(find)); process.exit(1); }
  src = src.split(find).join(repl);
  console.log(`replaced ${n}x  ${JSON.stringify(find)}`);
}

if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('done');