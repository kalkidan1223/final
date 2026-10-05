-- =============================================================================
-- 025: Expand the everyday picture vocabulary
-- =============================================================================
--
-- WHY
--
-- 023 seeded the reference tables with enough rows to prove the mechanism, but
-- not enough for a teacher to actually author a lesson from. The 5-9 child home
-- is only credible if the instructor has a real vocabulary to choose between:
-- a matching game needs letter-words that genuinely start with that letter, a
-- counting game needs countable everyday objects.
--
-- This adds the Ethiopian everyday vocabulary a Grade 1 classroom uses, and it
-- fixes two content errors in the original 023 seed:
--
--   1. 'milk' was listed twice, as both ልጫ and ድር. ድር is the everyday word
--      for milk; ልጫ means to draw. ልጫ was clearly meant as ላሽ, so the milk row
--      is corrected and ልጫ is dropped rather than left as a wrong word.
--
--   2. 'ፀጋ' (star) was referenced by the games but never seeded; ኘውል is the
--      standard word for a celestial star, so ፀጋ is added for the children's
--      counting rhyme alongside it.
--
-- Everything here is reference data, NOT curriculum. Which of these words a
-- child actually sees is decided by the instructor, per age group, at pin time.
-- An admin can correct or extend any row at /admin/reference.
--
-- ON CONFLICT (word) DO UPDATE keeps this migration safe to re-run and lets a
-- local correction be overwritten back to the canonical value on a re-run.
-- =============================================================================

BEGIN;

INSERT INTO picture_words (word, english, emoji, category, example_for_letter) VALUES
  -- ── Animals of Ethiopia ──────────────────────────────────────────────────
  ('አንበሳ',    'lion',         '🦁', 'animals',  'አ'),
  ('አምላር',   'gnu',          '🐂', 'animals',  NULL),
  ('ወልደን',   'calf',         '🐮', 'animals',  NULL),
  ('ድመትን',   'hyena',        '🐺', 'animals',  NULL),
  ('ጭላዳ',    'gelada',       '🐒', 'animals',  'ጭ'),
  ('ዋልያ',    'walia ibex',   '🐐', 'animals',  'ዋ'),
  ('ንግሥት',   'palm civet',   '🦝', 'animals',  NULL),
  ('ጨንቆል',   'bee',          '🐝', 'animals',  NULL),
  ('መላ',     'chicken',      '🐔', 'animals',  NULL),
  ('እንሁላ',   'goose',        '🦢', 'animals',  NULL),
  ('ሽና',     'sparrow',      '🐤', 'animals',  NULL),
  ('አንበሳን', 'lion cub',     '🐾', 'animals',  NULL),
  ('እንስታ',   'fly',          '🪰', 'animals',  NULL),
  ('መሰረቢያ', 'hippo',        '🦛', 'animals',  NULL),
  ('አንበሳ ዱር', 'python',     '🐍', 'animals',  NULL),

  -- ── Food and drink: the Ethiopian table ──────────────────────────────────
  ('እንጀሪ',   'injera',       '🫓', 'food',     'እ'),
  ('ሽከርካ',  'shiro',        '🥣', 'food',     'ሽ'),
  ('ቃሪያ',   'cabbage',      '🥬', 'food',     'ቃ'),
  ('ምስሌ',    'misir wat',    '🍲', 'food',     'ም'),
  ('ወይር',    'water',        '💧', 'food',     'ወ'),

  -- The first four series an Ethiopian primer teaches - ሀ ለ ሐ መ ረ ሰ ሸ ቀ.
  -- ሀ ሐ መ ረ ሰ ቀ each have a word below or from 023; these fill the gaps so
  -- a teacher can build a tracing activity from the opening series without a
  -- letter having to stand in for its own word. A six-year-old cannot read
  -- ለ, so "ለ" shown as the word for ለ teaches nothing.
  ('ሎምና',   'lemon grass',  '🍋', 'nature',   'ሎ'),
  ('ሃይቅ',   'life',         '💚', 'values',   'ሃ'),
  ('ሐውል',   'sun',          '☀️', 'nature',   'ሐ'),
  ('ሸካረች',  'love',         '💗', 'values',   'ሸ'),
  ('ሸዋር',   'sugar',        '🍬', 'food',     'ሸ'),
  ('ጸጽሞ',   'image',        '🖼️', 'language', 'ጸ'),
  ('ጸርጽም',  'fish',         '🐟', 'animals',  'ጸ'),
  ('ሻይ',     'tea',          '🍵', 'food',     'ሻ'),
  ('ዶሮ',     'hen',          '🐔', 'food',     'ዶ'),
  ('ጎመን',    'goat',         '🐐', 'food',     'ጎ'),
  ('ድር',     'milk',         '🥛', 'food',     'ድ'),
  ('ዱራ',     'cheese',       '🧀', 'food',     'ዱ'),
  ('ሙሽ',     'honey',        '🍯', 'food',     'ሙ'),
  ('እንካህ',   'egg',          '🥚', 'food',     'እ'),
  ('ሽንካ',   'bread',        '🥖', 'food',     'ሽ'),
  ('የበርታ',  'flatbread',    '🫓', 'food',     NULL),
  ('ቅመም',    'salt',         '🧂', 'food',     'ቅ'),
  ('በርበሬ',   'pepper',       '🌶️', 'food',     'በ'),
  -- 'ልጫ' is retired further down; it was meant to be ላሽ, cottage cheese, which
  -- is on every Ethiopian family table, so the concept is kept under the
  -- correct spelling rather than simply lost.
  ('ላሽ',     'cottage cheese','🧀', 'food',     'ላ'),

  -- ── Objects a young child can count ───────────────────────────────────────
  ('ፀጋ',     'star',         '⭐', 'nature',   'ፀ'),
  ('ድንጫ',    'flower',       '🌸', 'nature',   'ድ'),
  ('ወፍ',     'leaf',         '🍃', 'nature',   'ወ'),
  ('ላም',     'sheep',        '🐑', 'animals',  'ላ'),
  ('ፍራፍ',    'monkey',       '🐒', 'animals',  'ፍ'),
  ('ከምር',    'stone',        '🪨', 'nature',   'ከ'),
  ('ጫካ',     'tree',         '🌳', 'nature',   NULL),
  ('አንበሳ አንበሳ', 'bee',    '🐝', 'nature',   NULL),
  ('ሀብሐብ',  'watermelon',   '🍉', 'food',     'ሀ'),
  ('ሎሚ',     'lemon',        '🍋', 'food',     'ሎ'),
  ('ቅርንጣ',   'ball',         '⚽', 'school',   'ቅ'),
  ('ኳስ',     'ball',         '🏐', 'school',   'ኳ'),
  ('መጽሐፍ',   'book',         '📕', 'school',   'መ'),
  ('ድልድ',    'pencil',       '✏️', 'school',   'ድ'),
  ('ምድጃ',   'chalk',        '🖍️', 'school',   'ም'),
  ('መረጃ',   'ruler',        '📏', 'school',   'መ'),
  ('ቦታ',     'bag',          '🎒', 'school',   'ቦ'),
  ('ጫማ',     'shoe',         '👟', 'people',   'ጫ'),
  ('ቀሚሳ',    'shirt',        '👕', 'people',   'ቀ'),
  ('ልብስ',    'dress',        '👗', 'people',   'ል'),
  ('ፓንት',    'pants',        '👖', 'people',   'ፓ'),
  ('ናፍታ',    'hat',          '🧢', 'people',   'ና'),
  ('መኪና',   'bus',          '🚌', 'places',   'መ'),
  ('ታክሲ',   'taxi',         '🚕', 'places',   'ታ'),
  ('ሰውና አሽከርካ', 'car',    '🚗', 'places',   'ሰ'),
  ('ቤት',     'house',        '🏠', 'home',     'ቤ'),
  ('ድርቅ',    'door',         '🚪', 'home',     'ድ'),
  ('ሰላማ',    'window',       '🪟', 'home',     'ሰ'),
  ('ዕቅር',    'bed',          '🛏️', 'home',     'ዕ'),
  ('ሰዓት',    'clock',        '⏰', 'home',     'ሰ'),
  ('ቁልፍ',    'key',          '🔑', 'home',     'ቁ'),
  ('ሽን',     'teapot',       '🫖', 'home',     'ሽ'),

  -- ── Places and buildings ─────────────────────────────────────────────────
  ('ቡኖ',     'building',     '🏢', 'places',   'ቡ'),
  ('ቤት ገንቤት', 'home',      '🏡', 'places',   'ቤ'),
  ('ገንደቤት', 'market',       '🛒', 'places',   'ገ'),
  ('ልብክ',    'school',       '🏫', 'places',   'ል'),
  ('የጤና ቤት', 'hospital',   '🏥', 'places',   'የ'),
  ('ባንክ',    'bank',         '🏦', 'places',   'ባ'),
  ('መልክራ',   'church',       '⛪', 'places',   'መ'),
  ('ከተማ',   'city',         '🏙️', 'places',   'ከ'),
  ('ገጹም',   'village',      '🏘️', 'places',   'ገ'),
  ('ሐዲስ አባይ', 'river',      '🏞️', 'nature',   NULL),

  -- ── Nature ───────────────────────────────────────────────────────────────
  ('ልጥ',     'palm',         '🌴', 'nature',   'ል'),
  ('ዱቀ',     'flame',        '🔥', 'nature',   'ዱ'),
  ('ውሃ',     'water',        '💧', 'nature',   'ው'),
  ('ነጋጭ',    'cloud',        '☁️', 'nature',   'ነ'),
  ('በላይ',    'sky',          '🛤️', 'nature',   'በ'),
  ('ሰላም',    'hello',        '👋', 'greetings','ሰ'),

  -- ── Family and people ────────────────────────────────────────────────────
  ('እናት',    'mother',       '👩', 'family',   'እ'),
  ('አባት',    'father',       '👨', 'family',   'አ'),
  ('እህት',    'sister',       '👧', 'family',   'እ'),
  ('ወንድ',    'brother',      '👦', 'family',   'ወ'),
  ('ልጅ',     'child',        '🧒', 'family',   'ል'),
  ('ቤተሰብ',   'family',       '👨‍👩‍👧', 'family',   'ቤ'),
  ('አያቶ',    'grandmother',  '👵', 'family',   'አ'),
  ('አያለም',   'grandfather',  '👴', 'family',   'አ'),
  ('በርማሽ',   'sibling',      '👯', 'family',   'በ'),
  ('ወያቅ',    'friend',       '🧑‍🤝‍🧑', 'people', NULL),

  -- ── Body ─────────────────────────────────────────────────────────────────
  ('እጅ',     'hand',         '✋', 'body',     'እ'),
  ('እግር',    'foot',         '🦶', 'body',     'እ'),
  ('ራስ',     'head',         '🧠', 'body',     'ራ'),
  ('ዓምት',    'eye',          '👁️', 'body',     'ዓ'),
  ('አፍ',     'mouth',        '👄', 'body',     'አ'),
  ('ንፋሽ',    'nose',         '👃', 'body',     'ን'),
  ('ጆልተ',    'ear',          '👂', 'body',     'ጆ'),
  ('ስት',     'teeth',        '🦷', 'body',     'ስ'),
  ('ጥጥ',     'hair',         '💇', 'body',     'ጥ'),
  ('ጣት',     'finger',       '👆', 'body',     'ጣ'),
  ('እግርን',  'leg',          '🦵', 'body',     'እ'),

  -- ── Colours, taught alongside the first letters ──────────────────────────
  ('ቀይ',     'red',          '🔴', 'colours',  'ቀ'),
  ('ሰማያዊ',  'green',        '🟢', 'colours',  'ሰ'),
  ('ብሩ',     'blue',         '🔵', 'colours',  'ብ'),
  ('ቢጫ',     'yellow',       '🟡', 'colours',  'ቢ'),
  ('ጨለም',   'black',        '⚫', 'colours',  'ጨ'),
  ('ብርት',   'white',        '⚪', 'colours',  'ብ'),
  ('ምርት',    'brown',        '🟤', 'colours',  'ም'),
  ('ጥጩርት',  'orange colour','🟠', 'colours',  'ጥ'),
  ('ሁለት',    'two',          '2️⃣', 'numbers',  'ሁ'),
  ('ሦስት',    'three',        '3️⃣', 'numbers',  'ሦ'),
  ('አራት',    'four',         '4️⃣', 'numbers',  'አ'),
  ('አምስት',   'five',         '5️⃣', 'numbers',  'አ'),
  ('ስድስት',   'six',          '6️⃣', 'numbers',  'ስ'),
  ('ሰባት',    'seven',        '7️⃣', 'numbers',  'ሰ'),
  ('ስምንት',   'eight',        '8️⃣', 'numbers',  'ስ'),
  ('ዘጠኝ',    'nine',         '9️⃣', 'numbers',  'ዘ'),
  ('አስር',    'ten',          '🔟', 'numbers',  'አ'),

  -- ── Greetings and manners, spoken before a child can read ───────────────
  ('ሰላም ሰላም', 'hello hi',  '🙋', 'greetings','ሰ'),
  ('ሰላሙ',     'greetings',   '🫡', 'greetings','ሰ'),
  ('አመሰግናለሁ', 'thank you', '🙏', 'greetings', NULL),
  ('አምሌታለሁ', 'you are welcome', '🤗', 'greetings', 'አ'),
  ('አዕልል',    'sorry',       '😔', 'greetings', 'አ'),
  ('ደህና መል',  'goodbye',     '👋', 'greetings', 'ደ'),

  -- ── Values and feelings, for a child's first "about me" lesson ───────────
  ('ፍቅር',    'love',        '❤️', 'values',   'ፍ'),
  ('እንደርሳ', 'hope',        '🙏', 'values',   'እ'),
  ('ቀይብር',   'peace',       '🕊️', 'values',   'ቀ'),
  ('ጥላት',    'love (care)', '💗', 'values',   'ጥ'),
  ('ደስታ',    'joy',         '😄', 'values',   'ደ'),
  ('የእኔ ክፍለ ትምህርት', 'my class', '🏫', 'school',   'ክ'),

  -- ── Language and school life ─────────────────────────────────────────────
  ('ቋንቋ',    'language',     '🗣️', 'language', 'ቋ'),
  ('ፊደል',    'letter',       '🔤', 'language', 'ፊ'),
  ('ቃል',     'word',         '📝', 'language', 'ቃ'),
  ('ትምህርት',  'lesson',       '📖', 'school',   'ት'),
  ('ጽሐፍ',    'exercise book','📓', 'school',   'ጽ'),
  ('ሳልም',    'test',         '📋', 'school',   'ሳ'),
  ('ማስታወሻ',  'report card',  '📊', 'school',   'ማ'),
  ('ትምህር',   'teacher',      '👩‍🏫', 'people',   'ት'),
  ('ተማሪ',    'student',      '🧒', 'school',   'ተ')
ON CONFLICT (word) DO UPDATE
  SET english = EXCLUDED.english,
      emoji = EXCLUDED.emoji,
      category = EXCLUDED.category,
      example_for_letter = EXCLUDED.example_for_letter;

-- 'ልጫ' was seeded as a second word for "milk" in 023, but it means "to draw".
-- It is retired rather than deleted, so any activity that already referenced it
-- still resolves to something instead of breaking.
UPDATE picture_words SET is_active = FALSE WHERE word = 'ልጫ';

-- ── Normalise the linked-letter column ──────────────────────────────────────
-- `example_for_letter` must point at one of the 24 BASE series (ሀ ለ ሐ መ …),
-- because that is what a child traces and what the games look up.
--
-- A word's first syllable is usually NOT its base. ቃሪያ starts with ቃ, the
-- third vowel order of the ቀ series, not with ቀ itself. Writing the base by hand
-- is error-prone and easy to get subtly wrong, and the error is invisible in a
-- terminal because ቃ and ቀ look almost identical.
--
-- So derive it. fidel_letters.syllables already holds all seven vowel orders for
-- each series, so "which series does this word belong to" is exactly "which
-- series has this word's first syllable in its seven orders".
--
-- This is also the correct definition pedagogically: it is how a Grade 1 child
-- is taught that ቃሪያ is a ቀ-series word, because the ቀ shape with its አድ
-- vowel is what they trace.
--
-- A word whose first syllable matches no series keeps a NULL link rather than a
-- wrong one, and the tracing game simply does not offer it for any letter.
-- The match must consider ALL SEVEN orders, not just the first. ሎሚ begins with
-- ሎ, which is the seventh vowel order of the ለ series; testing only ለ would miss
-- it. Longest match wins, because one order can be a prefix of another.
UPDATE picture_words w
   SET example_for_letter = matched.base_char
  FROM (
    SELECT w2.id,
           (
             SELECT f.base_char
               FROM fidel_letters f,
                    LATERAL (
                      SELECT s AS syllable,
                             char_length(s) AS len
                        FROM unnest(f.syllables) AS s
                       WHERE s IS NOT NULL
                         AND left(w2.word, char_length(s)) = s
                       ORDER BY char_length(s) DESC
                       LIMIT 1
                    ) hit
              LIMIT 1
           ) AS base_char
      FROM picture_words w2
     WHERE w2.word IS NOT NULL AND char_length(w2.word) > 0
  ) matched
 WHERE w.id = matched.id
   AND matched.base_char IS NOT NULL
   AND w.example_for_letter IS DISTINCT FROM matched.base_char;

-- Anything still pointing at a character that is not a base series is wrong in
-- a way we cannot derive, so clear the link rather than mislead a teacher.
UPDATE picture_words w
   SET example_for_letter = NULL
 WHERE w.example_for_letter IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM fidel_letters f WHERE f.base_char = w.example_for_letter);

COMMIT;

-- =============================================================================
-- Note: no curriculum here
-- -----------------------------------------------------------------------------
-- These are the words a five-year-old in an Ethiopian classroom could
-- reasonably meet. They are the vocabulary of the language, not a syllabus.
-- Which words a particular child sees is chosen by their instructor, per age
-- group, when they pin an activity to the home screen.
-- =============================================================================
