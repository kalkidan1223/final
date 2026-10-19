const fs = require('fs');
const p = 'src/components/child/LessonResourceViewer.jsx';
let s = fs.readFileSync(p, 'utf8');
const old = "I read this page";
const idx = s.indexOf(old);
console.log('found:', idx);
// Replace the whole pdf branch button. Find from "{type === 'pdf' ? (" to the next ") : type === 'audio' ? ("
const start = s.indexOf("{type === 'pdf' ? (");
const end = s.indexOf(") : type === 'audio' ? (");
console.log('start', start, 'end', end);
if (start === -1 || end === -1) { console.log('NOT FOUND'); process.exit(1); }
const neu = "{type === 'pdf' ? (\n  <button\n    onClick={() => report({ view_percentage: 100 })}\n    className=\"px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-full hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition transform hover:scale-105\"\n  >\n    I have read this PDF\n  </button>\n) : type === 'audio' ? (";
s = s.slice(0, start) + neu + s.slice(end + ") : type === 'audio' ? (".length);
fs.writeFileSync(p, s);
console.log('done');
"