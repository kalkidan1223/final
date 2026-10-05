import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useVoiceGuide from '../../hooks/useVoiceGuide';
import useReferenceKit from '../../hooks/useReferenceKit';
import { pickPraise, timeOfDayGreeting } from '../../utils/ethiopianLearning';
import { tileMetaFor, wordsFromPins } from '../../utils/practiceContent';

/**
 * EthiopianChildHome
 * ------------------
 * The landing screen for children aged 5-9.
 *
 * Design rules, driven by how Ethiopian primary classrooms actually work:
 *
 *  1. ONE decision per screen. The instructor's assigned lesson is the only
 *     highlighted action; everything else is quiet. A child who cannot read
 *     must still be able to start learning by touching one thing.
 *
 *  2. Every label is spoken. Amharic first, with the pictogram carrying the
 *     meaning so a child who cannot read Amharic fluently still succeeds.
 *
 *  3. NO HARDCODED CURRICULUM. The tiles, the words and the praise are all
 *     instructor-published. If a teacher has not pinned anything, the screen
 *     says so plainly instead of inventing content. See src/utils/
 *     practiceContent.js for the contract.
 *
 *  4. Feedback is warm and immediate, never numeric. No star formulas,
 *     no streaks for a six-year-old who missed a day.
 */

export default function EthiopianChildHome({ data, loading, error, onRetry }) {
  const voice = useVoiceGuide({ lang: 'am' });
  const { reference } = useReferenceKit();

  const child = data?.child || {};
  const stats = data?.stats || {};
  const continueLearning = data?.continue_learning;
  const courses = data?.courses || [];
  const todaysActivities = data?.todays_activities || [];
  const achievements = data?.achievements || [];
  const homePins = data?.home_pins || [];
  const encouragement = data?.encouragement || [];

  const greeting = useMemo(() => timeOfDayGreeting(), []);
  const praise = useMemo(
    () => pickPraise(encouragement, stats.completed_activities || 0),
    [encouragement, stats.completed_activities]
  );

  // The words on screen are the words this child's teacher set, not a list
  // baked into the app.
  const words = useMemo(
    () => wordsFromPins(homePins, reference, 8),
    [homePins, reference]
  );

  // Greet the child once, in Amharic, as soon as their name is known.
  useEffect(() => {
    if (!child.full_name) return;
    voice.speakOnce(
      `home-greet-${child.full_name}`,
      [
        { text: `${greeting.amharic}`, lang: 'am' },
        { text: child.full_name, lang: 'am' },
        {
          text: continueLearning
            ? 'የዛሬ ትምህርትህ ዝግጁ ነው። እንጀምር።'
            : 'ተጨዋታ ተጫን።',
          lang: 'am',
        },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.full_name]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="text-7xl animate-bounce">🌱</div>
        <p className="text-xl sm:text-2xl font-black text-emerald-800 animate-pulse text-center px-6">
          መጽሐፍህ እየተከፈተ ነው...
        </p>
        <button
          onClick={() => voice.speak('መጽሐፍህ እየተከፈተ ነው። ጠብቅ ትንሽ።')}
          className="px-6 py-3 bg-emerald-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition text-sm"
        >
          🔊 አስማም
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-4 border-rose-200 rounded-[2rem] p-8 text-center max-w-lg mx-auto my-12 space-y-4">
        <span className="text-6xl block">😔</span>
        <h3 className="text-xl font-black text-rose-900">ለምንስ ትንሽ አልቻልንም</h3>
        <p className="text-sm font-bold text-rose-700">{error}</p>
        <button
          onClick={() => {
            voice.speak('ለምንስ ትንሽ አልቻልንም። እንደገና ሞክር።');
            onRetry();
          }}
          className="px-8 py-3.5 bg-rose-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition text-base"
        >
          🔄 እንደገና ሞክር
        </button>
      </div>
    );
  }

  const fallbackCourse = courses[0] || null;
  const doneToday = (stats.completed_activities || 0) + (stats.completed_quizzes || 0);

  return (
    <div className="space-y-7 pb-14 animate-fade-in">
      {/* ── Voice toggle: parents and children can mute the whole portal ── */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const next = !voice.enabled;
            voice.setVoiceEnabled(next);
            if (next) voice.speak('ድምፅ ተከፍቷል።');
          }}
          aria-pressed={voice.enabled}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm shadow-sm border-2 transition active:scale-95 ${
            voice.enabled
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : 'bg-slate-100 text-slate-600 border-slate-300'
          }`}
        >
          <span className="text-lg">{voice.enabled ? '🔊' : '🔇'}</span>
          {voice.enabled ? 'ድምፅ በርተት' : 'ድምፅ ዝግዝ'}
        </button>
      </div>

      {/* ── Greeting: name, time of day, one line of Amharic ── */}
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-6 -right-4 text-[9rem] opacity-10 select-none pointer-events-none">
          🇪🇹
        </div>
        <div className="absolute bottom-0 right-24 text-6xl opacity-20 select-none pointer-events-none">
          🌿
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 shrink-0 rounded-3xl bg-white/20 backdrop-blur border-2 border-white/40 flex items-center justify-center text-5xl shadow-lg">
            {greeting.emoji}
          </div>

          <div className="space-y-1.5 flex-1">
            <h1 className="text-2xl sm:text-4xl font-black leading-tight">
              {greeting.amharic} {child.full_name || 'ትንሹ ኮከብ'}!
            </h1>
            <p className="text-sm sm:text-base font-bold text-amber-100">
              እንኳን ወደ ብራና የህፃናት መማሪያ በደህና መጣህ!
            </p>
          </div>

          <button
            onClick={() =>
              voice.speak([
                { text: greeting.amharic, lang: 'am' },
                { text: child.full_name || 'ትንሹ ኮከብ', lang: 'am' },
                {
                  text: 'እንኳን ወደ ብራና የህፃናት መማሪያ በደህና መጣህ!',
                  lang: 'am',
                },
              ])
            }
            className="shrink-0 w-full sm:w-auto px-6 py-4 bg-white text-emerald-800 font-black rounded-3xl shadow-xl active:scale-95 transition text-base flex items-center justify-center gap-2"
          >
            <span className="text-xl">{voice.isSpeaking ? '🔊' : '🔈'}</span>
            አስማም
          </button>
        </div>
      </header>

      {/* ── THE ONE BIG THING: what the teacher set for today ── */}
      {continueLearning ? (
        <section>
          <PrimaryLessonCard
            lesson={continueLearning}
            onSpeak={() =>
              voice.speak([
                { text: 'የዛሬ ትምህርትህ', lang: 'am' },
                { text: continueLearning.title, lang: 'am' },
                { text: 'አሁን እንጀምር።', lang: 'am' },
              ])
            }
          />
        </section>
      ) : fallbackCourse ? (
        <section>
          <Link
            to={`/child/courses/${fallbackCourse.id}`}
            className="block rounded-[2rem] bg-gradient-to-br from-sky-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl active:scale-[0.99] transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <span className="inline-block bg-black/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                  👨‍🏫 የመምህርህ ትምህርት
                </span>
                <h2 className="text-xl sm:text-3xl font-black">{fallbackCourse.title}</h2>
                <p className="text-sm font-bold text-sky-100">
                  መምህር: {fallbackCourse.instructor_name || 'የክፍሉ መምህር'}
                </p>
              </div>
              <span className="shrink-0 px-7 py-4 bg-white text-sky-700 font-black rounded-3xl shadow-xl text-lg flex items-center gap-2">
                ▶ ጀምር
              </span>
            </div>
          </Link>
        </section>
      ) : (
        <section className="rounded-[2rem] bg-white border-4 border-dashed border-slate-200 p-8 text-center space-y-3">
          <span className="text-6xl block">📚</span>
          <h2 className="text-lg sm:text-xl font-black text-slate-800">
            መምህርህ አስደሳች ትምህርት እየዘጋጀ ነው
          </h2>
          <p className="text-sm font-bold text-slate-500">
            ትንሽ ቆይተህ ተጫን። በዚህ ውስጥ ልለት ተጫን!
          </p>
        </section>
      )}

      {/* ── Today's small checklist: a tick per thing, no points ── */}
      {todaysActivities.length > 0 && (
        <section className="rounded-[2rem] bg-white border-2 border-emerald-100 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
              <span>✅</span> የዛሬ ሥራዎች (Today)
            </h2>
            <button
              onClick={() =>
                voice.speak(`የዛሬ ${todaysActivities.length} ሥራ አለህ። በጣም ጥሩ!`)
              }
              className="text-emerald-700 text-sm font-black hover:underline"
            >
              🔊 አስማም
            </button>
          </div>
          <ul className="space-y-2.5">
            {todaysActivities.slice(0, 4).map((item) => (
              <li
                key={item.id ?? item.activity_id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/70"
              >
                <span className="text-2xl">{item.icon || '🎯'}</span>
                <span className="font-black text-slate-800 text-sm sm:text-base truncate">
                  {item.title || 'ሥራ'}
                </span>
                {item.completed ? (
                  <span className="ml-auto text-emerald-600 font-black text-sm">ተጠናቅቋል</span>
                ) : (
                  <span className="ml-auto text-amber-600 font-black text-sm">ቀርቷል</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── What the instructor pinned to this home. Nothing else. ── */}
      {homePins.length > 0 ? (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                <span>🎮</span> በመምህርህ የተመረጡ
              </h2>
              <p className="text-xs font-bold text-slate-500">
                ሥራዎች — ከሥራዎች ውጭ በራስህ የሚሆኑ ጨዋታዎች
              </p>
            </div>
            <button
              onClick={() => voice.speak('በመምህርህ የተመረጡ ሥራዎች።')}
              className="text-slate-500 text-sm font-black hover:underline shrink-0"
            >
              🔊 አስማም
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {homePins.map((pin, index) => (
              <PracticeTile key={pin.pin_id} pin={pin} index={index} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] bg-white border-4 border-dashed border-slate-200 p-8 text-center space-y-3">
          <span className="text-6xl block">⏳</span>
          <h2 className="text-lg sm:text-xl font-black text-slate-800">
            መምህርህ ጨዋታ እየመረጠ ነው
          </h2>
          <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">
            በዚህ ውስጥ ስለሚጨዋቱ ምን መምህርህ እንደመረጠ ይገኛል።
          </p>
          <p className="text-xs font-bold text-slate-400">
            👨‍🏫 መምህሮች በትምህርት ገጽ ላይ «Child Home» ላይ መምረጥ ይችላሉ።
          </p>
        </section>
      )}

      {/* ── Warm feedback, not a scoreboard ── */}
      <section className="rounded-[2rem] bg-gradient-to-r from-amber-100 via-yellow-50 to-emerald-50 border-2 border-amber-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="text-6xl">{praise.emoji || '🌟'}</div>
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-950">{praise.text}</h2>
            <p className="text-sm font-bold text-amber-800">
              እስከ አሁን {doneToday} ሥራ ፈጽሟል።
              {doneToday === 0
                ? ' ዛሬ መጀመሪያዎን አስጀምር!'
                : ' ቀጥልህ ጥሩ ሥራ ነህ!'}
            </p>
          </div>
          <button
            onClick={() => voice.speak([{ text: praise.text, lang: 'am' }])}
            className="shrink-0 px-6 py-3.5 bg-amber-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔊</span>
            አስማም
          </button>
        </div>
      </section>

      {/* ── Badges: quiet, tucked away, so they do not compete for attention ── */}
      {achievements.length > 0 && (
        <section className="rounded-[2rem] bg-white border-2 border-slate-100 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>🏅</span> የእርስዎ ሜራጫዎች
            </h2>
            <Link
              to="/child/achievements"
              className="text-xs font-black text-sky-700 hover:underline"
            >
              ሁሉንም እይ ➔
            </Link>
          </div>
          <div className="flex gap-3 flex-wrap">
            {achievements.slice(0, 5).map((badge) => (
              <div
                key={badge.id ?? badge.code}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-200"
              >
                <span className="text-2xl">{badge.icon || '🏅'}</span>
                <span className="text-xs font-black text-amber-900">{badge.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── The words the teacher set this week ── */}
      {words.length > 0 && (
        <section className="rounded-[2rem] bg-white border-2 border-slate-100 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>💬</span> የቀንን ቃላት
            </h2>
            <span className="text-xs font-bold text-slate-400">
              በመምህርህ ትምህርት
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {words.map((item) => (
              <button
                key={item.word}
                onClick={() => voice.speak([{ text: item.word, lang: 'am' }])}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition font-black text-slate-800 flex items-center gap-2"
              >
                <span className="text-lg">{item.emoji}</span>
                {item.word}
                {item.english && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {item.english}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * One instructor-pinned activity.
 *
 * A practice game (letter tracing, counting, matching) opens the game renderer
 * with the teacher's own content. Anything else opens the normal lesson flow.
 */
function PracticeTile({ pin, index }) {
  const meta = tileMetaFor(pin);
  const isPractice =
    pin.kind === 'letter_tracing' || pin.kind === 'counting' || pin.kind === 'matching';
  const to = isPractice ? `/child/practice/${pin.id}` : `/child/lessons/${pin.lesson_id}`;

  return (
    <Link
      to={to}
      className={`group relative rounded-[2rem] bg-gradient-to-b ${meta.tileBg} ring-4 ${meta.tileClass} p-5 text-center shadow-md hover:shadow-2xl active:scale-95 transition flex flex-col items-center gap-2 hover:scale-105 hover:-translate-y-2 animate-slide-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="w-20 h-20 rounded-3xl bg-white/70 shadow-inner flex items-center justify-center text-4xl group-active:scale-95 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
        {meta.emoji}
      </div>
      <h3 className={`text-base sm:text-lg font-black leading-tight ${meta.tileText}`}>
        {pin.title}
      </h3>
      {pin.lesson_title && (
        <p className={`text-xs font-bold opacity-70 ${meta.tileText}`}>{pin.lesson_title}</p>
      )}
      <span
        className={`mt-1 inline-flex items-center gap-1.5 px-4 py-2 ${meta.tileChip} text-white text-xs font-black rounded-xl shadow hover:scale-110 transition-transform`}
      >
        {isPractice ? '▶ ጀምር' : '📖 ተመልክ'}
      </span>
    </Link>
  );
}

/**
 * The instructor's assigned lesson, given the only loudest call to action
 * on the whole screen.
 */
function PrimaryLessonCard({ lesson, onSpeak }) {
  const progress = Math.min(100, Math.max(0, lesson.lesson_progress || 0));

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-white shadow-2xl border-4 border-white">
      <div className="absolute -bottom-8 -left-6 text-[10rem] opacity-10 select-none pointer-events-none">
        📖
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 text-center lg:text-left lg:max-w-xl">
          <span className="inline-block bg-black/20 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wide">
            👨‍🏫 በመምህርህ የተመረጠ
          </span>
          <h2 className="text-2xl sm:text-4xl font-black leading-tight">{lesson.title}</h2>
          <p className="text-base font-bold text-amber-100">ትምህርት: {lesson.course_title}</p>

          {progress > 0 && (
            <div className="w-full max-w-xs mx-auto lg:mx-0">
              <div className="bg-black/20 h-3.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-black mt-1.5 text-amber-50">የተጠናቀቀው: {progress}%</p>
            </div>
          )}

          <button
            onClick={onSpeak}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 rounded-2xl text-sm font-black active:scale-95 transition"
          >
            <span className="text-lg">🔊</span> ትምህርቱን አስማም
          </button>
        </div>

        <Link
          to={`/child/lessons/${lesson.id}`}
          className="shrink-0 w-full lg:w-auto px-8 py-6 bg-white text-orange-600 font-black rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl sm:text-2xl flex items-center justify-center gap-3 border-4 border-amber-200"
        >
          <span className="text-3xl">▶</span>
          <span>
            ትምህርቱን ጀምር
            <span className="block text-xs font-black text-orange-400 uppercase tracking-wide">
              Start
            </span>
          </span>
          <span className="text-3xl">🚀</span>
        </Link>
      </div>
    </div>
  );
}
