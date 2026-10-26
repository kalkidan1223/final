import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useVoiceGuide from '../../hooks/useVoiceGuide';
import useReferenceKit from '../../hooks/useReferenceKit';
import { timeOfDayGreeting } from '../../utils/ethiopianLearning';
import { tileMetaFor, wordsFromPins } from '../../utils/practiceContent';

/** A single, calm learning home shared by every child account. */
export default function EthiopianChildHome({ data, loading, error, onRetry }) {
  const voice = useVoiceGuide({ lang: 'am' });
  const { reference } = useReferenceKit();
  const child = data?.child || {};
  const stats = data?.stats || {};
  const lesson = data?.continue_learning;
  const courses = data?.courses || [];
  const homePins = data?.home_pins || [];
  const announcements = data?.announcements || [];
  const greeting = useMemo(() => timeOfDayGreeting(), []);
  const words = useMemo(() => wordsFromPins(homePins, reference, 4), [homePins, reference]);
  const firstName = child.full_name?.split(' ')[0] || 'friend';

  useEffect(() => {
    if (child.full_name) voice.speakOnce(`home-greet-${child.full_name}`, [
      { text: greeting.amharic, lang: 'am' },
      { text: child.full_name, lang: 'am' },
    ]);
    // Speak once when a new child profile is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.full_name]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
        <span className="text-6xl animate-bounce" aria-hidden="true">🌱</span>
        <p className="text-lg font-extrabold text-emerald-800">Getting your learning space ready…</p>
      </div>
    );
  }

  if (error) {
    const isAuthError = error === 'Please log in to continue';
    return (
      <div className="mx-auto my-12 max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <span className="text-5xl" aria-hidden="true">{isAuthError ? '🔒' : '🌤️'}</span>
        <h1 className="mt-3 text-xl font-black text-slate-900">{isAuthError ? 'Please log in' : 'Let’s try that again'}</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        {isAuthError ? (
          <Link to="/login" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Go to login</Link>
        ) : (
          <button onClick={onRetry} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Try again</button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10 text-slate-800">
      <header className="flex items-center gap-4 rounded-3xl border border-emerald-100 bg-white px-5 py-4 shadow-sm sm:px-7">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl" aria-hidden="true">{greeting.emoji || '🌞'}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-700">{greeting.amharic}</p>
            <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">Hi, {firstName}!</h1>
            <p className="text-sm text-slate-500">Ready for a little learning today?</p>
          </div>
        </div>
      </header>

      {/* School Announcements */}
      {announcements.length > 0 && (
        <section aria-label="School Announcements" className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-3xl border p-5 sm:p-6 shadow-sm transition ${
                ann.priority === 'urgent'
                  ? 'bg-rose-50/90 border-rose-200'
                  : ann.priority === 'important'
                  ? 'bg-amber-50/90 border-amber-200'
                  : 'bg-emerald-50/90 border-emerald-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl" aria-hidden="true">
                  📢
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-200 text-rose-800'
                        : ann.priority === 'important'
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      {ann.priority === 'urgent' ? 'Urgent Notice' : ann.priority === 'important' ? 'Important' : 'School Announcement'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {ann.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {ann.message || ann.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {lesson ? (
        <PrimaryLessonCard lesson={lesson} />
      ) : courses[0] ? (
        <Link to={`/child/courses/${courses[0].id}`} className="group flex flex-col gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 p-6 text-white shadow-lg transition hover:shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-100">Your learning path</span>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">{courses[0].title}</h2>
            <p className="mt-1 text-emerald-50">Pick up where you left off.</p>
          </div>
          <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-lg font-black text-emerald-800 shadow-sm transition group-hover:translate-y-[-2px]">Start learning <span aria-hidden="true">→</span></span>
        </Link>
      ) : (
        <section className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/70 px-6 py-10 text-center">
          <span className="text-5xl" aria-hidden="true">📚</span>
          <h2 className="mt-3 text-xl font-black text-slate-900">Your learning path is getting ready</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">Your teacher will add a course here soon. Come back to start learning together.</p>
        </section>
      )}

      <section aria-label="Your progress" className="grid grid-cols-3 divide-x divide-slate-100 rounded-3xl border border-slate-100 bg-white py-4 shadow-sm">
        <ProgressItem icon="📘" value={stats.total_courses || courses.length} label="Courses" />
        <ProgressItem icon="✅" value={(stats.completed_activities || 0) + (stats.completed_quizzes || 0)} label="Activities done" />
        <ProgressItem icon="🔥" value={data?.learning_streak || 0} label="Day streak" />
      </section>

      {homePins.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Picked for you</p>
              <h2 className="text-xl font-black text-slate-900">A little extra practice</h2>
            </div>
            {homePins.length > 3 && <Link to="/child/activities" className="text-sm font-bold text-emerald-800 underline-offset-4 hover:underline">See all</Link>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {homePins.slice(0, 3).map((pin, index) => <PracticeTile key={pin.pin_id} pin={pin} index={index} />)}
          </div>
        </section>
      )}

      {words.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Say it out loud</p>
            <p className="font-bold text-slate-800">Practice a new word</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {words.slice(0, 3).map((item) => (
              <button key={item.word} onClick={() => voice.speak([{ text: item.word, lang: 'am' }])} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:border-amber-400 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
                <span className="mr-1" aria-hidden="true">{item.emoji}</span>{item.word}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProgressItem({ icon, value, label }) {
  return (
    <div className="px-2 text-center">
      <span className="text-xl" aria-hidden="true">{icon}</span>
      <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

function PracticeTile({ pin, index }) {
  const meta = tileMetaFor(pin);
  const isPractice = ['letter_tracing', 'counting', 'matching'].includes(pin.kind);
  const to = isPractice ? `/child/practice/${pin.id}` : `/child/lessons/${pin.lesson_id}`;
  return (
    <Link to={to} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" style={{ animationDelay: `${index * 0.08}s` }}>
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl transition group-hover:scale-105" aria-hidden="true">{meta.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-black text-slate-900">{pin.title}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{pin.lesson_title || (isPractice ? 'Practice game' : 'Lesson')}</span>
      </span>
      <span className="text-xl font-black text-emerald-700" aria-hidden="true">→</span>
    </Link>
  );
}

function PrimaryLessonCard({ lesson }) {
  const progress = Math.min(100, Math.max(0, Number(lesson.lesson_progress) || 0));
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-700 to-teal-600 p-6 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-5 -top-8 select-none text-[9rem] opacity-[0.08]" aria-hidden="true">✦</div>
      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-100">Your next lesson</p>
          <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{lesson.title}</h2>
          <p className="mt-1 truncate text-sm font-medium text-emerald-100">{lesson.course_title}</p>
          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex justify-between text-xs font-bold text-emerald-50"><span>Lesson progress</span><span>{progress}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/20" role="progressbar" aria-label="Lesson progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <Link to={`/child/lessons/${lesson.id}`} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-amber-300 px-7 py-4 text-lg font-black text-emerald-950 shadow-md transition hover:bg-amber-200 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <span className="text-2xl" aria-hidden="true">▶</span> Continue
        </Link>
      </div>
    </section>
  );
}
