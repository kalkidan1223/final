import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdPlayArrow,
  MdPause,
  MdVolumeUp,
  MdVolumeOff,
  MdFullscreen,
  MdCheckCircle,
  MdStar,
  MdAutoAwesome,
  MdTouchApp,
  MdHeadphones,
  MdBrightnessAuto,
} from 'react-icons/md';

const SCENES = [
  {
    id: 'tracing',
    title: 'Letter Tracing ✍️',
    subtitle: 'Tracing Amharic & English letters with guided stroke arrows',
    subject: 'Amharic & English Literacy',
    badge: 'Ages 5–8',
    color: 'from-amber-400 to-orange-500',
    accentText: 'text-amber-500',
    description: 'Children trace alphabet strokes with touch assistance, glowing sparkle trails, and instant audio encouragement.',
  },
  {
    id: 'audio',
    title: 'Phonics & Speech 🎧',
    subtitle: 'Native speaker pronunciation audio with repeat-after-me practice',
    subject: 'Voice & Language Practice',
    badge: 'Audio-Assisted',
    color: 'from-blue-500 to-indigo-600',
    accentText: 'text-blue-500',
    description: 'Clear native voice audio pronounces each letter, word, and sentence, prompting children to listen and repeat.',
  },
  {
    id: 'math',
    title: 'Fun Counting 🔢',
    subtitle: 'Visual object counting with colorful fruits and animated rewards',
    subject: 'Early Mathematics',
    badge: 'Gamified Logic',
    color: 'from-emerald-500 to-teal-600',
    accentText: 'text-emerald-500',
    description: 'Visual counting with interactive items, tactile counters, and instant positive reinforcement.',
  },
  {
    id: 'quiz',
    title: 'Interactive Quizzes 🏆',
    subtitle: 'Bite-sized visual quizzes that build confidence and earn stars',
    subject: 'Knowledge Check & Streaks',
    badge: 'Point System',
    color: 'from-purple-500 to-pink-600',
    accentText: 'text-purple-500',
    description: 'Fun multiple-choice quizzes with celebratory confetti, point streaks, and instant teacher-grade telemetry.',
  },
];

export default function ChildLearningVideoShowcase() {
  const navigate = useNavigate();
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(25);
  const [seconds, setSeconds] = useState(14);

  const activeScene = SCENES[activeSceneIdx];

  // Auto-advance scenes when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveSceneIdx((idx) => (idx + 1) % SCENES.length);
          return 0;
        }
        return prev + 2.5;
      });
      setSeconds((s) => (s >= 90 ? 1 : s + 1));
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section className="py-24 bg-gradient-to-b from-[#fce7f3]/60 via-[#ede9fe]/70 to-[#e0f2fe]/80 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950 relative overflow-hidden transition-colors">
      {/* Decorative Floating Background Elements */}
      <div className="absolute top-8 left-8 w-64 h-64 bg-pink-300/30 dark:bg-pink-900/20 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-8 right-8 w-72 h-72 bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-300/20 dark:bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Child-Friendly Doodle Icons */}
      <div className="absolute top-16 left-12 text-3xl opacity-35 dark:opacity-20 animate-float select-none pointer-events-none">⭐</div>
      <div className="absolute top-28 right-16 text-3xl opacity-35 dark:opacity-20 animate-float-slow select-none pointer-events-none" style={{ animationDelay: '1.5s' }}>🎨</div>
      <div className="absolute bottom-20 left-20 text-3xl opacity-35 dark:opacity-20 animate-float select-none pointer-events-none" style={{ animationDelay: '2.5s' }}>🚀</div>
      <div className="absolute bottom-16 right-24 text-3xl opacity-35 dark:opacity-20 animate-float-slow select-none pointer-events-none" style={{ animationDelay: '3s' }}>🎈</div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 mb-4 animate-bounce">
            <MdAutoAwesome className="text-sm" />
            <span>Interactive Learning In Action</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            See How Children Learn & Play
          </h2>
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Watch our multisensory lessons combining audio, visual tracing, and interactive games designed to keep children engaged and confident.
          </p>
        </div>

        {/* Scene Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-8">
          {SCENES.map((scene, idx) => {
            const isActive = idx === activeSceneIdx;
            return (
              <button
                key={scene.id}
                onClick={() => {
                  setActiveSceneIdx(idx);
                  setProgress(0);
                }}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 shadow-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:scale-102'
                }`}
              >
                <span>{scene.title}</span>
              </button>
            );
          })}
        </div>

        {/* ── Main Video Player Frame ── */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-slate-900 p-2 sm:p-4 shadow-2xl shadow-indigo-900/30 border-4 border-slate-800/80 overflow-hidden">
          {/* Player Header Bar */}
          <div className="px-4 py-3 bg-slate-950/80 rounded-2xl flex items-center justify-between text-white text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="ml-2 font-bold text-slate-300 hidden sm:inline">
                Children Learning Hub • Interactive Visual Classroom
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>DEMO</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-bold text-[10px]">
                1080p 60fps
              </span>
            </div>
          </div>

          {/* Video Screen Content Canvas */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex flex-col items-center justify-center p-4 sm:p-8 select-none">
            {/* Background Grid & Stars */}
            <div className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Floating Praise Badges */}
            <div className="absolute top-4 left-4 bg-emerald-500/90 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-bounce">
              <MdStar className="text-amber-300 text-sm" />
              <span>Great Job! +20 Points</span>
            </div>

            <div className="absolute top-4 right-4 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-pulse">
              <span>🔥 5 Day Streak!</span>
            </div>

            {/* Scene-Specific Animations */}
            {activeSceneIdx === 0 && (
              /* SCENE 0: Letter Tracing Animation */
              <div className="flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="relative">
                  {/* Big Glowing Letter */}
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white/10 border-4 border-dashed border-amber-400/80 flex items-center justify-center relative shadow-2xl backdrop-blur-md">
                    <span className="text-7xl sm:text-8xl font-black text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,0.8)]">
                      ሀ
                    </span>

                    {/* Animated Hand/Stylus moving along letter strokes */}
                    <div
                      className="absolute w-10 h-10 rounded-full bg-white text-xl flex items-center justify-center shadow-2xl transition-all duration-700 pointer-events-none"
                      style={{
                        top: `${20 + (progress % 60)}%`,
                        left: `${25 + ((progress * 1.5) % 55)}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      ✍️
                    </div>

                    {/* Sparkle bursts */}
                    <div className="absolute -top-3 -right-3 text-2xl animate-spin text-amber-300">✨</div>
                    <div className="absolute -bottom-2 -left-2 text-xl text-yellow-300 animate-pulse">⭐</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-amber-300 font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2">
                    <span>Tracing First Amharic Letter: "Ha" (ሀ)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium">
                    "Start at the top arrow and glide down smoothly!"
                  </p>
                </div>
              </div>
            )}

            {activeSceneIdx === 1 && (
              /* SCENE 1: Phonics & Audio Waves */
              <div className="flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
                {/* Avatar with speaking soundwaves */}
                <div className="relative">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-6xl sm:text-7xl shadow-2xl ring-8 ring-blue-500/30 animate-pulse">
                    🦁
                  </div>
                  {/* Sound Wave Bars */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/80 px-4 py-2 rounded-full border border-blue-400/40">
                    <span className="w-1.5 h-4 bg-blue-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-7 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1.5 h-9 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-6 bg-cyan-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1.5 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="text-blue-300 font-extrabold text-base sm:text-lg flex items-center justify-center gap-2">
                    <MdHeadphones className="text-xl text-blue-400" />
                    <span>"Listen & Repeat: Lion • አንበሳ (Anbessa)"</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs">
                    <MdCheckCircle className="text-emerald-400" />
                    <span>Pronunciation Accuracy: 98%</span>
                  </div>
                </div>
              </div>
            )}

            {activeSceneIdx === 2 && (
              /* SCENE 2: Counting & Math Game */
              <div className="flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
                {/* Visual Math Problem: 3 Apples + 2 Apples = 5 */}
                <div className="flex items-center justify-center gap-3 sm:gap-5 bg-white/10 p-4 sm:p-6 rounded-3xl backdrop-blur-md border border-white/20">
                  <div className="flex items-center gap-1 text-3xl sm:text-4xl animate-bounce">
                    🍎🍎🍎
                  </div>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-300">+</span>
                  <div className="flex items-center gap-1 text-3xl sm:text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>
                    🍏🍏
                  </div>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-300">=</span>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-xl animate-pulse">
                    5
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-emerald-300 font-extrabold text-base sm:text-lg">
                    <span>3 Red Apples + 2 Green Apples = 5 Fruits!</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium">
                    Hands-on counting helps children visualize numbers naturally.
                  </p>
                </div>
              </div>
            )}

            {activeSceneIdx === 3 && (
              /* SCENE 3: Quiz & Star Rewards */
              <div className="flex flex-col items-center justify-center text-center space-y-4 animate-fade-in w-full max-w-md">
                <div className="w-full bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/20 text-left space-y-3">
                  <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">
                    Quick Quiz • Question 3 of 5
                  </div>
                  <div className="text-base sm:text-lg font-black text-white">
                    Which word means "Book" in Amharic?
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-purple-900/60 border border-purple-400 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-md">
                      <span>A) መጽሐፍ (Metsehaf)</span>
                      <MdCheckCircle className="text-emerald-400 text-lg" />
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs sm:text-sm font-medium flex items-center justify-between">
                      <span>B) ደብተር (Debter - Notebook)</span>
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs shadow-md">
                  <span>🎉 Perfect Score! 100% Correct</span>
                </div>
              </div>
            )}

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent flex flex-col gap-2">
              {/* Progress Timeline Bar */}
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="bg-gradient-to-r from-indigo-400 via-pink-400 to-amber-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Bottom Control Buttons */}
              <div className="flex items-center justify-between text-white text-xs sm:text-sm pt-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                    title={isPlaying ? 'Pause Demo' : 'Play Demo'}
                  >
                    {isPlaying ? <MdPause className="text-lg" /> : <MdPlayArrow className="text-lg" />}
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isMuted ? <MdVolumeOff className="text-lg" /> : <MdVolumeUp className="text-lg" />}
                  </button>

                  <span className="text-slate-400 font-mono text-xs">
                    0:{seconds < 10 ? `0${seconds}` : seconds} / 1:30
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-bold hidden sm:inline">
                    {activeScene.title}
                  </span>
                  <button
                    onClick={() => navigate('/child')}
                    className="px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-lg shadow-sm transition active:scale-95"
                  >
                    Try Interactive Portal ➔
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Value Cards Under Video */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl flex-shrink-0">
              ✍️
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                Visual Tracing & Writing
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Step-by-step stroke guides let young learners trace characters smoothly with touch or mouse.
              </p>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl flex-shrink-0">
              🎧
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                Native Audio Pronunciation
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                High-clarity recorded native audio ensures correct pronunciation in both Amharic and English.
              </p>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl flex-shrink-0">
              🏆
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                Reward Badges & Streaks
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Celebratory animations, stars, and daily streaks turn everyday learning into an enjoyable habit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

