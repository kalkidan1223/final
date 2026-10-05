import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useVoiceGuide from '../../hooks/useVoiceGuide';
import { pickPraise, VOWEL_ORDERS } from '../../utils/ethiopianLearning';
import { normalizeLetters, vowelOrderCount } from '../../utils/practiceContent';

/**
 * FidelPractice
 * -------------
 * Traces the letters the INSTRUCTOR chose for this activity.
 *
 * The letters come from `activity_config.letters`, which the teacher picked in
 * the ActivityBuilder. The seven vowel orders for each character come from the
 * seeded Ge'ez syllabary reference table - that is the writing system, not
 * curriculum, so nobody types it out by hand.
 *
 * How the letter is actually taught in Ethiopian Grade 1: a child learns ONE
 * base character, then practices the seven vowel orders that grow out of it,
 * and finally sees the character inside a real word the teacher supplied.
 *
 * The child taps a big character, hears it, traces it in a very thick touch
 * area, and is praised. Nothing is scored and nothing fails. It runs entirely
 * in the browser so it works on a school laptop with no connection.
 */

const TRACE_THICKNESS = 34;
const MIN_STROKE_LENGTH = 40;

export default function FidelPractice({ activity, reference = {} }) {
  const voice = useVoiceGuide({ lang: 'am' });

  const letters = useMemo(
    () => normalizeLetters(activity?.activity_config, reference),
    [activity?.activity_config, reference]
  );
  const orderCount = useMemo(
    () => vowelOrderCount(activity?.activity_config),
    [activity?.activity_config]
  );
  const orders = useMemo(() => VOWEL_ORDERS.slice(0, orderCount), [orderCount]);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef([]);

  const [letterIndex, setLetterIndex] = useState(0);
  const [orderIndex, setOrderIndex] = useState(0);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [traced, setTraced] = useState(() => new Set());
  const [celebrate, setCelebrate] = useState(false);

  const letter = letters[letterIndex] || letters[0];
  const syllableList = letter?.syllables || [];
  const target = syllableList[orderIndex] || letter?.base || '';
  const praise = pickPraise(
    reference.encouragement_phrases,
    strokes.length + (traced?.size || 0)
  );

  // Size the canvas to its container once, then on window resize.
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = Math.min(parent.clientWidth, 560);
      const height = Math.round(width * 0.5);
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = TRACE_THICKNESS;
      ctx.strokeStyle = '#059669';
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Clear the canvas whenever the child switches letter or vowel order.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setStrokes([]);
    setCurrentStroke([]);
    pointsRef.current = [];
  }, [letterIndex, orderIndex]);

  // Speak the new character as soon as it appears, so a child who cannot read
  // always knows which sound to draw.
  useEffect(() => {
    if (!letter) return;
    voice.speakOnce(
      `fidel-${letter.base}-${orderIndex}`,
      [
        { text: letter.base, lang: 'am' },
        { text: orders[orderIndex]?.name || '', lang: 'am' },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter?.base, orderIndex]);

  const resetCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  const toCanvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startStroke = (event) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    drawingRef.current = true;
    const point = toCanvasPoint(event);
    pointsRef.current = [point];
    setCurrentStroke([point]);
  };

  const moveStroke = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const point = toCanvasPoint(event);
    const points = [...pointsRef.current, point];
    pointsRef.current = points;

    const ctx = canvasRef.current.getContext('2d');
    const [from, to] = [points[points.length - 2], point];
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    setCurrentStroke(points);
  };

  const endStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const points = pointsRef.current;
    const length = points.reduce((sum, p, i) => {
      if (i === 0) return 0;
      const prev = points[i - 1];
      return sum + Math.hypot(p.x - prev.x, p.y - prev.y);
    }, 0);

    // Ignore accidental taps: only a deliberate drag counts as a stroke.
    if (points.length < 2 || length < MIN_STROKE_LENGTH) {
      pointsRef.current = [];
      setCurrentStroke([]);
      return;
    }

    setStrokes((prev) => [...prev, points]);
    setCurrentStroke([]);
  };

  const erase = () => {
    resetCanvas();
    setStrokes([]);
    setCurrentStroke([]);
    pointsRef.current = [];
    voice.speak('ሰርቶቹን አጥፋል።');
  };

  const isDone = strokes.length >= 1;
  const progress = Math.min(100, Math.round((strokes.length * 100) / 3));

  const selectLetter = (index) => {
    setCelebrate(false);
    setLetterIndex(index);
    setOrderIndex(0);
  };

  const nextLetter = () => {
    setCelebrate(false);
    setLetterIndex((prev) => (prev + 1) % letters.length);
    setOrderIndex(0);
  };

  const finishStroke = () => {
    if (!isDone || !letter) return;
    setCelebrate(true);
    setTraced((prev) => new Set(prev).add(letter.base));
    voice.speak([{ text: praise.text, lang: 'am' }]);
  };

  // Nothing to trace: the instructor has not set any letters yet.
  if (!letter) {
    return (
      <div className="min-h-screen bg-emerald-50">
        <PracticeHeader
          title={activity?.title || 'ፊደል'}
          subtitle="በመምህርህ ትምህርት"
          voice={voice}
        />
        <p className="text-center font-black text-slate-600 py-20 px-6">
          መምህርህ እስካሁን ፊደል አልመረጠም።
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50 pb-16">
      <PracticeHeader
        title={activity?.title || 'ፊደል ተማር'}
        subtitle={activity?.lesson_title || 'በመምህርህ የተመረጠ'}
        voice={voice}
        backTo={activity?.lesson_id ? `/child/lessons/${activity.lesson_id}` : '/child'}
      />

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* ── Step 1: choose a letter ── */}
        {letters.length > 1 && (
          <section className="bg-white rounded-[2rem] border-4 border-emerald-200 p-5 shadow-sm">
            <h2 className="text-base sm:text-lg font-black text-emerald-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">1️⃣</span> ፊደል ምረጥ
            </h2>
            <div
              className={`grid gap-2.5 ${
                letters.length > 8
                  ? 'grid-cols-4 sm:grid-cols-6'
                  : 'grid-cols-4 sm:grid-cols-8'
              }`}
            >
              {letters.map((item, index) => {
                const active = index === letterIndex;
                return (
                  <button
                    key={item.base}
                    onClick={() => selectLetter(index)}
                    aria-label={`ፊደል ${item.base}`}
                    className={`relative aspect-square rounded-2xl font-black text-3xl sm:text-4xl transition active:scale-95 ${
                      active
                        ? 'bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-300'
                        : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    {item.base}
                    {traced.has(item.base) && (
                      <span className="absolute -top-1 -right-1 text-base">⭐</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Step 2: hear and see the sound ── */}
        <section className="bg-white rounded-[2rem] border-4 border-amber-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-black text-amber-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">2️⃣</span> ድምፁን አስማም
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <button
              onClick={() => voice.speak([{ text: target, lang: 'am' }])}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] bg-amber-100 border-4 border-amber-300 text-7xl sm:text-8xl font-black text-amber-950 active:scale-95 transition shadow-inner shrink-0"
            >
              {target}
            </button>

            <div className="flex-1 w-full space-y-3">
              {syllableList.length > 0 && (
                <>
                  <p className="text-sm font-black text-slate-700">
                    ለዚህ ፊደል{' '}
                    <span className="text-2xl text-emerald-700">{letter.base}</span> የሚከተሉት የድምፅ
                    ቅርጾች፦
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {orders.map((order, index) => {
                      const active = index === orderIndex;
                      return (
                        <button
                          key={order.order}
                          onClick={() => {
                            setCelebrate(false);
                            setOrderIndex(index);
                            if (syllableList[index]) {
                              voice.speak([{ text: syllableList[index], lang: 'am' }]);
                            }
                          }}
                          className={`px-3.5 py-2.5 rounded-2xl font-black text-lg transition active:scale-95 ${
                            active
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          {syllableList[index] || ''}
                          <span className="block text-[10px] opacity-70">{order.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Step 3: trace it ── */}
        <section className="bg-white rounded-[2rem] border-4 border-sky-200 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-base sm:text-lg font-black text-sky-900 flex items-center gap-2">
              <span className="text-2xl">3️⃣</span> በጣት ጻፍ
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={erase}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm active:scale-95 transition"
              >
                🧽 አጥፋ
              </button>
              {letters.length > 1 && (
                <button
                  onClick={nextLetter}
                  className="px-4 py-2.5 rounded-2xl bg-sky-600 text-white font-black text-sm active:scale-95 transition shadow"
                >
                  ➔ ቀጣይ ፊደል
                </button>
              )}
            </div>
          </div>

          {/* Faint guide character behind the tracing area. */}
          <div className="relative rounded-[1.75rem] bg-sky-50 border-4 border-sky-200 overflow-hidden select-none">
            <span
              className="absolute inset-0 flex items-center justify-center text-[10rem] sm:text-[13rem] text-sky-200 font-black pointer-events-none"
              aria-hidden="true"
            >
              {target}
            </span>
            <canvas
              ref={canvasRef}
              onPointerDown={startStroke}
              onPointerMove={moveStroke}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              onPointerCancel={endStroke}
              className="relative w-full touch-none cursor-crosshair block"
              style={{ height: 280 }}
            />
          </div>

          {/* Progress: three deliberate strokes is "done". */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-black text-slate-600 shrink-0">
              {progress < 100 ? 'ገና ገና ጻፍ' : 'ጨርሷል!'}
            </span>
          </div>
        </section>

        {/* ── Step 4: the letter inside a real word the teacher supplied ── */}
        {letter.word && (
          <section className="bg-white rounded-[2rem] border-4 border-violet-200 p-5 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-black text-violet-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">4️⃣</span> በቃል ውስጥ
            </h2>
            <button
              onClick={() => voice.speak([{ text: letter.word, lang: 'am' }])}
              className="w-full flex items-center gap-4 p-4 rounded-[1.5rem] bg-violet-50 border-2 border-violet-200 active:scale-[0.99] transition text-left"
            >
              <span className="text-6xl shrink-0">{letter.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-2xl sm:text-3xl font-black text-violet-950">
                  {letter.word}
                </span>
                {letter.english && (
                  <span className="block text-xs font-black text-violet-500 uppercase tracking-wide">
                    {letter.english}
                  </span>
                )}
              </span>
              <span className="text-3xl shrink-0">🔊</span>
            </button>
          </section>
        )}

        {/* ── Finish ── */}
        <section className="text-center space-y-4">
          {celebrate ? (
            <div className="rounded-[2rem] bg-emerald-100 border-4 border-emerald-300 p-6 animate-fade-in space-y-3">
              <div className="text-6xl">{praise.emoji}</div>
              <h3 className="text-2xl font-black text-emerald-950">{praise.text}</h3>
              <p className="text-sm font-black text-emerald-800">
                የ{letter.base} ፊደልን ጨርርካል! በጣም ጥሩ ሥራ ነው።
              </p>
            </div>
          ) : (
            <button
              onClick={finishStroke}
              disabled={!isDone}
              className={`w-full sm:w-auto px-10 py-5 rounded-[2rem] text-xl font-black shadow-xl transition ${
                isDone
                  ? 'bg-emerald-600 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isDone ? '✅ ጨርሻለሁ!' : 'በመጀመሪያ ጻፍ'}
            </button>
          )}

          <Link
            to={activity?.lesson_id ? `/child/lessons/${activity.lesson_id}` : '/child'}
            className="inline-block px-8 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-black active:scale-95 transition"
          >
            🏠 ወደ መነሻ ተመለስ
          </Link>
        </section>
      </div>
    </div>
  );
}

/** Shared header for the practice games: big back button + sound toggle. */
export function PracticeHeader({ title, subtitle, voice, backTo = '/child' }) {
  return (
    <header className="bg-white border-b-4 border-emerald-100 py-4 px-4 mb-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <Link
          to={backTo}
          className="shrink-0 w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center text-2xl active:scale-95 transition"
          aria-label="ወደ መነሻ ተመለስ"
        >
          🏠
        </Link>

        <div className="flex-1 text-center min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-emerald-900 truncate">{title}</h1>
          <p className="text-xs font-bold text-slate-500 truncate">{subtitle}</p>
        </div>

        <button
          onClick={() => {
            const next = !voice.enabled;
            voice.setVoiceEnabled(next);
            if (next) voice.speak('ድምፅ ተከፍቷል።');
          }}
          aria-pressed={voice.enabled}
          className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl active:scale-95 transition ${
            voice.enabled ? 'bg-emerald-100' : 'bg-slate-100'
          }`}
        >
          {voice.enabled ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  );
}
