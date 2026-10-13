// Grading helpers for quiz questions, kept separate from the controller so
// they can be exercised directly (see scripts/_check_quiz_matching.js).
//
// Matching questions store their content as options = { pairs: [{question, answer}] }.
// The generic `correct_answer` text column is not meaningful for them because
// the answer pool is shuffled in the UI, so grading compares each selection
// against its pair instead.

// Parses the pairs stored on a matching question. Also tolerates the legacy
// { questions: [], answers: [] } shape.
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

// Grades one question. Matching questions compare each chosen answer against
// its pair; every other type is compared as trimmed, case-insensitive text.
function gradeAnswer(q, given) {
  if (q.question_type === 'matching') {
    const pairs = matchingPairsOf(q);
    if (pairs.length === 0) return false;
    let picked = given;
    if (typeof picked === 'string') {
      try { picked = JSON.parse(picked); } catch { return false; }
    }
    if (!picked || typeof picked !== 'object') return false;
    return pairs.every((pair, idx) => {
      const selection = picked[idx] ?? picked[String(idx)];
      return selection !== undefined && selection !== null && selection !== '' &&
        String(selection).trim().toLowerCase() === String(pair.answer).trim().toLowerCase();
    });
  }
  return given !== undefined && given !== null &&
    given.toString().trim().toLowerCase() === q.correct_answer.toString().trim().toLowerCase();
}

// Human-readable correct answer for the review screen.
function correctAnswerText(q) {
  if (q.question_type === 'matching') {
    return matchingPairsOf(q).map((p) => `${p.question} → ${p.answer}`).join('; ');
  }
  return q.correct_answer;
}

// Human-readable rendering of the learner's matching selections.
function formatMatchingAnswer(q, given) {
  const pairs = matchingPairsOf(q);
  let picked = given;
  if (typeof picked === 'string') {
    try { picked = JSON.parse(picked); } catch { picked = {}; }
  }
  if (!picked || typeof picked !== 'object') return given;
  return pairs
    .map((pair, idx) => {
      const selection = picked[idx] ?? picked[String(idx)] ?? '';
      return `${pair.question} → ${selection || '—'}`;
    })
    .join('; ');
}

module.exports = { matchingPairsOf, gradeAnswer, correctAnswerText, formatMatchingAnswer };
