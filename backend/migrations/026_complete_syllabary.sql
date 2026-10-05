-- =============================================================================
-- 026: Complete the syllabary, and fix three malformed vocabulary rows
-- =============================================================================
--
-- WHY
--
-- Making the seed refuse to publish an impossible matching pair did its job: it
-- turned six silent content gaps into loud warnings. 53 of the 167 active
-- picture words had no base series, so no instructor could build a matching or
-- tracing game around them. 27 of those 53 began with አ or እ, the glottal "a"
-- series, which migration 023 never seeded. A child cannot trace አንበሳ if the
-- portal has never heard of አ.
--
-- The 24 series seeded by 023 are the primer's opening sequence. They are correct
-- as far as they go, but a Grade 1-2 child also meets ከ ኰ ወ ፀ ፐ and the second
-- ቀ series, and 40-odd everyday words begin with them.
--
-- WHAT IS ADDED, AND WHY ONLY THESE SEVEN
--
-- In the Ethiopic syllabary a series is seven vowel orders occupying seven
-- CONSECUTIVE code points starting at the base. That property holds for all 24
-- seeded rows, so the new rows are generated from it rather than transcribed by
-- eye — ባ and ጫ look like consonants but are the fourth order of በ and the
-- fourth of ጨ, and mistaking those for series is exactly the kind of error that
-- is invisible in a terminal.
--
-- Each candidate was then checked against every other, and several were REJECTED
-- because their seven-order runs overlap a series that is already seeded:
--
--   ደ  — its sixth and seventh orders (ድ ዶ) belong to the seeded ድ series
--   ዸ  — the whole series sits inside the seeded ድ series
--   ጀ  — its fifth and sixth orders belong to the seeded ጅ series
--   ገ  — the whole series sits inside the seeded ጅ series
--   ጨ  — its sixth and seventh orders belong to the seeded ጭ series
--   ጰ  — the whole series sits inside the seeded ጭ series
--
-- This is a genuine property of the Unicode block, not a gap in the data: it
-- assigns some syllables to two base series. The seeded rows already own those
-- characters, and adding the rival series would make the owner ambiguous — which
-- is precisely the ቃ/ቀ bug that migration 025's derivation exists to prevent. A
-- word that can only be reached through an ambiguous series is better left
-- unlinked and simply not offered for tracing than given a link that silently
-- points at the wrong series nine times in ten.
--
-- So nine words (ጫማ ጫካ ጨንቆል ጨለም ዱራ ዱቀ ደህና መል ደስታ ጎመን) stay unlinked by
-- design. The seed now drops them from matching games with a warning instead of
-- publishing a game a child cannot finish. An admin who wants them can add ጨ or
-- ደ at /admin/reference and de-activate the overlapping series first.
--
-- THE THREE VOCABULARY FIXES
--
-- These are authoring errors, not data limits, and they are worse than the
-- missing series because they are silently wrong in front of a child:
--
--   1. 'በርታ' was glossed "bread" 🥞. It means FRUIT. The table ended up with three
--      rows called bread and the real flatbread, እንጀሪ, sat beside them with no
--      series link. Corrected to fruit, which also drops the duplicate.
--
--   2. 'የበርታ' ("of the fruit") is a phrase, not a word — የ is the genitive
--      particle, and no series begins with it. It was also a fourth flatbread
--      row duplicating እንጀሪ. Retired.
--
--   3. 'የእኔ ክፍለ ትምህርት' ("of my class") is a possessive phrase duplicating
--      'ክፍል' / classroom, which is already in the table. Retired.
--
--   4. 'የጤና ቤት' ("of the health house") is a genuine, distinct word — a hospital
--      is worth teaching — so the genitive is dropped rather than the row.
--      ጤ is the fifth order of the seeded ጠ series, so it now links.
--
-- Like the earlier 023 and 025 rows, none of this is curriculum. It is the
-- vocabulary of the language, and which of it a given child sees is the
-- instructor's decision at pin time.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. The seven additional series
-- -----------------------------------------------------------------------------
-- teaching_order continues past the primer's 24. The order is for a teacher's
-- browsing convenience only; nothing in the app sorts a child-facing list by it.
INSERT INTO fidel_letters (base_char, sound, syllables, teaching_order) VALUES
  ('አ', 'ʾa',  ARRAY['አ','ኡ','ኢ','ኣ','ኤ','እ','ኦ'], 25),  -- the "a" series: አንበሳ, እንጀሪ
  ('ከ', 'kʾa', ARRAY['ከ','ኩ','ኪ','ካ','ኬ','ክ','ኮ'], 26),  -- ከምር, ክፍል
  ('ኰ', 'kʷa', ARRAY['ኰ','኱','ኲ','ኳ','ኴ','ኵ','኶'], 27),  -- ኳስ
  ('ወ', 'wa',  ARRAY['ወ','ዉ','ዊ','ዋ','ዌ','ው','ዎ'], 28),  -- ወይር, ወያቅ, ውሃ
  ('ፀ', 'ṣʾa', ARRAY['ፀ','ፁ','ፂ','ፃ','ፄ','ፅ','ፆ'], 29),  -- ፀጋ
  ('ፐ', 'pʰa', ARRAY['ፐ','ፑ','ፒ','ፓ','ፔ','ፕ','ፖ'], 30),  -- ፓንት
  ('ቈ', 'qʷa', ARRAY['ቈ','቉','ቊ','ቋ','ቌ','ቍ','቎'], 31)   -- ቋንቋ
ON CONFLICT (base_char) DO UPDATE
   SET sound          = EXCLUDED.sound,
       syllables      = EXCLUDED.syllables,
       teaching_order = EXCLUDED.teaching_order,
       is_active      = TRUE,
       updated_at     = now();

-- A guard, not a hope. If a future edit adds a series whose orders collide with an
-- existing one, the two rows would both claim the same characters and the games
-- would resolve them arbitrarily — the ቃ/ቀ failure again, this time in the
-- reference data rather than in a hand-written column. Refuse the migration.
DO $$
DECLARE
    clash TEXT;
BEGIN
    SELECT string_agg(format('%s and %s both claim %s', a.base_char, b.base_char, shared), '; ')
      INTO clash
      FROM fidel_letters a
      JOIN fidel_letters b
        ON b.base_char > a.base_char
      JOIN LATERAL (
        SELECT unnest(a.syllables) AS shared
         INTERSECT
         SELECT unnest(b.syllables)
      ) s ON TRUE
     WHERE a.is_active AND b.is_active;

    IF clash IS NOT NULL THEN
        RAISE EXCEPTION 'two active series share vowel orders: %', clash;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Correct the three malformed words
-- -----------------------------------------------------------------------------
-- በርታ is fruit, not bread. Setting example_for_letter is left to the derivation
-- below so there is exactly one place that decides a word's series.
UPDATE picture_words
   SET english  = 'fruit',
       emoji    = '🍎',
       category = 'food'
 WHERE word = 'በርታ';

-- The two phrases are retired rather than deleted, so any activity that already
-- referenced the old string still resolves to something instead of breaking.
UPDATE picture_words SET is_active = FALSE WHERE word IN ('የበርታ', 'የእኔ ክፍለ ትምህርት');

-- 'የጤና ቤት' → 'ጤና ቤት'. A hospital is worth teaching, so only the genitive goes.
UPDATE picture_words
   SET word = 'ጤና ቤት'
 WHERE word = 'የጤና ቤት'
   AND NOT EXISTS (SELECT 1 FROM picture_words p WHERE p.word = 'ጤና ቤት');

-- -----------------------------------------------------------------------------
-- 3. Re-derive example_for_letter
-- -----------------------------------------------------------------------------
-- Deliberately the same statement migration 025 uses, so the two can never drift
-- apart and disagree about which series a word belongs to. A word's first
-- syllable is usually not its base — ቃሪያ begins with ቃ, the third vowel order
-- of ቀ — and the games look up BASE series, so this has to be derived. All seven
-- orders are tested, not just the first, and the longest match wins.
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
                         AND f.is_active
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

-- Anything still pointing at a character that is not an active base series is
-- wrong in a way we cannot derive, so clear the link rather than mislead a teacher.
UPDATE picture_words w
   SET example_for_letter = NULL
 WHERE w.example_for_letter IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM fidel_letters f
      WHERE f.base_char = w.example_for_letter AND f.is_active
   );

COMMIT;

-- =============================================================================
-- Note: still no curriculum here
-- -----------------------------------------------------------------------------
-- This completes the writing system the portal can offer and removes three wrong
-- words. It does not decide what any child learns. The instructor still chooses
-- the activity, and the words inside it, at pin time.
-- =============================================================================
