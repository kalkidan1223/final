import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ChildLearningAnimation from '../components/ChildLearningAnimation';
import ThemeToggle from '../components/ThemeToggle';
import ChildLearningVideoShowcase from '../components/ChildLearningVideoShowcase';

/* ─── Scroll Reveal Hook ─── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Nav ─── */
function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Home',     href: '#home' },
    { label: 'About',    href: '#about' },
    { label: 'Learning', href: '#learning' },
    { label: 'Contact',  href: '#contact' },
  ];

  function scrollTo(href) {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-md border-b border-slate-200/80 dark:border-slate-800'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => scrollTo('#home')}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-indigo-300 transition-shadow">
              <span className="text-lg">🎓</span>
            </div>
            <span className={`font-bold text-base hidden sm:block transition-colors ${scrolled ? 'text-slate-800 dark:text-white' : 'text-white'}`}>
              Children Learning Hub
            </span>
          </button>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  scrolled
                    ? 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Night Mode & Auth */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/login')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                scrolled
                  ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-indigo-300 active:scale-95"
            >
              Sign Up
            </button>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
            }`}
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-0.5 bg-current mb-1.5 transition-all" style={open ? { transform: 'rotate(45deg) translate(4px, 4px)' } : {}} />
            <span className="block w-5 h-0.5 bg-current mb-1.5 transition-all" style={open ? { opacity: 0 } : {}} />
            <span className="block w-5 h-0.5 bg-current transition-all" style={open ? { transform: 'rotate(-45deg) translate(4px, -4px)' } : {}} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-xl animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {links.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-4 py-2.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-medium text-sm transition-colors"
              >
                {l.label}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-2 space-y-2">
              <div className="px-4 py-1 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Theme</span><ThemeToggle /></div>
              <button
                onClick={() => { setOpen(false); navigate('/login'); }}
                className="block w-full text-left px-4 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold text-sm"
              >
                Login
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/signup'); }}
                className="block w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm text-center"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 65%, #6d28d9 100%)' }}
    >
      {/* Ambient Child Learning in Soft Light Animation */}
      <ChildLearningAnimation mode="hero" />
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 animate-blob"
          style={{ background: 'radial-gradient(circle, #818cf8, #6366f1)' }}
        />
        <div
          className="absolute top-1/2 -right-24 w-80 h-80 rounded-full opacity-15 animate-blob delay-300"
          style={{ background: 'radial-gradient(circle, #a78bfa, #7c3aed)', animationDelay: '3s' }}
        />
        <div
          className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full opacity-20 animate-blob"
          style={{ background: 'radial-gradient(circle, #c4b5fd, #8b5cf6)', animationDelay: '6s' }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 pt-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div className="text-center lg:text-left animate-fade-in-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Brana Youth Academy
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Welcome to{' '}
              <span
                className="animate-gradient"
                style={{
                  background: 'linear-gradient(90deg, #a5b4fc, #c4b5fd, #f9a8d4, #a5b4fc)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundSize: '300% 300%',
                }}
              >
                Children Learning Hub
              </span>
            </h1>

            <p className="text-lg text-white/70 mb-10 max-w-xl leading-relaxed mx-auto lg:mx-0">
              An interactive learning platform that supports children, parents, and instructors
              in a connected learning environment.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3.5 bg-white text-indigo-700 rounded-xl font-bold text-base hover:bg-indigo-50 transition-all shadow-xl hover:shadow-white/20 active:scale-95"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-3.5 bg-indigo-500/30 backdrop-blur-sm border border-white/30 text-white rounded-xl font-bold text-base hover:bg-indigo-500/50 transition-all active:scale-95"
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="flex justify-center lg:justify-end animate-fade-in-right delay-200">
            <div className="relative w-full max-w-sm lg:max-w-md">
              {/* Main card */}
              <div className="glass-dark rounded-3xl p-6 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/40 flex items-center justify-center text-2xl">
                    📚
                  </div>
                  <div>
                    <div className="font-bold text-white">Today's Learning</div>
                    <div className="text-white/50 text-sm">4 activities ready</div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { emoji: '🔤', label: 'Amharic Reading', progress: 75, color: '#818cf8' },
                    { emoji: '🔢', label: 'Mathematics', progress: 50, color: '#34d399' },
                    { emoji: '📖', label: 'English Reading', progress: 90, color: '#f472b6' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xl">{item.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm text-white/70 mb-1">{item.label}</div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${item.progress}%`, background: item.color }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-white/50">{item.progress}%</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { emoji: '🏆', value: '24', label: 'Points Today' },
                    { emoji: '⭐', value: '5', label: 'Day Streak' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                      <div className="text-2xl mb-1">{stat.emoji}</div>
                      <div className="text-xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-white/50">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-5 -right-5 bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-float">
                ✓ New Lesson
              </div>
              <div className="absolute -bottom-4 -left-4 bg-yellow-400 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-float delay-300" style={{ animationDelay: '1.5s' }}>
                🌟 Well Done!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 animate-float-slow">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

/* ─── Info / 3 Pillars ─── */
function InfoSection() {
  const [ref, visible] = useReveal();

  const pillars = [
    {
      emoji: '📚',
      title: 'Learn',
      desc: 'Structured, curriculum-aligned learning materials designed specifically for primary children.',
      border: 'border-indigo-200/90 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-500',
      iconGradient: 'from-blue-600 to-indigo-600',
      titleColor: 'text-indigo-600 dark:text-indigo-400',
      shadow: 'shadow-xl shadow-indigo-200/40 hover:shadow-2xl hover:shadow-indigo-300/40',
      badge: 'Interactive Content',
    },
    {
      emoji: '✏️',
      title: 'Practice',
      desc: 'Engaging exercises, voice-assisted letter tracing, pronunciation audio, and fun quizzes.',
      border: 'border-emerald-200/90 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-500',
      iconGradient: 'from-emerald-600 to-teal-600',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      shadow: 'shadow-xl shadow-emerald-200/40 hover:shadow-2xl hover:shadow-emerald-300/40',
      badge: 'Multisensory Practice',
    },
    {
      emoji: '🌱',
      title: 'Grow',
      desc: 'Build fundamental academic skills, earn points and badges, and celebrate learning milestones.',
      border: 'border-purple-200/90 dark:border-purple-800/60 hover:border-purple-400 dark:hover:border-purple-500',
      iconGradient: 'from-purple-600 to-pink-600',
      titleColor: 'text-purple-600 dark:text-purple-400',
      shadow: 'shadow-xl shadow-purple-200/40 hover:shadow-2xl hover:shadow-purple-300/40',
      badge: 'Confidence & Streaks',
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-[#e0e7ff] via-[#ede9fe] to-[#fce7f3]/70 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950 relative overflow-hidden transition-colors" ref={ref}>
      {/* Floating Animated Background Blobs & Shapes */}
      <div className="absolute top-10 left-12 w-80 h-80 bg-indigo-300/35 dark:bg-indigo-900/20 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-10 right-12 w-80 h-80 bg-pink-300/35 dark:bg-pink-900/20 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-300/25 dark:bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Playful Floating Educational Icons */}
      <div className="absolute top-16 left-8 text-2xl opacity-40 select-none animate-float">⭐</div>
      <div className="absolute top-28 right-12 text-2xl opacity-40 select-none animate-float-slow" style={{ animationDelay: '1s' }}>📖</div>
      <div className="absolute bottom-16 left-20 text-2xl opacity-40 select-none animate-float" style={{ animationDelay: '2s' }}>✨</div>
      <div className="absolute bottom-24 right-20 text-2xl opacity-40 select-none animate-float-slow" style={{ animationDelay: '3s' }}>🎈</div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/90 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm mb-4">
            ✨ Interactive Learning Method
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            Learn. Practice. Grow.
          </h2>
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Children Learning Hub provides educational learning materials,
            activities, and learning support for children.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className={`rounded-3xl border-2 ${p.border} bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-8 text-center
                transition-all duration-500 hover:-translate-y-2 ${p.shadow} dark:shadow-none group
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms' }}
            >
              <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr ${p.iconGradient} text-white flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                {p.emoji}
              </div>
              <h3 className={`text-2xl font-black mb-2 ${p.titleColor}`}>
                {p.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium mb-4">
                {p.desc}
              </p>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {p.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Learning Areas ─── */
function LearningAreasSection() {
  const [ref, visible] = useReveal();

  const areas = [
    {
      emoji: '🔤',
      title: 'Amharic Literacy',
      desc: 'Fidel tracing, alphabet pronunciation, vocabulary, and sentence building.',
      iconBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
      borderHover: 'hover:border-rose-400 dark:hover:border-rose-500/60',
      badge: 'Grade 1–6',
      badgeColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
    {
      emoji: '🔡',
      title: 'English Language',
      desc: 'Reading phonics, spelling, sight words, and reading comprehension.',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
      borderHover: 'hover:border-blue-400 dark:hover:border-blue-500/60',
      badge: 'Grade 1–6',
      badgeColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    {
      emoji: '🔢',
      title: 'Mathematics',
      desc: 'Counting, addition, shapes, patterns, multiplication, and logical puzzles.',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-500/60',
      badge: 'Visual Math',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      emoji: '📖',
      title: 'Reading & Stories',
      desc: 'Illustrated interactive stories, bedtime reading, and listening comprehension.',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
      borderHover: 'hover:border-amber-400 dark:hover:border-amber-500/60',
      badge: 'Audio Narration',
      badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      emoji: '🌍',
      title: 'General Knowledge',
      desc: 'Science facts, nature, animals, world geography, and community awareness.',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
      borderHover: 'hover:border-purple-400 dark:hover:border-purple-500/60',
      badge: 'Curiosity & STEM',
      badgeColor: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
  ];

  return (
    <section id="learning" className="py-24 bg-gradient-to-b from-[#fce7f3]/70 via-[#e0f2fe] to-[#f0fdf4] dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950 relative overflow-hidden transition-colors" ref={ref}>
      {/* Colorful Floating Orbs in Background */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-300/35 dark:bg-blue-900/20 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-300/35 dark:bg-emerald-900/20 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-amber-300/25 dark:bg-amber-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Child-Friendly Emojis */}
      <div className="absolute top-14 left-16 text-3xl opacity-40 select-none animate-float">🎨</div>
      <div className="absolute top-24 right-20 text-3xl opacity-40 select-none animate-float-slow" style={{ animationDelay: '1.2s' }}>🧩</div>
      <div className="absolute bottom-20 left-12 text-3xl opacity-40 select-none animate-float" style={{ animationDelay: '2.4s' }}>🚀</div>
      <div className="absolute bottom-16 right-16 text-3xl opacity-40 select-none animate-float-slow" style={{ animationDelay: '1.8s' }}>⭐</div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/90 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm mb-4">
            📚 Comprehensive Curriculum
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            Learning Areas
          </h2>
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto font-medium">
            Explore subjects and grade-appropriate content designed to inspire confidence and curiosity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((a, i) => (
            <div
              key={a.title}
              className={`rounded-3xl border-2 border-white/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-6 sm:p-7 flex flex-col justify-between
                transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl shadow-xl shadow-slate-200/60 dark:shadow-none ${a.borderHover} cursor-pointer group backdrop-blur-md
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: visible ? `${i * 80}ms` : '0ms' }}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${a.iconBg} flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform`}>
                    {a.emoji}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${a.badgeColor}`}>
                    {a.badge}
                  </span>
                </div>

                <h3 className="font-black text-lg text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {a.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                  {a.desc}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Explore Lessons</span>
                <span>➔</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── About ─── */
function AboutSection() {
  const [ref, visible] = useReveal();

  return (
    <section id="about" className="py-24 bg-gradient-to-b from-[#f0fdf4] via-[#fef9c3]/50 to-[#ede9fe] dark:from-slate-950 dark:via-slate-900/70 dark:to-slate-950 relative overflow-hidden transition-colors" ref={ref}>
      {/* Background Soft Color Blurs */}
      <div className="absolute top-10 left-12 w-80 h-80 bg-emerald-300/30 dark:bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-12 w-80 h-80 bg-purple-300/30 dark:bg-purple-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/90 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm mb-4">
              🌟 Connected Ecosystem
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
              About Children Learning Hub
            </h2>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6 font-medium">
              Children Learning Hub is designed to provide a supportive digital environment
              where children can learn and practice while parents and instructors support
              their learning journey.
            </p>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
              The platform serves children aged 5–12, with parent-guided learning for
              younger children and independent student accounts for older ones — all
              managed with full administrator oversight.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shadow-sm">✓</span>
                Dual Learning Modes: Parent-Managed & Independent Student
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm shadow-sm">✓</span>
                Interactive letter tracing, pronunciation audio, and fun quizzes
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                <span className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm shadow-sm">✓</span>
                Comprehensive teacher reviews and transparent family progress
              </div>
            </div>
          </div>

          {/* Visual */}
          <div
            className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
          >
            <div className="rounded-3xl p-8 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-2xl border border-indigo-400/20">
              <div className="space-y-4">
                {[
                  { emoji: '👨‍👩‍👧', role: 'Parents',     desc: 'Manage and monitor learning' },
                  { emoji: '👩‍🏫', role: 'Instructors', desc: 'Create lessons and activities' },
                  { emoji: '👦',   role: 'Children',    desc: 'Learn at their own pace' },
                  { emoji: '🛡️',  role: 'Admins',      desc: 'Oversee the platform' },
                ].map((r) => (
                  <div key={r.role} className="flex items-center gap-4 bg-white/10 hover:bg-white/15 rounded-2xl px-5 py-4 border border-white/10 transition backdrop-blur-sm">
                    <span className="text-2xl">{r.emoji}</span>
                    <div>
                      <div className="font-bold text-white">{r.role}</div>
                      <div className="text-white/70 text-sm">{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA / Contact ─── */
function CTASection() {
  const navigate = useNavigate();
  const [ref, visible] = useReveal();

  return (
    <section id="contact" className="py-24 bg-gradient-to-b from-[#ede9fe] to-[#c7d2fe] dark:from-slate-950 dark:to-slate-900 relative overflow-hidden transition-colors" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div
          className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div
            className="rounded-3xl p-10 sm:p-14 shadow-2xl text-white overflow-hidden relative border border-indigo-400/25"
            style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #7c3aed 75%, #9333ea 100%)' }}
          >
            {/* Decorative blobs */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/10 rounded-full blur-xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-tight">
                Ready to Start Learning?
              </h2>
              <p className="text-indigo-100 text-base sm:text-lg mb-8 max-w-xl mx-auto font-medium">
                Join Children Learning Hub today and give your child a supportive,
                structured learning environment.
              </p>
              <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
                <button
                  onClick={() => navigate('/signup')}
                  className="px-8 py-3.5 bg-white text-indigo-700 rounded-xl font-extrabold text-base hover:bg-indigo-50 transition-all active:scale-95 shadow-xl hover:shadow-2xl"
                >
                  Create Account
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-3.5 bg-white/15 border border-white/30 text-white rounded-xl font-extrabold text-base hover:bg-white/25 transition-all active:scale-95 backdrop-blur-sm"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  function scrollTo(href) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm shadow-md">
              🎓
            </div>
            <span className="text-white font-bold text-base">Children Learning Hub</span>
          </div>
          <p className="text-sm text-slate-400 text-center max-w-xs">
            Making learning fun, interactive, and personalized for every child.
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-8">
          {[
            { label: 'Home',     href: '#home' },
            { label: 'About',    href: '#about' },
            { label: 'Learning', href: '#learning' },
            { label: 'Contact',  href: '#contact' },
          ].map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="hover:text-white transition-colors"
            >
              {l.label}
            </button>
          ))}
          <Link to="/login" className="hover:text-white transition-colors">Login</Link>
          <Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link>
        </nav>

        <div className="border-t border-slate-800 pt-6 text-center text-sm text-slate-600">
          © {new Date().getFullYear()} Children Learning Hub · Brana Youth Academy
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function Home() {
  return (
    <div className="min-h-screen bg-[#ede9fe]/40 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <HeroSection />
      <InfoSection />
      <ChildLearningVideoShowcase />
      <LearningAreasSection />
      <AboutSection />
      <CTASection />
      <Footer />
    </div>
  );
}
