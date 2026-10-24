const fs = require('fs');
const p = 'src/pages/child/ChildQuizTake.jsx';
let s = fs.readFileSync(p, 'utf8');
const anchor = "const answeredCount = questions.filter(isQuestionAnswered).length;";
const addition = anchor + `
  const itemCount = (q) => (q.question_type === 'matching' ? Math.max(1, matchingPairs(q).length) : 1);
  const itemStarts = [];
  let _cursor = 0;
  questions.forEach((q) => { itemStarts.push(_cursor); _cursor += itemCount(q); });
  const totalItems = _cursor;
  const answeredItems = questions.reduce((acc, q) => {
    if (q.question_type === 'matching') {
      const pairs = matchingPairs(q);
      const picked = parseMatchingSelections(answers[q.id]);
      return acc + pairs.filter((_, idx) => picked[idx]).length;
    }
    return acc + (answers[q.id] !== undefined && answers[q.id] !== '' ? 1 : 0);
  }, 0);
  const currentItemStart = itemStarts[currentQuestion] || 0;
  const currentItemEnd = currentItemStart + itemCount(currentQ);
  const currentQuestionLabel = currentQ && currentQ.question_type === 'matching' && itemCount(currentQ) > 1
    ? 'Questions ' + (currentItemStart + 1) + '-' + currentItemEnd + ' of ' + totalItems
    : 'Question ' + (currentItemStart + 1) + ' of ' + totalItems;
`;
if (!s.includes(anchor)) { console.log('anchor not found'); process.exit(1); }
s = s.replace(anchor, addition);
// Update progressPercent to use answeredItems/totalItems
s = s.replace(
  "  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;",
  "  const progressPercent = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0;"
);
// Update counter display
s = s.replace(
  " piping {currentQuestion + 1} ከ {questions.length}",
  " " + "${currentQuestionLabel}"
);
fs.writeFileSync(p, s);
console.log('done');
"