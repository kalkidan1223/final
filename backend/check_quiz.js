const { query } = require('./src/config/db');

(async () => {
  try {
    const c1 = await query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'quiz_results'::regclass");
    console.log('QUIZ_RESULTS CONSTRAINTS:', c1.rows);
    const c2 = await query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'student_quiz_attempts'::regclass");
    console.log('STUDENT_QUIZ_ATTEMPTS CONSTRAINTS:', c2.rows);

    const f1 = await query("SELECT * FROM quiz_results LIMIT 1");
    console.log('QUIZ_RESULTS FIELDS:', f1.fields.map(f => f.name));

    const f2 = await query("SELECT * FROM student_quiz_attempts LIMIT 1");
    console.log('STUDENT_QUIZ_ATTEMPTS FIELDS:', f2.fields.map(f => f.name));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
