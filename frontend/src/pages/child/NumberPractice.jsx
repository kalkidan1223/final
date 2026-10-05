import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useVoiceGuide from '../../hooks/useVoiceGuide';
import { pickPraise } from '../../utils/ethiopianLearning';
import { normalizeCounting } from '../../utils/practiceContent';
import { PracticeHeader } from './FidelPractice';

/**
 * NumberPractice
 * --------------
 * Counts the objects the INSTRUCTOR chose for this activity, inside the number
 * range they set.
 *
 * The Ge'ez (Ethiopic) numerals come from the seeded reference table, because
 * that is what Ethiopian Grade 1 children learn first - and because a school
 * should be able to correct a glyph without a code change. If the teacher
 * prefers Arabic digits for a particular child, they switch it in the builder.
 *
 * The loop is deliberately small and repeatable:
 *   hear a number  ->  see it  ->  count the pictures  ->  tap  ->  praised
 *
 * No scores, no timers, no failure state. Works offline.
 */

const CHOICES_SHOWN = 4;

export default function NumberPractice({ activity, reference = {} }) {
  const voice = useVoiceGuide({ lang: 'am' });

  const config = useMemo(
    () => normalizeCounting(activity?.activity_config, reference),
    [activity?.activity_config, reference]
  );
  const objects = config.objects;

  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(() => pickCount(config));
  const [picked, setPicked] = useState(() => buildChoices(pickCount(config), config));
  const [chosen, setChosen] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  // The object shown this round cycles through whatever the teacher supplied.
  const thing = objects.length > 0 ? objects[round % objects.length] : { emoji: '⭐', word: '' };
  const praise = useMemo(
    () => pickPraise(reference.encouragement_phrases, correctCount),
    [reference.encouragement_phrases, correctCount]
  );

  // Announce the new question out loud.
  useEffect(() => {
    voice.speakOnce(
      `count-${round}-${target}-${thing.emoji}`,
      [
        { text: 'ስንት ቁጥሮች አሉ?', lang: 'am' },
        { text: config.glyphFor(target), lang: 'am' },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, target, thing.emoji]);

  if (objects.length === 0) {
    return (
      <div className="min-h-screen bg-amber-50">
        <PracticeHeader
          title={activity?.title || 'ቁጥር'}
          subtitle="በመምህርህ ትምህርት"
          voice={voice}
          backTo={activity?.lesson_id ? `/child/lessons/${activity.lesson_id}` : '/child'}
        />
        <p className="text-center font-black text-slate-600 py-20 px-6">
          መምህርህ እስካሁን የሚቆጠሩ ነገሮች አልመረጡም።
        </p>
      </div>
    );
  }

  const answer = (count) => {
    if (chosen !== null) return;
    setChosen(count);

    if (count === target) {
      setCorrectCount((c) => c + 1);
      voice.speak([
        { text: 'ትክክል!', lang: 'am' },
        { text: praise.text, lang: 'am' },
      ]);
    } else {
      setWrongCount((c) => c + 1);
      voice.speak([{ text: 'አዎት! እንደገና እንሞክር።', lang: 'am' }]);
    }
  };

  const nextRound = () => {
    const nextTarget = pickCount(config);
    setTarget(nextTarget);
    setPicked(buildChoices(nextTarget, config));
    setChosen(null);
    setRound((r) => r + 1);
  };

  const backTo = activity?.lesson_id ? `/child/lessons/${activity.lesson_id}` : '/child';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 pb-16">
      <PracticeHeader
        title={activity?.title || 'ቁጥር ተቁጠር'}
        subtitle={activity?.lesson_title || 'በመምህርህ የተመረጠ'}
        voice={voice}
        backTo={backTo}
      />

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* ── The question, stated out loud and shown ── */}
        <section className="bg-white rounded-[2rem] border-4 border-amber-200 p-6 sm:p-8 text-center shadow-sm">
          <p className="text-sm sm:text-base font-black text-slate-600">
            ስንት <span className="text-amber-600">{thing.word}</span> አሉ?
          </p>

          <button
            onClick={() =>
              voice.speak([
                { text: 'ስንት', lang: 'am' },
                ...(thing.word ? [{ text: thing.word, lang: 'am' }] : []),
                { text: 'አሉ?', lang: 'am' },
              ])
            }
            className="mt-3 inline-flex items-center gap-2 px-7 py-4 rounded-3xl bg-amber-100 border-4 border-amber-300 text-4xl sm:text-5xl font-black text-amber-950 active:scale-95 transition"
          >
            {config.glyphFor(target)}
            <span className="text-2xl">🔊</span>
          </button>

          <p className="mt-3 text-xs font-black text-slate-400 uppercase tracking-wide">
            {config.numeralSystem === 'geez' ? 'የግዕዝ ቁጥር' : 'አራቢ ቁጥር'}
          </p>
        </section>

        {/* ── The pictures to count ── */}
        <section className="bg-white rounded-[2rem] border-4 border-sky-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-black text-sky-900 mb-4 flex items-center gap-2">
            <span>👀</span> ቁጠር፣ በደንብ ቁጠር
          </h2>

          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {Array.from({ length: Math.max(target, 1) }, (_, i) =>
              thing.image_url ? (
                <img
                  key={i}
                  src={thing.image_url}
                  alt=""
                  className="w-14 h-14 object-contain"
                  style={{ animation: `popIn 0.3s ease-out ${i * 0.08}s both` }}
                />
              ) : (
                <span
                  key={i}
                  className="text-5xl sm:text-6xl select-none"
                  style={{ animation: `popIn 0.3s ease-out ${i * 0.08}s both` }}
                  onMouseEnter={() =>
                    thing.word && voice.speak([{ text: thing.word, lang: 'am' }])
                  }
                >
                  {thing.emoji}
                </span>
              )
            )}
          </div>

          {chosen !== null && (
            <p className="mt-5 text-center text-lg font-black">
              {chosen === target ? (
                <span className="text-emerald-600">
                  ✅ ትክክል! ትክክል ነው — {config.glyphFor(target)}
                </span>
              ) : (
                <span className="text-rose-600">❌ የለም። እንደገና እንሞክር።</span>
              )}
            </p>
          )}
        </section>

        {/* ── Tap the answer ── */}
        <section className="bg-white rounded-[2rem] border-4 border-emerald-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-black text-emerald-900 mb-4 flex items-center gap-2">
            <span>👆</span> ትክክሉን ንካ
          </h2>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            {picked.map((count) => {
              const isChosen = chosen === count;
              const revealed = chosen !== null;
              const isRight = count === target;
              const tone = !revealed
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                : isRight
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : isChosen
                    ? 'bg-rose-500 text-white border-rose-600'
                    : 'bg-slate-100 text-slate-400 border-slate-200';

              return (
                <button
                  key={count}
                  onClick={() => answer(count)}
                  className={`aspect-square rounded-2xl border-4 font-black text-2xl sm:text-3xl transition active:scale-95 ${tone}`}
                >
                  {config.glyphFor(count)}
                  <span className="block text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {chosen !== null && (
            <button
              onClick={nextRound}
              className="mt-5 w-full px-8 py-4 rounded-3xl bg-emerald-600 text-white text-lg font-black shadow-lg active:scale-95 transition"
            >
              ➔ ቀጣይ ጥያቄ
            </button>
          )}
        </section>

        {/* ── Gentle tally ── */}
        <section className="bg-white rounded-[2rem] border-4 border-amber-200 p-5 text-center">
          <p className="text-lg font-black text-amber-950">
            ትክክል: <span className="text-emerald-600">{correctCount}</span> · ተሳሳት:{' '}
            <span className="text-rose-500">{wrongCount}</span>
          </p>
          <p className="text-xs font-black text-slate-500 mt-1">
            ስህተት አይደለም — ሁሉንም ጨዋታ ተጫን! 🎉
          </p>
        </section>

        <div className="text-center">
          <Link
            to={backTo}
            className="inline-block px-8 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-black active:scale-95 transition"
          >
            🏠 ወደ መነሻ ተመለስ
          </Link>
        </div>
      </div>
    </div>
  );
}

function pickCount(config) {
  const span = config.max - config.min + 1;
  return config.min + Math.floor(Math.random() * span);
}

function buildChoices(answer, config) {
  const set = new Set([answer]);
  const span = config.max - config.min + 1;
  // If the teacher set a tiny range, show every number in it rather than
  // inventing numbers outside the range they asked for.
  const wanted = Math.min(CHOICES_SHOWN, span);
  let guard = 0;
  while (set.size < wanted && guard < 100) {
    set.add(pickCount(config));
    guard += 1;
  }
  return [...set].sort((a, b) => a - b);
}
