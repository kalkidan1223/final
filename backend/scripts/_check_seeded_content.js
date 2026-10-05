// The seeded activities must satisfy the exact same contract the instructor
// builder produces, because the child games are renderers. This asserts that
// every published game activity has the content its renderer will look for.
const { query } = require('../src/config/db');

const GAMES = ['letter_tracing', 'counting', 'matching'];
let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`[${ok ? '  ok  ' : ' FAIL '}] ${label}${detail ? ` — ${detail}` : ''}`);
};

(async () => {
  const letters = (await query(
    'SELECT base_char, sound, syllables FROM fidel_letters WHERE is_active'
  )).rows;
  const lettersByChar = new Map(letters.map((l) => [l.base_char, l]));
  const words = (await query(
    'SELECT word, english, emoji FROM picture_words WHERE is_active'
  )).rows;
  const wordsByName = new Map(words.map((w) => [w.word, w]));

  const r = await query(
    `SELECT a.id, a.title, a.activity_type, a.status, a.age_group_id,
            c.title AS course_title, ag.name AS age_group_name,
            a.activity_config
     FROM activities a
     JOIN courses c ON c.id = a.course_id
     LEFT JOIN age_groups ag ON ag.id = a.age_group_id
     WHERE a.activity_type = ANY($1) AND a.status IN ('active','published')
     ORDER BY a.age_group_id, a.id`,
    [GAMES]
  );
  const acts = r.rows;
  console.log(`${acts.length} published game activities\n`);

  check('there is at least one of each game type', (() => {
    const byType = new Set(acts.map((a) => a.activity_type));
    return GAMES.every((t) => byType.has(t));
  })(), GAMES.map((t) => `${t}:${acts.filter((a) => a.activity_type === t).length}`).join(' '));

  const byAgeBand = {};
  for (const a of acts) {
    byAgeBand[a.age_group_name] = byAgeBand[a.age_group_name] || new Set();
    byAgeBand[a.age_group_name].add(a.activity_type);
  }
  for (const [band, types] of Object.entries(byAgeBand)) {
    check(`age band "${band}" has all three game types`, GAMES.every((t) => types.has(t)),
      [...types].join(', '));
  }

  for (const a of acts) {
    const cfg = a.activity_config || {};
    const label = `[${a.activity_type}] ${a.title}`;

    if (a.activity_type === 'letter_tracing') {
      const list = Array.isArray(cfg.letters) ? cfg.letters : [];
      check(`${label} has letters`, list.length > 0, `${list.length} letters`);
      for (const l of list) {
        if (!l.base || !lettersByChar.has(l.base)) {
          check(`${label}: "${l.base}" is a real Ge'ez series`, false);
          break;
        }
        if (l.word && !wordsByName.has(l.word)) {
          check(`${label}: word "${l.word}" exists in picture_words`, false);
          break;
        }
        if (l.emoji && !l.word) {
          check(`${label}: an emoji with no word reads as nonsense to a child`, false);
          break;
        }
      }
      const sylOk = list.every((l) => Array.isArray(l.syllables) && l.syllables.length === cfg.vowel_order_count);
      check(`${label}: syllable count matches vowel_order_count`, sylOk,
        `wants ${cfg.vowel_order_count}, has ${list.map((l) => (l.syllables || []).length).join('/')}`);
      const first = list[0];
      if (first) {
        console.log(`         teaches ${list.map((l) => l.base).join(' ')}  (${first.base}: ${(first.syllables || []).join(' ')})`);
      }
    }

    if (a.activity_type === 'counting') {
      const objects = Array.isArray(cfg.objects) ? cfg.objects : [];
      check(`${label} has countable objects`, objects.length > 0, `${objects.length} objects`);
      check(`${label} objects all have a picture`,
        objects.every((o) => o.emoji || o.image_url), objects.map((o) => o.word).join(' '));
      check(`${label} range is sane`, cfg.min >= 1 && cfg.max >= cfg.min && cfg.max <= 100,
        `${cfg.min}-${cfg.max}`);
      check(`${label} rounds is sane`, cfg.rounds >= 3 && cfg.rounds <= 10, String(cfg.rounds));
      check(`${label} numeral system is valid`, ['geez', 'arabic'].includes(cfg.numeral_system),
        String(cfg.numeral_system));
      console.log(`         counts ${objects.map((o) => o.emoji).join('')} from ${cfg.min} to ${cfg.max}, ${cfg.rounds} rounds, ${cfg.numeral_system}`);
    }

    if (a.activity_type === 'matching') {
      const pairs = Array.isArray(cfg.pairs) ? cfg.pairs : [];
      check(`${label} has pairs`, pairs.length > 0, `${pairs.length} pairs`);
      check(`${label} pairs are 4 or more so a round can be played`, pairs.length >= 4,
        `${pairs.length} pairs`);
      check(`${label} pairs all have left and right`, pairs.every((p) => p.left && p.right),
        pairs.map((p) => `${p.left}->${p.right}`).join(' '));
      const lefts = pairs.map((p) => p.left);
      check(`${label} has no duplicate left sides`, new Set(lefts).size === lefts.length,
        lefts.join(' '));
      console.log(`         matches ${pairs.map((p) => `${p.left} ${p.emoji || ''}${p.right}`).join(', ')}`);
    }
  }

  // Nothing published for an age band that has no 5-9 child should be pointless.
  const bands = await query('SELECT id, name FROM age_groups ORDER BY id');
  console.log('\nage bands in the database:');
  for (const b of bands.rows) {
    const n = acts.filter((a) => a.age_group_id === b.id).length;
    console.log(`  ${b.id} ${b.name}: ${n} game activities`);
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
