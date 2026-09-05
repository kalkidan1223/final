import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg backdrop-blur-sm">
            🎓
          </div>
          <span className="text-white font-bold text-sm hidden sm:block">Children Learning Hub</span>
        </Link>
        <Link
          to="/login"
          className="text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          Already have an account? <span className="text-indigo-300 font-semibold">Login</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl animate-fade-in-up">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Create Your Account
            </h1>
            <p className="text-white/60 text-base">
              Choose your account type to get started.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Parent Card */}
            <button
              onClick={() => navigate('/signup/parent')}
              className="group relative rounded-3xl p-8 text-left transition-all duration-300
                         border border-white/10 hover:border-indigo-400/60
                         hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-900/40
                         focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-3xl mb-6 group-hover:scale-105 transition-transform">
                👨‍👩‍👧
              </div>

              <h2 className="text-xl font-bold text-white mb-3">Parent / Guardian</h2>
              <p className="text-white/55 text-sm leading-relaxed mb-6">
                Create an account to manage and support your child's learning.
              </p>

              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold
                              group-hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30">
                Continue as Parent
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                   style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15), transparent 70%)' }} />
            </button>

            {/* Instructor Card */}
            <button
              onClick={() => navigate('/signup/instructor')}
              className="group relative rounded-3xl p-8 text-left transition-all duration-300
                         border border-white/10 hover:border-emerald-400/60
                         hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/40
                         focus:outline-none focus:ring-2 focus:ring-emerald-400"
              style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/30 border border-emerald-400/30 flex items-center justify-center text-3xl mb-6 group-hover:scale-105 transition-transform">
                👩‍🏫
              </div>

              <h2 className="text-xl font-bold text-white mb-3">Instructor</h2>
              <p className="text-white/55 text-sm leading-relaxed mb-6">
                Create an instructor account to support children's learning.
              </p>

              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold
                              group-hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30">
                Continue as Instructor
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                   style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.15), transparent 70%)' }} />
            </button>
          </div>

          <p className="text-center text-white/40 text-xs mt-8">
            By signing up, you agree to our{' '}
            <span className="text-white/60 cursor-pointer hover:text-white transition-colors">Terms of Service</span>
            {' '}and{' '}
            <span className="text-white/60 cursor-pointer hover:text-white transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </main>
    </div>
  );
}
