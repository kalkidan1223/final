import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
          ? 'bg-white/95 backdrop-blur-xl shadow-md border-b border-slate-100'
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
            <span className={`font-bold text-base hidden sm:block transition-colors ${scrolled ? 'text-slate-800' : 'text-white'}`}>
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
                    ? 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                scrolled
                  ? 'text-indigo-600 hover:bg-indigo-50'
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
            <div className="border-t border-slate-100 mt-2 pt-2 space-y-1">
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
      desc: 'Access learning materials.',
      bg: 'from-indigo-50 to-indigo-100',
      border: 'border-indigo-200',
      icon: 'text-indigo-600',
    },
    {
      emoji: '✏️',
      title: 'Practice',
      desc: 'Complete educational activities.',
      bg: 'from-emerald-50 to-emerald-100',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
    },
    {
      emoji: '🌱',
      title: 'Grow',
      desc: 'Develop knowledge and skills.',
      bg: 'from-purple-50 to-purple-100',
      border: 'border-purple-200',
      icon: 'text-purple-600',
    },
  ];

  return (
    <section className="py-20 bg-white" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Learn. Practice. Grow.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Children Learning Hub provides educational learning materials,
            activities, and learning support for children.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className={`rounded-2xl border ${p.border} bg-gradient-to-br ${p.bg} p-8 text-center
                transition-all duration-700 hover:-translate-y-1 hover:shadow-lg
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms' }}
            >
              <div className={`text-4xl mb-4`}>{p.emoji}</div>
              <h3 className={`text-xl font-bold mb-2 ${p.icon}`}>{p.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{p.desc}</p>
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
    { emoji: '🔤', title: 'Amharic',           desc: 'Letters, words, and language practice.',          color: 'bg-red-50 border-red-200 hover:border-red-300' },
    { emoji: '🔡', title: 'English',            desc: 'Reading, vocabulary, and comprehension.',         color: 'bg-blue-50 border-blue-200 hover:border-blue-300' },
    { emoji: '🔢', title: 'Mathematics',        desc: 'Numbers, counting, and problem solving.',         color: 'bg-green-50 border-green-200 hover:border-green-300' },
    { emoji: '📖', title: 'Reading',            desc: 'Stories and reading comprehension.',              color: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' },
    { emoji: '🌍', title: 'General Knowledge',  desc: 'Age-appropriate world knowledge.',                color: 'bg-purple-50 border-purple-200 hover:border-purple-300' },
  ];

  return (
    <section id="learning" className="py-20 bg-slate-50" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Learning Areas
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Explore the subjects available on our platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {areas.map((a, i) => (
            <div
              key={a.title}
              className={`rounded-2xl border ${a.color} bg-white p-6 flex items-start gap-4
                transition-all duration-700 cursor-default
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: visible ? `${i * 80}ms` : '0ms' }}
            >
              <div className="text-3xl flex-shrink-0">{a.emoji}</div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{a.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{a.desc}</p>
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
    <section id="about" className="py-20 bg-white" ref={ref}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">
              About Children Learning Hub
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed mb-6">
              Children Learning Hub is designed to provide a supportive digital environment
              where children can learn and practice while parents and instructors support
              their learning journey.
            </p>
            <p className="text-base text-slate-400 leading-relaxed">
              The platform serves children aged 5–12, with parent-guided learning for
              younger children and independent student accounts for older ones — all
              managed with full administrator oversight.
            </p>
          </div>

          {/* Visual */}
          <div
            className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
          >
            <div className="rounded-3xl p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl">
              <div className="space-y-5">
                {[
                  { emoji: '👨‍👩‍👧', role: 'Parents',     desc: 'Manage and monitor learning' },
                  { emoji: '👩‍🏫', role: 'Instructors', desc: 'Create lessons and activities' },
                  { emoji: '👦',   role: 'Children',    desc: 'Learn at their own pace' },
                  { emoji: '🛡️',  role: 'Admins',      desc: 'Oversee the platform' },
                ].map((r) => (
                  <div key={r.role} className="flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-4 border border-white/10">
                    <span className="text-2xl">{r.emoji}</span>
                    <div>
                      <div className="font-semibold">{r.role}</div>
                      <div className="text-white/60 text-sm">{r.desc}</div>
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
    <section id="contact" className="py-20 bg-slate-50" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div
          className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div
            className="rounded-3xl p-10 sm:p-14 shadow-2xl text-white overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)' }}
          >
            {/* Decorative blobs */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                Ready to Start Learning?
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
                Join Children Learning Hub today and give your child a supportive,
                structured learning environment.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/signup')}
                  className="px-8 py-3.5 bg-white text-indigo-700 rounded-xl font-bold text-base hover:bg-indigo-50 transition-all active:scale-95 shadow-xl"
                >
                  Create Account
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-3.5 bg-white/10 border border-white/30 text-white rounded-xl font-bold text-base hover:bg-white/20 transition-all active:scale-95 backdrop-blur-sm"
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
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm shadow-md">
              🎓
            </div>
            <span className="text-white font-bold text-base">Children Learning Hub</span>
          </div>
          <p className="text-sm text-slate-500 text-center max-w-xs">
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <InfoSection />
      <LearningAreasSection />
      <AboutSection />
      <CTASection />
      <Footer />
    </div>
  );
}
