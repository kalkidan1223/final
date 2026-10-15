const fs = require('fs');
const file = 'src/controllers/childLearningController.js';
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
if (crlf) src = src.replace(/\r\n/g, '\n');
const L = src.split('\n');

// Video upsert (10 params) and material upsert (8 params) pass duration_seconds
// as $3, so the text cast added for the status params must be undone there.
const fixes = [
  ['$1, $2, $3::text, $4, $5, $6, $7, $8, $9, $10, now(), now()', '$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now()'],
  ['$1, $2, $3::text, $4, $5, $6, $7, $8, now(), now()', '$1, $2, $3, $4, $5, $6, $7, $8, now(), now()'],
];
for (const [find, repl] of fixes) {
  const n = L.filter((l) => l.includes(find)).length;
  if (n !== 1) { console.error('expected 1, got ' + n + ' for ' + JSON.stringify(find.slice(0, 40))); process.exit(1); }
}
src = src.replace(fixes[0][0], fixes[0][1]).replace(fixes[1][0], fixes[1][1]);
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('reverted video/material $3 casts');