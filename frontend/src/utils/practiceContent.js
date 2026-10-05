/**
 * Practice activity content contract
 * ==================================
 *
 * The three practice games (trace a letter, count, match a letter to a word)
 * are RENDERERS, not content. Everything they show comes from the instructor,
 * stored in `activities.activity_config` as JSONB.
 *
 * An instructor builds the content in the ActivityBuilder, which reads the
 * seeded reference tables (fidel letters, picture words, Ge'ez numerals) so
 * they pick from them rather than re-typing the Ethiopian writing system.
 * A child then plays exactly what their teacher set, and nothing else.
 *
 * This file is the shared vocabulary between the two sides. It is PRODUCT
 * code (the shape of the data), never CONTENT.
 */

// ----------------------------------------------------------------------------
// Which activity types are rendered by a self-practice game, and what each
// game needs before it can run.
const PRACTICE_ACTIVITY_TYPES = ['letter_tracing', 'counting', 'matching'];

export const PRACTICE_TYPE_META = {
  letter_tracing: {
    label: 'Letter tracing',
    amharic: 'ፊደል ጻፍ',
    emoji: 'ሀ',
    tileClass: 'ring-emerald-400',
    tileBg: 'from-emerald-50 to-teal-100',
    tileText: 'text-emerald-900',
    tileChip: 'bg-emerald-600',
  },
  counting: {
    label: 'Counting',
    amharic: 'ቁጥር ተቁጠር',
    emoji: '፩',
    tileClass: 'ring-amber-400',
    tileBg: 'from-amber-50 to-orange-100',
    tileText: 'text-amber-950',
    tileChip: 'bg-amber-600',
  },
  matching: {
    label: 'Matching',
    amharic: 'ስዕል አዛምድ',
    emoji: '🧩',
    tileClass: 'ring-sky-400',
    tileBg: 'from-sky-50 to-blue-100',
    tileText: 'text-sky-950',
    tileChip: 'bg-sky-600',
  },
};

/** Non-game activity types still get a tile; they open the normal lesson flow. */
const GENERIC_TILE = {
  label: 'Activity',
  amharic: 'ሥራ',
  emoji: '🎯',
  tileClass: 'ring-violet-400',
  tileBg: 'from-violet-50 to-purple-100',
  tileText: 'text-violet-950',
  tileChip: 'bg-violet-600',
};

/**
 * Look up the visual treatment for a pinned resource.
 * A practice game gets its recognisable look; anything else gets a calm tile.
 */
export function tileMetaFor(pin) {
  const kind = pin.kind || pin.activity_type;
  if (PRACTICE_ACTIVITY_TYPES.includes(kind)) {
    return PRACTICE_TYPE_META[kind];
  }
  if (kind === 'quiz') {
    return { ...GENERIC_TILE, label: 'Quiz', amharic: 'ፈተና', emoji: '✨', tileClass: 'ring-rose-400', tileBg: 'from-rose-50 to-pink-100', tileText: 'text-rose-950', tileChip: 'bg-rose-600' };
  }
  if (kind === 'video') {
    return { ...GENERIC_TILE, label: 'Video', amharic: 'ቪዲዮ', emoji: '🎬', tileClass: 'ring-slate-400', tileBg: 'from-slate-50 to-slate-200', tileText: 'text-slate-900', tileChip: 'bg-slate-700' };
  }
  if (kind === 'material') {
    return { ...GENERIC_TILE, label: 'Material', amharic: 'መጽሐፍ', emoji: '📄', tileClass: 'ring-indigo-400', tileBg: 'from-indigo-50 to-blue-100', tileText: 'text-indigo-950', tileChip: 'bg-indigo-600' };
  }
  if (kind === 'lesson') {
    return { ...GENERIC_TILE, label: 'Lesson', amharic: 'ትምህርት', emoji: '📖', tileClass: 'ring-amber-500', tileBg: 'from-amber-100 to-orange-200', tileText: 'text-amber-950', tileChip: 'bg-amber-700' };
  }
  return GENERIC_TILE;
}

// ----------------------------------------------------------------------------
// NORMALISING THE INSTRUCTOR'S CONTENT
// ----------------------------------------------------------------------------
// A teacher's saved config is whatever they typed in the builder. These
// functions turn it into the exact shape a renderer needs, and fill sensible
// gaps from the reference tables so a half-finished activity still runs
// rather than showing an empty screen to a six-year-old.

/**
 * Letter tracing: an array of { base, sound, syllables[], word, emoji }.
 * Falls back to the reference fidel letters, and pairs each with its example
 * word from the picture-word table.
 */
export function normalizeLetters(config, reference = {}) {
  const fromConfig = Array.isArray(config?.letters) ? config.letters : [];
  const cleaned = fromConfig
    .filter((l) => l && typeof l.base === 'string' && l.base.trim())
    .map((l) => {
      const base = l.base.trim();
      const refLetter = (reference.fidel_letters || []).find((f) => f.base_char === base);
      const refWord = (reference.picture_words || []).find(
        (w) => w.example_for_letter === base
      );
      return {
        base,
        sound: l.sound || refLetter?.sound || '',
        // The 7 vowel orders come from the reference table, never re-typed.
        syllables: Array.isArray(l.syllables) && l.syllables.length === 7
          ? l.syllables
          : refLetter?.syllables || [],
        word: l.word || refWord?.word || base,
        emoji: l.emoji || refWord?.emoji || '🔤',
        english: l.english || refWord?.english || '',
      };
    });

  if (cleaned.length > 0) return cleaned;

  // Nothing chosen yet: start from the letters the Ethiopian primer teaches first.
  return (reference.fidel_letters || []).slice(0, 8).map((f) => {
    const refWord = (reference.picture_words || []).find((w) => w.example_for_letter === f.base_char);
    return {
      base: f.base_char,
      sound: f.sound,
      syllables: f.syllables || [],
      word: refWord?.word || f.base_char,
      emoji: refWord?.emoji || '🔤',
      english: refWord?.english || '',
    };
  });
}

/** How many vowel orders this tracing activity teaches. Default all 7. */
export function vowelOrderCount(config) {
  const n = Number(config?.vowel_order_count);
  if (!Number.isFinite(n)) return 7;
  return Math.min(7, Math.max(1, n));
}

/**
 * Counting: which numeral system, the range, and what objects to count.
 * The Ge'ez numerals come from the reference table so the glyphs are correct.
 */
export function normalizeCounting(config, reference = {}) {
  const numerals = reference.geez_numerals || [];
  const glyphFor = (value) => numerals.find((n) => n.value === value)?.glyph || String(value);

  const min = Math.max(1, Number(config?.min) || 1);
  const max = Math.max(min, Number(config?.max) || 10);

  const objects = (Array.isArray(config?.objects) ? config.objects : [])
    .filter((o) => o && (o.emoji || o.image_url))
    .map((o) => ({ emoji: o.emoji || '⭐', word: o.word || '', image_url: o.image_url || null }));

  const fallbackObjects = (reference.picture_words || [])
    .filter((w) => w.emoji)
    .slice(0, 6)
    .map((w) => ({ emoji: w.emoji, word: w.word, image_url: w.image_url || null }));

  return {
    min,
    max,
    // A short session. Six-year-olds lose focus long before an adult would.
    rounds: Math.min(10, Math.max(3, Number(config?.rounds) || 5)),
    numeralSystem: config?.numeral_system === 'arabic' ? 'arabic' : 'geez',
    glyphFor,
    objects: objects.length > 0 ? objects : fallbackObjects,
  };
}

/**
 * Matching: pairs of { letter, word, emoji, image_url }.
 * The child taps the character, then the picture it belongs to.
 */
export function normalizePairs(config, reference = {}) {
  const fromConfig = Array.isArray(config?.pairs) ? config.pairs : [];
  const cleaned = fromConfig
    .filter((p) => p && p.left && p.right)
    .map((p) => {
      const refWord = (reference.picture_words || []).find((w) => w.word === p.right);
      return {
        letter: p.left,
        word: p.right,
        emoji: p.emoji || refWord?.emoji || '🖼️',
        image_url: p.image_url || refWord?.image_url || null,
        english: refWord?.english || '',
      };
    });

  if (cleaned.length > 0) return cleaned;

  // Nothing chosen: pair the first letters with their own example words, so a
  // freshly published activity is playable straight away.
  return (reference.fidel_letters || []).slice(0, 5).map((f) => {
    const refWord = (reference.picture_words || []).find((w) => w.example_for_letter === f.base_char);
    if (!refWord) return null;
    return {
      letter: f.base_char,
      word: refWord.word,
      emoji: refWord.emoji,
      image_url: refWord.image_url || null,
      english: refWord.english || '',
    };
  }).filter(Boolean);
}

/**
 * The word strip on the child home: the everyday words the child's own
 * teacher has set, taken from the pinned activities. Falls back to the
 * reference greetings so the strip is never blank.
 */
export function wordsFromPins(pins, reference = {}, limit = 8) {
  const words = [];

  for (const pin of pins || []) {
    const config = pin.activity_config;
    if (!config) continue;

    for (const letter of normalizeLetters(config, reference)) {
      if (letter.word) words.push({ word: letter.word, english: letter.english, emoji: letter.emoji });
    }
    for (const pair of normalizePairs(config, reference)) {
      if (pair.word) words.push({ word: pair.word, english: pair.english, emoji: pair.emoji });
    }
    for (const object of normalizeCounting(config, reference).objects) {
      if (object.word) words.push({ word: object.word, english: '', emoji: object.emoji });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const w of words) {
    if (seen.has(w.word)) continue;
    seen.add(w.word);
    unique.push(w);
    if (unique.length >= limit) break;
  }
  if (unique.length > 0) return unique;

  return (reference.picture_words || [])
    .filter((w) => w.category === 'greetings')
    .slice(0, limit)
    .map((w) => ({ word: w.word, english: w.english, emoji: w.emoji }));
}
