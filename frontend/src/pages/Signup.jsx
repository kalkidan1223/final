import { useNavigate, Link } from 'react-router-dom';

// Google icon SVG component
function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Signup() {
  const navigate = useNavigate();

  function handleGoogleSignUp() {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    window.location.href = `${apiBase}/auth/google`;
  }

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

          {/* ── Sign Up with Google ── */}
          <div className="mb-6">
            <button
              onClick={handleGoogleSignUp}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-white/20 bg-white py-4 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-white/40 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg"
            >
              <GoogleIcon />
              Sign up with Google
            </button>
            <p className="text-center text-white/40 text-xs mt-3">
              New to Google sign-up? We'll ask you to choose Parent or Instructor after authentication.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-white/15" />
            <span className="text-white/40 text-sm font-medium">or sign up manually</span>
            <div className="flex-1 border-t border-white/15" />
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
