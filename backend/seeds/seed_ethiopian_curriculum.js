const { query } = require('../src/config/db');

async function seedEthiopianCurriculum() {
  try {
    console.log('Seeding Ethiopian curriculum courses, lessons, activities, and quizzes...');

    // 1. Get instructors
    const instRes = await query('SELECT id FROM instructors ORDER BY id ASC');
    const instructor1 = instRes.rows[0]?.id || 1;
    const instructor2 = instRes.rows[1]?.id || instructor1;

    // 2. Ensure Age Group 1 (5-7) Courses exist and are published
    // Course 1: Fidel & Amharic
    const c1Res = await query(
      `INSERT INTO courses (instructor_id, age_group_id, title, description, thumbnail_url, status)
       VALUES ($1, 1, 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)', 'የመጀመሪያዎቹን የአማርኛ ፊደላት በደስታና በጨዋታ እንማር! ሀ ሁ ሂ ሃ ሄ ህ ሆ', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600', 'published')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [instructor1]
    );

    let course1Id = c1Res.rows[0]?.id;
    if (!course1Id) {
      const existing = await query(`SELECT id FROM courses WHERE title LIKE '%የአማርኛ ፊደላት%' AND age_group_id = 1 LIMIT 1`);
      course1Id = existing.rows[0]?.id;
    }

    // If still not, update course 1 if exists or insert
    if (!course1Id) {
      const up = await query(`UPDATE courses SET title = 'የአማርኛ ፊደላት ለህፃናት (Amharic Fidel for Kids)', description = 'የመጀመሪያዎቹን የአማርኛ ፊደላት በደስታና በጨዋታ እንማር! ሀ ሁ ሂ ሃ ሄ ህ ሆ', status = 'published' WHERE id = 1 RETURNING id`);
      course1Id = up.rows[0]?.id || 1;
    }

    // Course 2: Ethiopian Numbers
    const c2Res = await query(
      `INSERT INTO courses (instructor_id, age_group_id, title, description, thumbnail_url, status)
       VALUES ($1, 1, 'የኢትዮጵያ ቁጥሮችና ሂሳብ (Ethiopian Numbers - ፩ ፪ ፫)', 'የኢትዮጵያን የግዕዝ ቁጥሮች እንቁጠር! ፩፣ ፪፣ ፫፣ ፬፣ ፭ እና መሰረታዊ ሂሳብ', 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600', 'published')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [instructor2]
    );
    let course2Id = c2Res.rows[0]?.id;
    if (!course2Id) {
      const existing = await query(`SELECT id FROM courses WHERE title LIKE '%የኢትዮጵያ ቁጥሮች%' AND age_group_id = 1 LIMIT 1`);
      course2Id = existing.rows[0]?.id;
    }

    // Course 3: Animals of Ethiopia
    const c3Res = await query(
      `INSERT INTO courses (instructor_id, age_group_id, title, description, thumbnail_url, status)
       VALUES ($1, 1, 'የኢትዮጵያ ውብ እንስሳት (Animals of Ethiopia)', 'ስለ ሀገራችን ብርቅዬ እንስሳት ዋልያ፣ ቀይ ቀበሮ፣ ጭላዳ ዝንጀሮ እና አንበሳ እንወቅ!', 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=600', 'published')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [instructor1]
    );
    let course3Id = c3Res.rows[0]?.id;
    if (!course3Id) {
      const existing = await query(`SELECT id FROM courses WHERE title LIKE '%የኢትዮጵያ ውብ እንስሳት%' AND age_group_id = 1 LIMIT 1`);
      course3Id = existing.rows[0]?.id;
    }

    console.log('Courses configured:', { course1Id, course2Id, course3Id });

    // 3. Lessons for Course 1 (Fidel & Amharic)
    const l1Res = await query(
      `INSERT INTO lessons (course_id, title, description, order_index)
       VALUES ($1, 'የመጀመሪያዎቹ ፊደላት - ሀ፣ ለ፣ ሐ፣ መ', 'የፊደል ድምጾችን እና አጻጻፋቸውን እንለማመድ!', 1)
       ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
       RETURNING id`,
      [course1Id]
    );
    const lesson1Id = l1Res.rows[0]?.id;

    const l2Res = await query(
      `INSERT INTO lessons (course_id, title, description, order_index)
       VALUES ($1, 'ቀላል ቃላትን ማንበብ - አበበ፣ ጫማ፣ ኳስ', 'ቃላትን ከፊደላት አገጣጥመን እናንብብ!', 2)
       ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
       RETURNING id`,
      [course1Id]
    );
    const lesson2Id = l2Res.rows[0]?.id;

    // Lessons for Course 2 (Numbers)
    const l3Res = await query(
      `INSERT INTO lessons (course_id, title, description, order_index)
       VALUES ($1, 'የግዕዝ ቁጥሮች (፩ እስከ ፭)', 'ከ፩ እስከ ፭ ያሉትን የግዕዝ ቁጥሮች እንቁጠር!', 1)
       ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
       RETURNING id`,
      [course2Id]
    );
    const lesson3Id = l3Res.rows[0]?.id;

    // Lessons for Course 3 (Animals)
    const l4Res = await query(
      `INSERT INTO lessons (course_id, title, description, order_index)
       VALUES ($1, 'ብርቅዬ የሀገራችን እንስሳት (Walia, Red Fox, Gelada)', 'በሰሜንና በባሌ ተራሮች የሚኖሩ ውብ እንስሳትን እንወቅ!', 1)
       ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
       RETURNING id`,
      [course3Id]
    );
    const lesson4Id = l4Res.rows[0]?.id;

    console.log('Lessons configured:', { lesson1Id, lesson2Id, lesson3Id, lesson4Id });

    // 4. Activities for Lesson 1 (Amharic Fidels)
    // Activity A: Writing / Tracing (ሀ, ለ, ሐ, መ)
    await query(
      `INSERT INTO activities (lesson_id, course_id, instructor_id, age_group_id, title, instructions, activity_type, difficulty, max_score, status, activity_config)
       VALUES ($1, $2, $3, 1, 'የፊደል መጻፊያ (Fidel Writing & Tracing)', 'በስክሪኑ ላይ የፊደል ቅርጾችን (ሀ፣ ለ፣ ሐ፣ መ) ጻፍና አስረክብ!', 'writing', 'beginner', 10, 'published', $4)
       ON CONFLICT DO NOTHING`,
      [
        lesson1Id,
        course1Id,
        instructor1,
        JSON.stringify({
          prompt: 'የፊደል ቅርጾችን (ሀ እና ለ) በጥንቃቄ ጻፍ!',
          letters: ['ሀ', 'ለ', 'ሐ', 'መ'],
          canvas_background: 'tracing_guide'
        })
      ]
    );

    // Activity B: Matching (Fidel with Picture)
    await query(
      `INSERT INTO activities (lesson_id, course_id, instructor_id, age_group_id, title, instructions, activity_type, difficulty, max_score, status, activity_config)
       VALUES ($1, $2, $3, 1, 'ስዕልና ፊደል ማዛመድ (Match Fidel to Picture)', 'እያንዳንዱን ፊደል ከሚጀምርበት ትክክለኛ ስዕል ጋር አገናኝ!', 'matching', 'easy', 15, 'published', $4)
       ON CONFLICT DO NOTHING`,
      [
        lesson1Id,
        course1Id,
        instructor1,
        JSON.stringify({
          pairs: [
            { left: 'ሀ (ሀብሐብ)', right: '🍉 ሀብሐብ' },
            { left: 'ለ (ሎሚ)', right: '🍋 ሎሚ' },
            { left: 'መ (መኪና)', right: '🚗 መኪና' },
            { left: 'ሰ (ሰዓት)', right: '⏰ ሰዓት' }
          ]
        })
      ]
    );

    // Activity C: Listening (Ethiopian Folklore Story)
    await query(
      `INSERT INTO activities (lesson_id, course_id, instructor_id, age_group_id, title, instructions, activity_type, difficulty, max_score, status, activity_config)
       VALUES ($1, $2, $3, 1, 'አጭር ተረት ማዳመጥ (Listen: The Clever Rabbit)', 'የብልጡ ጥንቸልና የአንበሳውን ተረት አዳምጥና ጥያቄዎችን መልስ!', 'listening', 'beginner', 20, 'published', $4)
       ON CONFLICT DO NOTHING`,
      [
        lesson1Id,
        course1Id,
        instructor1,
        JSON.stringify({
          audio_title: 'የብልጡ ጥንቸልና የአንበሳው ተረት',
          story_text: 'በአንድ ትልቅ ጫካ ውስጥ አንድ ኃይለኛ አንበሳ ይኖር ነበር። አንድ ቀን አንዲት ብልጥ ጥንቸል አንበሳውን በብልጠት ጉድጓድ ውስጥ አስገባችው...',
          duration: 120
        })
      ]
    );

    // Activity D: Matching for Ethiopian Numbers (Lesson 3)
    await query(
      `INSERT INTO activities (lesson_id, course_id, instructor_id, age_group_id, title, instructions, activity_type, difficulty, max_score, status, activity_config)
       VALUES ($1, $2, $3, 1, 'የግዕዝ ቁጥሮች ማዛመድ (Geez Numbers Match ፩-፭)', 'የግዕዝ ቁጥሮችን ከተለመዱት ቁጥሮች ጋር አዛምድ!', 'matching', 'easy', 15, 'published', $4)
       ON CONFLICT DO NOTHING`,
      [
        lesson3Id,
        course2Id,
        instructor2,
        JSON.stringify({
          pairs: [
            { left: '፩ (አንድ)', right: '1 (One)' },
            { left: '፪ (ሁለት)', right: '2 (Two)' },
            { left: '፫ (ሦስት)', right: '3 (Three)' },
            { left: '፬ (አራት)', right: '4 (Four)' },
            { left: '፭ (አምስት)', right: '5 (Five)' }
          ]
        })
      ]
    );

    // Activity E: Matching for Ethiopian Animals (Lesson 4)
    await query(
      `INSERT INTO activities (lesson_id, course_id, instructor_id, age_group_id, title, instructions, activity_type, difficulty, max_score, status, activity_config)
       VALUES ($1, $2, $3, 1, 'የኢትዮጵያ እንስሳት ማዛመድ (Ethiopian Wildlife)', 'የኢትዮጵያን ብርቅዬ እንስሳት ከስማቸው ጋር አገናኝ!', 'matching', 'easy', 15, 'published', $4)
       ON CONFLICT DO NOTHING`,
      [
        lesson4Id,
        course3Id,
        instructor1,
        JSON.stringify({
          pairs: [
            { left: 'ዋልያ (Walia Ibex)', right: '🐐 ዋልያ' },
            { left: 'ቀይ ቀበሮ (Red Fox)', right: '🦊 ቀይ ቀበሮ' },
            { left: 'ጭላዳ ዝንጀሮ (Gelada)', right: '🐒 ጭላዳ ዝንጀሮ' },
            { left: 'አንበሳ (Ethiopian Lion)', right: '🦁 አንበሳ' }
          ]
        })
      ]
    );

    // 5. Quizzes
    const q1Res = await query(
      `INSERT INTO quizzes (lesson_id, title, description, time_limit_seconds)
       VALUES ($1, 'የፊደላት የኮከብ ፈተና (Fidel Star Quiz)', 'የመጀመሪያዎቹን ፊደላት ምን ያህል እንዳወቅካቸው እንይ!', 300)
       RETURNING id`,
      [lesson1Id]
    );
    const quiz1Id = q1Res.rows[0]?.id;

    if (quiz1Id) {
      await query(
        `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index)
         VALUES
         ($1, '«ሀብሐብ» የሚለው ቃል በየትኛው ፊደል ይጀምራል?', 'mcq', '[\"ሀ\", \"ለ\", \"መ\", \"ረ\"]'::jsonb, 'ሀ', 5, 1),
         ($1, '«ሎሚ» የሚለው ቃል በየትኛው ፊደል ይጀምራል?', 'mcq', '[\"ሀ\", \"ለ\", \"ሐ\", \"ሰ\"]'::jsonb, 'ለ', 5, 2),
         ($1, '«መኪና» የሚለው ቃል በየትኛው ፊደል ይጀምራል?', 'mcq', '[\"መ\", \"ቀ\", \"በ\", \"ተ\"]'::jsonb, 'መ', 5, 3)`,
        [quiz1Id]
      );
    }

    const q2Res = await query(
      `INSERT INTO quizzes (lesson_id, title, description, time_limit_seconds)
       VALUES ($1, 'የግዕዝ ቁጥሮች ፈተና (Geez Numbers Quiz)', 'ከ፩ እስከ ፭ ያሉትን ቁጥሮች እንፈትሽ!', 300)
       RETURNING id`,
      [lesson3Id]
    );
    const quiz2Id = q2Res.rows[0]?.id;
    if (quiz2Id) {
      await query(
        `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index)
         VALUES
         ($1, '«፩» ማለት ምን ያህል ቁጥር ነው?', 'mcq', '[\"1\", \"2\", \"3\", \"4\"]'::jsonb, '1', 5, 1),
         ($1, '«፫» ማለት ምን ያህል ቁጥር ነው?', 'mcq', '[\"2\", \"3\", \"4\", \"5\"]'::jsonb, '3', 5, 2),
         ($1, '«፭» ማለት ምን ያህል ቁጥር ነው?', 'mcq', '[\"1\", \"3\", \"5\", \"10\"]'::jsonb, '5', 5, 3)`,
        [quiz2Id]
      );
    }

    console.log('Ethiopian curriculum successfully seeded!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedEthiopianCurriculum();
