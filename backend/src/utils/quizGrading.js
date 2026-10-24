// Grading helpers for quiz questions, kept separate from the controller so
// they can be exercised directly (see scripts/_check_quiz_matching.js).
//
// Matching questions store their content as options = { pairs: [{question, answer}] }.
// The generic `correct_answer` text column is not meaningful for them because
// the answer pool is shuffled in the UI, so grading compares each selection
// against its pair instead. Partial credit is awarded per pair.

function matchingPairsOf(q) {
  const options = q && q.options;
  if (options && typeof options === 'object' && Array.isArray(options.pairs)) {
    return options.pairs;
  }
  if (options && typeof options === 'object' && Array.isArray(options.questions)) {
    const answers = Array.isArray(options.answers) ? options.answers : [];
    return options.questions.map((question, idx) => ({ question, answer: answers[idx] || '' }));
  }
  return [];
}

function matchingScore(q, given) {
  const pairs = matchingPairsOf(q);
  if (pairs.length === 0) return { correct: 0, total: 0, fraction: 0 };
  let picked = given;
  if (typeof picked === 'string') {
    try { picked = JSON.parse(picked); } catch { return { correct: 0, total: pairs.length, fraction: 0 }; }
  }
  if (!picked || typeof picked !== 'object') return { correct: 0, total: pairs.length, fraction: 0 };
  let correct = 0;
  pairs.forEach((pair, idx) => {
    const selection = picked[idx] ?? picked[String(idx)];
    if (selection !== undefined && selection !== null && selection !== '' &&
        String(selection).trim().toLowerCase() === String(pair.answer).trim().toLowerCase()) {
      correct += 1;
    }
  });
  return { correct, total: pairs.length, fraction: correct / pairs.length };
}

function gradeAnswer(q, given) {
  if (q.question_type === 'matching') {
    return matchingScore(q, given).fraction === 1;
  }
  return given !== undefined && given !== null &&
    given.toString().trim().toLowerCase() === q.correct_answer.toString().trim().toLowerCase();
}

function correctAnswerText(q) {
  if (q.question_type === 'matching') {
    return matchingPairsOf(q).map((p) => `${p.question} → ${p.answer}`).join('; ');
  }
  return q.correct_answer;
}

function formatMatchingAnswer(q, given) {
  const pairs = matchingPairsOf(q);
  const { correct, total } = matchingScore(q, given);
  let picked = given;
  if (typeof picked === 'string') {
    try { picked = JSON.parse(picked); } catch { picked = {}; }
  }
  if (!picked || typeof picked !== 'object') return given;
  const detail = pairs.map((pair, idx) => {
    const selection = picked[idx] ?? picked[String(idx)] ?? '';
    return `${pair.question} → ${selection || '-'}`;
  }).join('; ');
  return `${detail} (${correct}/${total} correct)`;
}

module.exports = { matchingPairsOf, matchingScore, gradeAnswer, correctAnswerText, formatMatchingAnswer };
