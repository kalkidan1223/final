import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useVoiceGuide from '../../hooks/useVoiceGuide';
import { pickPraise } from '../../utils/ethiopianLearning';
import { normalizePairs } from '../../utils/practiceContent';
import { PracticeHeader } from './FidelPractice';

/**
 * MatchPractice
 * -------------
 * Pairs each character with the everyday Amharic word the INSTRUCTOR paired it
 * with for this activity.
 *
 * This is the "letter-sound to meaning" step that early literacy needs, and it
 * is taught in Ethiopian classrooms through pictures and oral repetition
 * rather than printed exercises. Both sides of every pair come from the
 * teacher's `activity_config`, which they built from the seeded picture-word
 * reference table.
 *
 * The child taps a character, hears it, then taps the matching picture. Wrong
 * taps simply flash and re-open; there is no losing.
 */

const ROUND_SIZE = 4;

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function MatchPractice({ activity, reference = {} }) {
  const voice = useVoiceGuide({ lang: 'am' });

  const allPairs = useMemo(
    () => normalizePairs(activity?.activity_config, reference),
    [activity?.activity_config, reference]
  );

  const [round, setRound] = useState(0);
  const [pairs, setPairs] = useState(() => pickPairs(allPairs));
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [solved, setSolved] = useState([]);
  const [wrongPair, setWrongPair] = useState(null);
  const [matchedTotal, setMatchedTotal] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const letters = useMemo(() => shuffled(pairs), [pairs]);
  const pictures = useMemo(() => shuffled(pairs), [pairs]);
  const praise = useMemo(
    () => pickPraise(reference.encouragement_phrases, matchedTotal),
    [reference.encouragement_phrases, matchedTotal]
  );

  const backTo = activity?.lesson_id ? `/child/lessons/${activity.lesson_id}` : '/child';

  useEffect(() => {
    voice.speakOnce(`match-${activity?.id || 'practice'}-${round}`, [
      { text: 'ፊደሉን ከስዕሉ ጋር አዛምድ።', lang: 'am' },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, activity?.id]);

  const chooseLetter = (pair) => {
    if (solved.includes(pair.letter)) return;
    setSelectedLetter(pair);
    setWrongPair(null);
    voice.speak([{ text: pair.word, lang: 'am' }]);
  };

  const choosePicture = (pair) => {
    if (solved.includes(pair.letter)) return;
    if (!selectedLetter) {
      voice.speak('በመጀመሪያ ፊደል ምረጥ።');
      return;
    }

    if (pair.letter === selectedLetter.letter) {
      const nextSolved = [...solved, pair.letter];
      setSolved(nextSolved);
      setSelectedLetter(null);
      setMatchedTotal((n) => n + 1);
      voice.speak([
        { text: 'ትክክል!', lang: 'am' },
        { text: praise.text, lang: 'am' },
      ]);

      if (nextSolved.length === pairs.length) {
        setCelebrate(true);
        voice.speak([{ text: 'ሁሉንም አጥና! በጣም ጥሩ ሥራ ነህ!', lang: 'am' }]);
      }
      return;
    }

    setWrongPair(pair.letter);
    voice.speak('አይደለም። እንደገና ሞክር።');
    window.setTimeout(() => setWrongPair(null), 700);
  };

  const nextRound = () => {
    setPairs(pickPairs(allPairs));
    setSolved([]);
    setSelectedLetter(null);
    setCelebrate(false);
    setRound((r) => r + 1);
  };

  if (allPairs.length === 0) {
    return (
      <div className="min-h-screen bg-sky-50">
        <PracticeHeader
          title={activity?.title || 'ማዛመድ'}
          subtitle="በመምህርህ ትምህርት"
          voice={voice}
          backTo={backTo}
        />
        <p className="text-center font-black text-slate-600 py-20 px-6">
          መምህርህ እስካሁን የሚዛምዱ ቅርጾች አልመረጡም።
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 pb-16">
      <PracticeHeader
        title={activity?.title || 'ስዕል አዛምድ'}
        subtitle={activity?.lesson_title || 'በመምህርህ የተመረጠ'}
        voice={voice}
        backTo={backTo}
      />

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <section className="bg-white rounded-[2rem] border-4 border-sky-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-black text-sky-900 mb-4 flex items-center gap-2">
            <span>🔤</span> ፊደል ምረጥ
          </h2>
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            {letters.map((pair) => {
              const isSolved = solved.includes(pair.letter);
              const isSelected = selectedLetter?.letter === pair.letter;
              return (
                <button
                  key={`l-${pair.letter}-${pair.word}`}
                  onClick={() => chooseLetter(pair)}
                  disabled={isSolved}
                  className={`aspect-square rounded-2xl border-4 text-3xl sm:text-4xl font-black transition active:scale-95 ${
                    isSolved
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : isSelected
                        ? 'bg-sky-600 text-white border-sky-700 ring-4 ring-sky-300'
                        : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  {isSolved ? '✅' : pair.letter}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-[2rem] border-4 border-amber-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-black text-amber-900 mb-4 flex items-center gap-2">
            <span>🖼️</span> ስዕሉን ምረጥ
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {pictures.map((pair) => {
              const isSolved = solved.includes(pair.letter);
              const isWrong = wrongPair === pair.letter;
              return (
                <button
                  key={`p-${pair.letter}-${pair.word}`}
                  onClick={() => choosePicture(pair)}
                  onMouseEnter={() => voice.speak([{ text: pair.word, lang: 'am' }])}
                  disabled={isSolved}
                  className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    isSolved
                      ? 'bg-emerald-600 border-emerald-700'
                      : isWrong
                        ? 'bg-rose-100 border-rose-400 animate-pulse'
                        : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span className="text-4xl sm:text-5xl">
                    {isSolved ? '✅' : pair.image_url ? <img src={pair.image_url} alt="" className="w-12 h-12 object-contain" /> : pair.emoji}
                  </span>
                  {!isSolved && (
                    <span className="text-xs font-black text-amber-900">{pair.word}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {celebrate ? (
          <section className="rounded-[2rem] bg-emerald-100 border-4 border-emerald-300 p-6 text-center animate-fade-in space-y-4">
            <div className="text-6xl">🎉</div>
            <h3 className="text-2xl font-black text-emerald-950">ሁሉንም አጥና!</h3>
            <p className="text-sm font-black text-emerald-800">
              በጣም ጥሩ ሥራ ነህ። በጣም ፍላጎት አለህ።
            </p>
            {allPairs.length > pairs.length && (
              <button
                onClick={nextRound}
                className="w-full sm:w-auto px-8 py-4 rounded-3xl bg-emerald-600 text-white text-lg font-black shadow-lg active:scale-95 transition"
              >
                ➔ ቀጣይ ጨዋታ
              </button>
            )}
            <Link
              to={backTo}
              className="inline-block px-8 py-3.5 rounded-2xl bg-white border-2 border-emerald-300 text-slate-700 font-black active:scale-95 transition"
            >
              🏠 ወደ መነሻ ተመለስ
            </Link>
          </section>
        ) : (
          <section className="text-center">
            <p className="text-sm font-black text-slate-500">
              ከጠናቀቡ {solved.length} ቀና ከ {pairs.length}
            </p>
            <Link
              to={backTo}
              className="inline-block mt-4 px-8 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-black active:scale-95 transition"
            >
              🏠 ወደ መነሻ ተመለስ
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

/**
 * Take up to ROUND_SIZE pairs, one per character so the puzzle can never be
 * ambiguous. Three is the smallest round that is still a game.
 */
function pickPairs(allPairs) {
  if (!Array.isArray(allPairs) || allPairs.length === 0) return [];

  const unique = [];
  const seen = new Set();
  for (const pair of shuffled(allPairs)) {
    if (seen.has(pair.letter)) continue;
    seen.add(pair.letter);
    unique.push(pair);
    if (unique.length >= ROUND_SIZE) break;
  }
  return unique;
}
