/**
 * Child portal presentation helpers
 * ---------------------------------
 *
 * This file holds PRESENTATION only: the things that belong to the product
 * rather than to any one classroom.
 *
 * Curriculum content does NOT live here. The Ge'ez syllabary, the Ethiopic
 * numerals, the picture words and the encouragement phrases all come from the
 * database via /api/reference/early-learner-kit, because in a real deployment
 * the teacher decides what a child sees this week and the school admin
 * maintains the reference lists. See src/utils/practiceContent.js for the
 * shape of instructor-authored activity content.
 */

/**
 * A greeting that changes with the time of day.
 *
 * This is a fixed, warm opening line used on the landing screen - it is not
 * curriculum, and it is spoken before any lesson content exists. The words the
 * child actually learns are the ones their instructor set.
 */
export function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { amharic: 'እንደምን ነህ?', english: 'Good morning', emoji: '🌅' };
  if (hour < 18) return { amharic: 'አንተስን አደሩ?', english: 'Good afternoon', emoji: '☀️' };
  return { amharic: 'እንኳን አመሸህ!', english: 'Good evening', emoji: '🌙' };
}

/**
 * Pick a praise phrase for this moment.
 * `phrases` come from the encouragement_phrases reference table; the index
 * simply rotates through them so a child hears something different each time.
 */
export function pickPraise(phrases, index) {
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return { text: 'በጣም ጥሩ!', english: 'Very good!', emoji: '🌟' };
  }
  return phrases[Math.abs(index) % phrases.length];
}

/**
 * The seven Ge'ez vowel orders, shown on the tracing screen so a child can see
 * that one letter grows into seven sounds. The *letters* themselves are the
 * instructor's; this is the shape of the writing system.
 */
export const VOWEL_ORDERS = [
  { order: 1, name: 'አድ' },
  { order: 2, name: 'ኡ' },
  { order: 3, name: 'ኢ' },
  { order: 4, name: 'አ' },
  { order: 5, name: 'ኤ' },
  { order: 6, name: 'እ' },
  { order: 7, name: 'ኦ' },
];
