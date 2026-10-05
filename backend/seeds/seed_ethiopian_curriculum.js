/**
 * Ethiopian early-childhood curriculum seed
 * =========================================
 * Publishes real age 5-9 content so the child portal has something to show and
 * an instructor has something to pin.
 *
 * IMPORTANT: this seed writes ACTIVITY CONTENT in exactly the shape the
 * instructor's ActivityBuilder produces, because the child games are renderers,
 * not content holders. If you change the contract in frontend/src/utils/
 * practiceContent.js, change it here too — otherwise the seeded games will
 * silently fall back to the reference defaults.
 *
 *   letter_tracing -> { letters: [{ base, sound, syllables[], word, emoji }], vowel_order_count }
 *   counting       -> { objects: [{ emoji, word }], min, max, rounds, numeral_system }
 *   matching       -> { pairs:    [{ left, right, emoji }] }        // left = letter, right = word
 *
 * Idempotent: safe to run repeatedly. It matches on (course title, age group)
 * and (lesson, title) and upserts the activities by title.
 */

const { query } = require('../src/config/db');

async function seed() {
  console.log('Seeding Ethiopian early-childhood content (ages 5-9)...\n');

  // ── The instructor who will own the content ───────────────────────────────
  const instructorRes = await query(
    'SELECT id, user_id FROM instructors ORDER BY id ASC LIMIT 1'
  );
  if (instructorRes.rows.length === 0) {
    console.error('No instructor account exists. Create one before seeding.');
    process.exit(1);
  }
  const instructorId = instructorRes.rows[0].id;

  // ── Reference data must be in place first: the seeded content mirrors it ──
  const kitRes = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM fidel_letters WHERE is_active)       AS letters,
       (SELECT COUNT(*)::int FROM geez_numerals WHERE is_active)       AS numerals,
       (SELECT COUNT(*)::int FROM picture_words WHERE is_active)       AS words,
       (SELECT COUNT(*)::int FROM encouragement_phrases WHERE is_active) AS praise`
  );
  const kit = kitRes.rows[0];
  if (kit.letters === 0 || kit.numerals === 0) {
    console.error(
      'Reference data is missing. Run migrations/023_child_home_instructor_content.sql first.'
    );
    process.exit(1);
  }
  console.log(
    `Reference data present: ${kit.letters} letters, ${kit.numerals} numerals, ` +
      `${kit.words} picture words, ${kit.praise} encouragement phrases.`
  );

  // Pull the real reference rows so the seeded content is internally consistent:
  // each letter carries its own seven vowel orders, each word its own emoji.
  const letters = (await query(
    'SELECT base_char, sound, syllables FROM fidel_letters WHERE is_active ORDER BY teaching_order, id'
  )).rows;
  const words = (await query(
    'SELECT word, english, emoji, example_for_letter FROM picture_words WHERE is_active'
  )).rows;

  const letterFor = (base) => letters.find((l) => l.base_char === base);
  const wordFor = (letterBase) => words.find((w) => w.example_for_letter === letterBase);
  const wordNamed = (name) => words.find((w) => w.word === name || w.english === name);

  /**
   * Which of the 24 base series does this word belong to?
   *
   * A word's first syllable is usually NOT its base. ቃሪያ starts with ቃ, the third
   * vowel order of the ቀ series, not with ቀ. The games key on BASE series, so
   * this is the only correct way to decide. fidel_letters.syllables already holds
   * all seven orders, so no lookup table is needed — and this applies the same
   * rule as migration 025's `example_for_letter` normalisation, keeping the two
   * from disagreeing.
   */
  function seriesForWord(word) {
    if (!word) return null;
    for (const ref of letters) {
      for (const syllable of ref.syllables || []) {
        if (syllable && word.startsWith(syllable)) return ref.base_char;
      }
    }
    return null;
  }

  /** Build a letter_tracing config the way the instructor builder would. */
  function tracingConfig(bases, vowelOrderCount = 7) {
    return {
      letters: bases
        .map((base) => {
          const ref = letterFor(base);
          const w = wordFor(base);
          return {
            base,
            sound: ref?.sound || '',
            syllables: (ref?.syllables || []).slice(0, vowelOrderCount),
            word: w?.word || base,
            emoji: w?.emoji || '🔤',
          };
        })
        .filter((l) => l.base),
      vowel_order_count: vowelOrderCount,
    };
  }

  /** Build a matching config: the BASE series on the left, the word on the right. */
  function matchingConfig(pairs) {
    const built = pairs
      .map(({ letter, word }) => {
        const w = wordNamed(word) || wordFor(letter);
        if (!w) return null;
        // Derive the series from the word rather than trusting the `letter` hint.
        // A word's first syllable is usually not its base — ቃሪያ begins with ቃ,
        // the third vowel order of the ቀ series — and the game looks up BASE
        // series, so a pair keyed on a vowel order would never match.
        const series = seriesForWord(w.word);
        if (!series) {
          console.warn(
            `  ! "${w.word}" starts with no known series, so the pair is skipped. ` +
              'A matching game with one impossible pair is a game a child cannot finish.'
          );
          return null;
        }
        return { left: series, right: w.word, emoji: w.emoji || '🖼️' };
      })
      .filter(Boolean);

    if (built.length < 4) {
      console.warn(
        `  ! only ${built.length} usable pair(s); a matching game needs 4 or more.`
      );
    }
    return { pairs: built };
  }

  function countingConfig(countableWords, min, max, rounds, numeralSystem = 'geez') {
    return {
      objects: countableWords
        .map((name) => {
          const w = wordNamed(name);
          return w ? { emoji: w.emoji, word: w.word, image_url: null } : null;
        })
        .filter(Boolean),
      min,
      max,
      rounds,
      numeral_system: numeralSystem,
    };
  }

  // ── Courses ───────────────────────────────────────────────────────────────
  // Upsert by (instructor, age group, title) so a re-run updates rather than
  // duplicating. The old seed relied on ON CONFLICT DO NOTHING, which silently
  // did nothing because there was no matching unique constraint.
  const COURSES = [
    {
      ageGroupId: 1,
      title: 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)',
      description:
        'የመጀመሪያዎቹን የአማርኛ ፊደላት በደስታና በጨዋታ እንማር! ሀ ሁ ሂ ሃ ሄ ህ ሆ',
      thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600',
    },
    {
      ageGroupId: 1,
      title: 'የኢትዮጵያ ቁጥሮችና ሂሳብ (Ethiopian Numbers)',
      description: 'የኢትዮጵያን የግዕዝ ቁጥሮች እንቁጠር! ፩ ፪ ፫ ፬ ፭',
      thumbnail: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600',
    },
    {
      ageGroupId: 1,
      title: 'የኢትዮጵያ እንስሳት (Animals of Ethiopia)',
      description: 'ስለ ሀገራችን ብርቅዬ እንስሳት ዋልያ፣ ቀይ ቀበሮ፣ ጭላዳ ዝንጀሮ እና አንበሳ እንወቅ!',
      thumbnail: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=600',
    },
    {
      ageGroupId: 2,
      title: 'የጥሩ ምግብና ዕቅር (Food and Drink)',
      description: 'የኢትዮጵያ ምግብና መጠጦችን በስዕል እንማር!',
      thumbnail: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600',
    },
  ];

  const courseIds = {};
  for (const c of COURSES) {
    const res = await query(
      `INSERT INTO courses (instructor_id, age_group_id, title, description, thumbnail_url, status)
       VALUES ($1, $2, $3, $4, $5, 'published')
       ON CONFLICT (instructor_id, age_group_id, title)
       DO UPDATE SET description = EXCLUDED.description,
                     thumbnail_url = EXCLUDED.thumbnail_url,
                     status = 'published',
                     updated_at = now()
       RETURNING id`,
      [instructorId, c.ageGroupId, c.title, c.description, c.thumbnail]
    );
    courseIds[c.title] = res.rows[0].id;
  }
  console.log(`\nCourses published: ${Object.keys(courseIds).length}`);

  // ── Teaching assignments ──────────────────────────────────────────────────
  // Owning a course is not the same as being assigned to teach it.
  //
  // `courses.instructor_id` records who built the course, and it is what the child
  // home pins against. `instructor_assignments` is what the instructor's own
  // course list reads, and the two are separate on purpose: an admin can hand a
  // course to a second teacher without transferring authorship of it.
  //
  // Without this step the seed produced content that was pinnable but invisible —
  // the games showed up as pin candidates while the instructor's course list stayed
  // empty, which reads as a bug in the app rather than as missing seed data.
  //
  // There is no unique index on this table, so idempotency is done by hand with a
  // NOT EXISTS guard rather than ON CONFLICT, and status is refreshed so a
  // deactivated assignment comes back on a re-run.
  for (const c of COURSES) {
    await query(
      `INSERT INTO instructor_assignments
         (instructor_id, course_id, age_group_id, academic_year_id, status, assigned_by)
       SELECT $1, $2, $3, ay.id, 'active', $1
         FROM (SELECT id FROM academic_years ORDER BY id LIMIT 1) ay
        WHERE NOT EXISTS (
          SELECT 1 FROM instructor_assignments ia
           WHERE ia.instructor_id = $1
             AND ia.course_id = $2
             AND ia.age_group_id = $3
        )`,
      [instructorId, courseIds[c.title], c.ageGroupId]
    );
    await query(
      `UPDATE instructor_assignments
          SET status = 'active', updated_at = now()
        WHERE instructor_id = $1 AND course_id = $2 AND age_group_id = $3`,
      [instructorId, courseIds[c.title], c.ageGroupId]
    );
  }
  const assigned = await query(
    `SELECT count(*)::int AS n FROM instructor_assignments
      WHERE instructor_id = $1 AND status = 'active'`,
    [instructorId]
  );
  console.log(`Teaching assignments in place: ${assigned.rows[0].n}`);

  // ── Lessons ───────────────────────────────────────────────────────────────
  const LESSONS = [
    { course: 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)', order: 1,
      title: 'የመጀመሪያዎቹ ፊደላት - ሀ፣ ለ፣ ሐ፣ መ', description: 'የፊደል ድምጾችን እና አጻጻፋቸውን እንለማመድ!' },
    { course: 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)', order: 2,
      title: 'ቀላል ቃላትን ማንበብ - አበበ፣ ጫማ፣ ኳስ', description: 'ቃላትን ከፊደላት አገጣጥመን እናንብብ!' },
    { course: 'የኢትዮጵያ ቁጥሮችና ሂሳብ (Ethiopian Numbers)', order: 1,
      title: 'የግዕዝ ቁጥሮች (፩ እስከ ፭)', description: 'ከ፩ እስከ ፭ ያሉትን የግዕዝ ቁጥሮች እንቁጠር!' },
    { course: 'የኢትዮጵያ ቁጥሮችና ሂሳብ (Ethiopian Numbers)', order: 2,
      title: 'ጨላታ፡ ከአምስት በላይ ቁጥር ተቆጥር', description: 'ብዙ ቁጥር ካለባችን በስክሪን ብዛት እንቆጥራለን!' },
    { course: 'የኢትዮጵያ እንስሳት (Animals of Ethiopia)', order: 1,
      title: 'ብርቅዬ የሀገራችን እንስሳት', description: 'በሰሜንና በባሌ የሚኖሩ እንስሳትን እንወቅ!' },
    { course: 'የጥሩ ምግብና ዕቅር (Food and Drink)', order: 1,
      title: 'የቤት ምግብና መጠጥ', description: 'የኢትዮጵያ ምግብን በስዕል እንማር።' },
  ];

  const lessonIds = {};
  for (const l of LESSONS) {
    const res = await query(
      `INSERT INTO lessons (course_id, title, description, order_index)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (course_id, order_index)
       DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now()
       RETURNING id`,
      [courseIds[l.course], l.title, l.description, l.order]
    );
    lessonIds[`${l.course}#${l.order}`] = res.rows[0].id;
  }
  console.log(`Lessons published:  ${Object.keys(lessonIds).length}`);

  // ── Activities ────────────────────────────────────────────────────────────
  // One activity per game type per age group, so every child home can show a
  // full spread. Upserted by (lesson, title).
  const ACTIVITIES = [
    // ── Fidel course ──
    {
      lesson: 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)#1',
      ageGroupId: 1,
      title: 'የመጀመሪያ ፊደላትን መጻፍ (Trace the First Letters)',
      instructions: 'ሀ፣ ለ፣ ሐ እና መ እንደ ራስህ በመስክር ጻፍ። እያንዳንዱ ፊደል ስለሚያስለው ሰባት ድምፅ አለ።',
      activityType: 'letter_tracing',
      difficulty: 'beginner',
      maxScore: 10,
      config: tracingConfig(['ሀ', 'ለ', 'ሐ', 'መ'], 7),
    },
    {
      lesson: 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)#1',
      ageGroupId: 1,
      title: 'የቀላል አምስት ፊደላት (Five Easy Letters)',
      instructions: 'ቀላሉ ለሚሆኑ ሁለት የድምፅ ቅርጾችን ብቻ እንለማመድ።',
      activityType: 'letter_tracing',
      difficulty: 'beginner',
      maxScore: 10,
      config: tracingConfig(['ረ', 'ሰ', 'ሸ', 'ቀ', 'በ'], 3),
    },
    {
      lesson: 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)#1',
      ageGroupId: 1,
      title: 'ፊደልና ስዕል ማዛመድ (Letter to Picture)',
      instructions: 'እያንዳንዱን ፊደል ከሚጀምርበት ስዕል ጋር አገናኝ!',
      activityType: 'matching',
      difficulty: 'easy',
      maxScore: 15,
      config: matchingConfig([
        { letter: 'ሀ', word: 'ሀብሐብ' },
        { letter: 'ለ', word: 'ሎሚ' },
        { letter: 'መ', word: 'መኪና' },
        { letter: 'ሰ', word: 'ሰዓት' },
        { letter: 'ረ', word: 'ርስ' },
      ]),
    },
    {
      lesson: 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)#2',
      ageGroupId: 1,
      title: 'ቃላትን ማንበብ (Read the Words)',
      instructions: 'ያለትን ሦስት ቃላት አንብብ።',
      activityType: 'matching',
      difficulty: 'easy',
      maxScore: 15,
      config: matchingConfig([
        { letter: 'አ', word: 'አበበ' },
        { letter: 'ጫ', word: 'ጫማ' },
        { letter: 'ኳ', word: 'ኳስ' },
        { letter: 'ቡ', word: 'ቡኖ' },
        { letter: 'ል', word: 'ልጥ' },
      ]),
    },

    // ── Numbers course ──
    {
      lesson: 'የኢትዮጵያ ቁጥሮችና ሂሳብ (Ethiopian Numbers)#1',
      ageGroupId: 1,
      title: 'ከአምስት በላይ ቁጥር ተቆጥር (Count Past Five)',
      instructions: 'ስዕላቱን ተቆጥረን ትክክለኛውን የግዕዝ ቁጥር ይምረጡ!',
      activityType: 'counting',
      difficulty: 'beginner',
      maxScore: 20,
      config: countingConfig(['ፀጋ', 'አንበሳ', 'ጎመን', 'ዶሮ'], 1, 10, 5, 'geez'),
    },
    {
      lesson: 'የኢትዮጵያ ቁጥሮችና ሂሳብ (Ethiopian Numbers)#2',
      ageGroupId: 1,
      title: 'ጨላታ፡ ብዙ ቁጥር ተቆጥር (Count a Lot)',
      instructions: 'በድጋፍ ቁጥር ተቆጥረን። በጣም ብዙ ሲሆን ያስታውሱ!',
      activityType: 'counting',
      difficulty: 'easy',
      maxScore: 20,
      config: countingConfig(['ፀጋ', 'ጎመን', 'አንበሳ', 'ልብ', 'ፍራፍ'], 5, 20, 5, 'geez'),
    },
    {
      lesson: 'የኢትዮጵያ ቁጥሮችና ሂሳብ (Ethiopian Numbers)#1',
      ageGroupId: 1,
      title: 'የግዕዝ ቁጥሮች ማዛመድ (Match the Numbers)',
      instructions: 'የግዕዝ ቁጥሩን ከተለመዱቱ ጋር አገናኝ!',
      activityType: 'matching',
      difficulty: 'easy',
      maxScore: 15,
      config: {
        pairs: [1, 2, 3, 4, 5].map((n) => ({
          left: String(n),
          right: ['አንድ', 'ሁለት', 'ሦስት', 'አራት', 'አምስት'][n - 1],
          emoji: '🔢',
        })),
      },
    },

    // ── Animals course ──
    {
      lesson: 'የኢትዮጵያ እንስሳት (Animals of Ethiopia)#1',
      ageGroupId: 1,
      title: 'የእንስሳት ስዕላትን ተቆጥር (Count the Animals)',
      instructions: 'እንስሳቶቹን ተቆጥረን ቁጥሩን ይምረጡ!',
      activityType: 'counting',
      difficulty: 'beginner',
      maxScore: 20,
      config: countingConfig(['አንበሳ', 'ጎመን', 'ዶሮ', 'ፍራፍ'], 1, 8, 4, 'geez'),
    },
    {
      lesson: 'የኢትዮጵያ እንስሳት (Animals of Ethiopia)#1',
      ageGroupId: 1,
      title: 'የኢትዮጵያ እንስሳት ማዛመድ (Ethiopian Wildlife)',
      instructions: 'እንስሳቱን ከስማቸው ጋር አገናኝ!',
      activityType: 'matching',
      difficulty: 'easy',
      maxScore: 15,
      config: matchingConfig([
        { letter: 'አ', word: 'አንበሳ' },
        { letter: 'ጎ', word: 'ጎመን' },
        { letter: 'ደ', word: 'ዶሮ' },
        { letter: 'ላ', word: 'ላም' },
        { letter: 'ፍ', word: 'ፍራፍ' },
      ]),
    },

    // ── Food course, for the 8-9 band ──
    // A 9-year-old can hold a pen properly, so this band gets a harder tracing
    // set (fourth-order vowels, the ones a Grade 2 child is still working) and
    // a wider counting range than the 5-7 band.
    {
      lesson: 'የጥሩ ምግብና ዕቅር (Food and Drink)#1',
      ageGroupId: 2,
      title: 'የአራት ድምፅ ፊደላት (The Four Sounds)',
      instructions: 'እያንዳንዱ ፊደል ከአራት ድምፅ ጋር እንወጣለን። ሩ ሪ ር ሮ።',
      activityType: 'letter_tracing',
      difficulty: 'easy',
      maxScore: 15,
      config: tracingConfig(['ለ', 'መ', 'ረ', 'ሰ'], 4),
    },
    {
      lesson: 'የጥሩ ምግብና ዕቅር (Food and Drink)#1',
      ageGroupId: 2,
      title: 'የኢትዮጵያ ምግብ ማዛመድ (Our Food)',
      instructions: 'የምግብቱን ስዕል ከማውረድ ጋር አገናኝ!',
      activityType: 'matching',
      difficulty: 'easy',
      maxScore: 15,
      config: matchingConfig([
        { letter: 'እ', word: 'እንጀሪ' },
        { letter: 'ሽ', word: 'ሽከርካ' },
        { letter: 'ቃ', word: 'ቃሪያ' },
        { letter: 'ም', word: 'ምስሌ' },
        { letter: 'ወ', word: 'ወይር' },
      ]),
    },
    {
      lesson: 'የጥሩ ምግብና ዕቅር (Food and Drink)#1',
      ageGroupId: 2,
      title: 'ምግብን ተቆጥር (Count the Food)',
      instructions: 'ምግቡን ተቆጥረን ቁጥሩን ይምረጡ!',
      activityType: 'counting',
      difficulty: 'easy',
      maxScore: 20,
      config: countingConfig(['እንጀሪ', 'ሽከርካ', 'ቃሪያ', 'ዕንጀሪ'], 1, 10, 5, 'geez'),
    },
  ];

  const courseOfLesson = {};
  for (const l of LESSONS) courseOfLesson[`${l.course}#${l.order}`] = l.course;

  let published = 0;
  const skipped = [];
  for (const a of ACTIVITIES) {
    const lessonId = lessonIds[a.lesson];
    if (!lessonId) {
      skipped.push(`${a.title} (no lesson)`);
      continue;
    }
    // Refuse to publish a half-built activity: the child games cannot run
    // without their content, and a broken tile is worse than no tile.
    if (a.activityType === 'letter_tracing' && !a.config.letters?.length) {
      skipped.push(`${a.title} (no letters)`);
      continue;
    }
    if (a.activityType === 'counting' && !a.config.objects?.length) {
      skipped.push(`${a.title} (no objects)`);
      continue;
    }
    if (a.activityType === 'matching' && !a.config.pairs?.length) {
      skipped.push(`${a.title} (no pairs)`);
      continue;
    }

    const res = await query(
      `INSERT INTO activities
         (lesson_id, course_id, instructor_id, age_group_id, title, instructions,
          activity_type, difficulty, max_score, status, activity_config, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10,
               COALESCE((SELECT MAX(display_order) + 1 FROM activities WHERE lesson_id = $1), 0))
       ON CONFLICT (lesson_id, title)
       DO UPDATE SET instructions = EXCLUDED.instructions,
                     activity_type = EXCLUDED.activity_type,
                     difficulty = EXCLUDED.difficulty,
                     max_score = EXCLUDED.max_score,
                     status = 'active',
                     activity_config = EXCLUDED.activity_config,
                     updated_at = now()
       RETURNING id`,
      [
        lessonId,
        courseIds[courseOfLesson[a.lesson]],
        instructorId,
        a.ageGroupId,
        a.title,
        a.instructions,
        a.activityType,
        a.difficulty,
        a.maxScore,
        JSON.stringify(a.config),
      ]
    );
    if (res.rows[0]) published += 1;
  }
  console.log(`Activities published: ${published}`);
  if (skipped.length) {
    console.log(`  skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`    - ${s}`);
    console.log(
      '  (these need reference rows the database does not have — add them under\n' +
      '   /admin/reference, then re-run this seed.)'
    );
  }

  // ── A ready-made child home ───────────────────────────────────────────────
  // Pinning is the instructor's job, so the seed does not invent a layout. It
  // does however make the FIRST course's first game available to pin, and it
  // leaves a note in the output so the reviewer knows the one click to make.
  console.log('\nNext step: open the instructor screen at /instructor/child-home and pin');
  console.log('up to six activities for the age group. Nothing is pinned by default,');
  console.log('so the child home correctly shows "your teacher is still choosing".');
  console.log('\nEthiopian early-childhood content seeded.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding error:', err.message);
    process.exit(1);
  });
