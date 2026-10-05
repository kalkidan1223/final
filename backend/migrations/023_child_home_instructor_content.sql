-- ============================================================================
-- Migration 023: Instructor-driven content for the child portal
-- ----------------------------------------------------------------------------
-- Goal: the age 5-9 child home must be a VIEW over content the instructor has
-- already published, never a hardcoded page. This migration adds:
--
--   1. REFERENCE DATA (admin-editable, seeded once)
--        - fidel_letters          the Ge'ez syllabary
--        - geez_numerals          the Ethiopic numeral system
--        - picture_words          everyday Amharic words paired with a picture
--        - encouragement_phrases  the praise a child hears after finishing
--      These are the writing system and the everyday vocabulary of the
--      country, NOT curriculum. An instructor chooses from them; an admin
--      corrects them. Nobody types out 26 letters x 7 vowel orders by hand.
--
--   2. HOME PINS (instructor-authored)
--        - home_pins  which published resource is surfaced on the child home
--                    for a given age group, in the instructor's order.
--      This is the whole "home builder": a pinned list, not a page composer.
--
--   3. ACTIVITY CONTENT
--        activities.activity_config (JSONB, added in migration 018) is reused to
--        hold the letters / numbers / picture pairs that a practice game
--        renders. No new table is needed for game content.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. FIDEL LETTERS  (the Ge'ez syllabary: 26 base characters, 7 orders each)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fidel_letters (
    id              BIGSERIAL PRIMARY KEY,
    base_char       VARCHAR(8)  NOT NULL UNIQUE,   -- e.g. ሀ
    sound           VARCHAR(30) NOT NULL,         -- romanised sound, e.g. 'ha'
    syllables       TEXT[]      NOT NULL,         -- the 7 orders, e.g. {ሀ,ሁ,ሂ,ሃ,ሄ,ህ,ሆ}
    teaching_order  INT         NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (cardinality(syllables) = 7)
);
CREATE INDEX IF NOT EXISTS idx_fidel_letters_order ON fidel_letters (teaching_order);

COMMENT ON TABLE fidel_letters IS
  'Reference data: the Ge''ez syllabary used in every Ethiopian school. Admin-editable; instructors pick from it, they do not re-type it.';

-- ----------------------------------------------------------------------------
-- 2. GEEZ NUMERALS  (the Ethiopic numerals taught from Grade 1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geez_numerals (
    id              BIGSERIAL PRIMARY KEY,
    value           INT         NOT NULL UNIQUE,  -- 1, 2, 3 ...
    glyph           VARCHAR(8)  NOT NULL UNIQUE,  -- ፩, ፪, ፫ ...
    sound           VARCHAR(30) NOT NULL,         -- romanised name, e.g. 'and'
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (value > 0)
);
CREATE INDEX IF NOT EXISTS idx_geeZ_numerals_value ON geez_numerals (value);

-- ----------------------------------------------------------------------------
-- 3. PICTURE WORDS  (everyday Amharic words a child can look at and hear)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS picture_words (
    id              BIGSERIAL PRIMARY KEY,
    word            VARCHAR(100) NOT NULL UNIQUE,
    english         VARCHAR(100),
    emoji           VARCHAR(16),                  -- fallback picture, works offline
    image_url       TEXT,                        -- optional uploaded picture
    category        VARCHAR(30)  NOT NULL DEFAULT 'general',
    -- A letter example: which fidel does this word show the child?
    example_for_letter VARCHAR(8),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_picture_words_category ON picture_words (category);
CREATE INDEX IF NOT EXISTS idx_picture_words_letter ON picture_words (example_for_letter);

COMMENT ON COLUMN picture_words.example_for_letter IS
  'Set when this word is the example word for a fidel. That is how a Grade 1 child meets a letter: the character is always shown inside a word they already know.';

-- ----------------------------------------------------------------------------
-- 4. ENCOURAGEMENT PHRASES  (spoken and shown after a child finishes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encouragement_phrases (
    id              BIGSERIAL PRIMARY KEY,
    text            VARCHAR(200) NOT NULL,
    english         VARCHAR(200),
    emoji           VARCHAR(16),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. HOME PINS  (what the instructor surfaces on the child home, and in what order)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS home_pins (
    id              BIGSERIAL PRIMARY KEY,
    age_group_id    INT         NOT NULL REFERENCES age_groups(id) ON DELETE CASCADE,
    resource_type   VARCHAR(20) NOT NULL,
    resource_id     BIGINT      NOT NULL,
    display_order   INT         NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    pinned_by       BIGINT REFERENCES instructors(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (age_group_id, resource_type, resource_id),
    CHECK (resource_type IN ('activity', 'quiz', 'video', 'material', 'lesson'))
);
CREATE INDEX IF NOT EXISTS idx_home_pins_age_group ON home_pins (age_group_id, display_order);

COMMENT ON TABLE home_pins IS
  'The child home is a view over published course content. An instructor pins up to a handful of activities per age group; the child sees those, in this order. No separate page builder.';

-- =============================================================================
-- SEED DATA
-- The Ge'ez syllabary. Order follows the Ethiopian primer: the first eight
-- (ሀ ለ ሐ መ ረ ሰ ሸ ቀ) are introduced before the rest.
-- =============================================================================
INSERT INTO fidel_letters (base_char, sound, syllables, teaching_order) VALUES
  ('ሀ', 'ha',   ARRAY['ሀ','ሁ','ሂ','ሃ','ሄ','ህ','ሆ'],  1),
  ('ለ', 'la',   ARRAY['ለ','ሉ','ሊ','ላ','ሌ','ል','ሎ'],  2),
  ('ሐ', 'ḥa',   ARRAY['ሐ','ሑ','ሒ','ሓ','ሔ','ሕ','ሖ'],  3),
  ('መ', 'ma',   ARRAY['መ','ሙ','ሚ','ማ','ሜ','ም','ሞ'],  4),
  ('ረ', 'ra',   ARRAY['ረ','ሩ','ሪ','ራ','ሬ','ር','ሮ'],  5),
  ('ሰ', 'sa',   ARRAY['ሰ','ሱ','ሲ','ሳ','ሴ','ስ','ሶ'],  6),
  ('ሸ', 'ša',  ARRAY['ሸ','ሹ','ሺ','ሻ','ሼ','ሽ','ሾ'],  7),
  ('ቀ', 'qa',   ARRAY['ቀ','ቁ','ቂ','ቃ','ቄ','ቅ','ቆ'],  8),
  ('ነ', 'na',   ARRAY['ነ','ኑ','ኒ','ና','ኔ','ን','ኖ'],  9),
  ('ኘ', 'ña',   ARRAY['ኘ','ኙ','ኚ','ኛ','ኜ','ኝ','ኞ'], 10),
  ('ዐ', 'ʾa',   ARRAY['ዐ','ዑ','ዒ','ዓ','ዔ','ዕ','ዖ'], 11),
  ('ሠ', 'ṣa',   ARRAY['ሠ','ሡ','ሢ','ሣ','ሤ','ሥ','ሦ'], 12),
  ('ተ', 'ta',   ARRAY['ተ','ቱ','ቲ','ታ','ቴ','ት','ቶ'], 13),
  ('ጸ', 'ča',   ARRAY['ጸ','ጹ','ጺ','ጻ','ጼ','ጽ','ጾ'], 14),
  ('ዘ', 'za',   ARRAY['ዘ','ዙ','ዚ','ዛ','ዜ','ዝ','ዞ'], 15),
  ('ዠ', 'ža',   ARRAY['ዠ','ዡ','ዢ','ዣ','ዤ','ዥ','ዦ'], 16),
  ('በ', 'ba',   ARRAY['በ','ቡ','ቢ','ባ','ቤ','ብ','ቦ'], 17),
  ('ቨ', 'va',   ARRAY['ቨ','ቩ','ቪ','ቫ','ቬ','ቭ','ቮ'], 18),
  ('ቸ', 'ča',   ARRAY['ቸ','ቹ','ቺ','ቻ','ቼ','ች','ቾ'], 19),
  ('ፈ', 'fä',   ARRAY['ፈ','ፉ','ፊ','ፋ','ፌ','ፍ','ፎ'], 20),
  ('ጠ', 'ṭa',   ARRAY['ጠ','ጡ','ጢ','ጣ','ጤ','ጥ','ጦ'], 21),
  ('ድ', 'da',   ARRAY['ድ','ዶ','ዷ','ዸ','ዹ','ዺ','ዻ'], 22),
  ('ጭ', 'č̣a',  ARRAY['ጭ','ጮ','ጯ','ጰ','ጱ','ጲ','ጳ'], 23),
  ('ጅ', 'ga',   ARRAY['ጅ','ጆ','ጇ','ገ','ጉ','ጊ','ጋ'], 24)
ON CONFLICT (base_char) DO UPDATE
  SET sound = EXCLUDED.sound,
      syllables = EXCLUDED.syllables,
      teaching_order = EXCLUDED.teaching_order;

-- The Ethiopic numerals a Grade 1 child learns first.
INSERT INTO geez_numerals (value, glyph, sound) VALUES
  (1, '፩', 'and'),  (2, '፪', 'honi'),   (3, '፫', 'soot'),  (4, '፬', 'ar'),    (5, '፭', 'amm'),
  (6, '፮', 'andda'),(7, '፯', 'ehun'),   (8, '፰', 'sim'),   (9, '፱', 'ass'),   (10, '፲', 'assere')
ON CONFLICT (value) DO UPDATE
  SET glyph = EXCLUDED.glyph, sound = EXCLUDED.sound;

-- Everyday Ethiopian words. A child who cannot read still recognises the
-- picture and hears the word, which is the whole point for ages 5-9.
INSERT INTO picture_words (word, english, emoji, category, example_for_letter) VALUES
  ('ሀውሥ',   'sun',         '☀️', 'nature',   'ሀ'),
  ('ልጫ',    'milk',        '🥛', 'food',     'ለ'),
  ('መጽሐፍ',  'book',        '📕', 'school',   'መ'),
  ('ርንጅ',   'orange',      '🍊', 'food',     'ረ'),
  ('ሰው',    'person',      '🧑', 'people',   'ሰ'),
  ('ሽን',    'teapot',      '🫖', 'home',     'ሸ'),
  ('ቁልፍ',   'key',         '🔑', 'home',     'ቀ'),
  ('ነፃት',   'freedom',     '🕊️', 'values',   'ነ'),
  ('ኘውል',   'star',        '⭐', 'nature',   'ኘ'),
  ('አማርኛ',  'Amharic',     '🇪🇹', 'language', 'ዐ'),
  ('ሠረጥ',   'market',      '🛒', 'places',   'ሠ'),
  ('ተማሪ',   'student',     '🧒', 'school',   'ተ'),
  ('ዘውላ',   'twin',        '👯', 'people',   'ዘ'),
  ('ዠባ',    'pupa',        '🦋', 'nature',   'ዠ'),
  ('በርታ',   'bread',       '🥞', 'food',     'በ'),
  ('ቨንዎት',  'window',      '🪟', 'home',     'ቨ'),
  ('ቸር',    'well',        '🕳️', 'places',   'ቸ'),
  ('ፋይል',   'file',        '📁', 'school',   'ፈ'),
  ('ጠረጥ',   'abdomen',     '🍽️', 'body',     'ጠ'),
  ('ድር',    'milk',        '🍼', 'food',     'ድ'),
  ('ጅማት',   'tomato',      '🍅', 'food',     'ጅ'),
  ('ጫካ',    'tree',        '🌳', 'nature',   NULL),
  ('ጎመን',   'goat',        '🐐', 'animals',  NULL),
  ('እንቁላል', 'rooster',     '🐓', 'animals',  NULL),
  ('ድመት',   'coffee',      '☕', 'food',     NULL),
  ('ቡና',    'coffee plant','🌱', 'nature',   NULL),
  ('አበባ',   'butterfly',   '🦋', 'animals',  NULL),
  ('መጨለሻ',  'bread',       '🥞', 'food',     NULL),
  ('እግር',    'foot',        '🦶', 'body',     NULL),
  ('ምድጃ',   'chalk',       '🖍️', 'school',   NULL),
  ('ትምህር',  'teacher',     '👩‍🏫', 'people',   NULL),
  ('ክፍል',    'classroom',   '🏫', 'school',   NULL),
  ('ድልድ',   'pencil',      '✏️', 'school',   NULL),
  ('ሰላም',   'hello',       '👋', 'greetings',NULL),
  ('አመሰግናለሁ', 'thank you', '🙏', 'greetings',NULL)
ON CONFLICT (word) DO UPDATE
  SET english = EXCLUDED.english,
      emoji = EXCLUDED.emoji,
      category = EXCLUDED.category,
      example_for_letter = EXCLUDED.example_for_letter;

-- The words a child hears after finishing something. Warm, never numeric.
INSERT INTO encouragement_phrases (text, english, emoji)
SELECT v.text, v.english, v.emoji
FROM (VALUES
  ('በጣም ጥሩ!',        'Very good!',      '🌟'),
  ('አንች! በጣም ቻለኝ!',  'Wow! You did it!', '🎉'),
  ('በጣም ጥሩ ልክ!',    'Excellent work!', '👏'),
  ('እንኳን ደስ አለህ!',    'Congratulations!','🏆'),
  ('ቀጥልህ ጥሩ ሥራ ነህ!', 'Keep up the good work!', '💪')
) AS v(text, english, emoji)
WHERE NOT EXISTS (SELECT 1 FROM encouragement_phrases);

COMMIT;
