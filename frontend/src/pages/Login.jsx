import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../utils/roles';

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ off }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

export default function Login() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(ROLE_HOME[user.role] || '/', { replace: true });
    }
  }, [user, authLoading, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(ROLE_HOME[loggedInUser.role] || '/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
      if (err.response?.data?.code === 'PENDING_APPROVAL') {
        setError('Your account is pending administrator approval. Please wait for confirmation.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-600 via-sky-500 to-pink-500 animate-gradient">
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)rotate(0deg)} 50%{transform:translateY(-20px)rotate(5deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)rotate(0deg)} 50%{transform:translateY(-15px)rotate(-3deg)} }
        @keyframes float3 { 0%,100%{transform:translateY(0)rotate(0deg)} 50%{transform:translateY(-25px)rotate(4deg)} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(139,92,246,0.3)} 50%{box-shadow:0 0 40px rgba(139,92,246,0.6)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .animate-gradient { animation: gradientShift 8s ease infinite; background-size: 200% 200%; }
        .float-1 { animation: float 6s ease-in-out infinite; }
        .float-2 { animation: float2 8s ease-in-out infinite 1s; }
        .float-3 { animation: float3 7s ease-in-out infinite 2s; }
        .slide-up { animation: slideUp 0.6s ease-out both; }
        .slide-up-delay-1 { animation: slideUp 0.6s ease-out 0.1s both; }
        .slide-up-delay-2 { animation: slideUp 0.6s ease-out 0.2s both; }
        .slide-up-delay-3 { animation: slideUp 0.6s ease-out 0.3s both; }
        .slide-up-delay-4 { animation: slideUp 0.6s ease-out 0.4s both; }
      `}</style>

      <div className="absolute inset-0 opacity-15">
        <div className="absolute left-[10%] top-[20%] h-40 w-40 rounded-full bg-white/30 blur-[80px] float-1" />
        <div className="absolute right-[15%] top-[10%] h-52 w-52 rounded-full bg-yellow-300/30 blur-[100px] float-2" />
        <div className="absolute bottom-[15%] left-[30%] h-48 w-48 rounded-full bg-emerald-300/30 blur-[90px] float-3" />
        <div className="absolute top-[40%] right-[5%] h-36 w-36 rounded-full bg-purple-300/30 blur-[80px] float-1" />
        <div className="absolute bottom-[25%] right-[25%] h-44 w-44 rounded-full bg-blue-200/30 blur-[100px] float-2" />
        <div className="absolute top-[60%] left-[5%] h-32 w-32 rounded-full bg-pink-200/30 blur-[70px] float-3" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 md:px-12 py-5">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-lg">
              <span className="text-3xl">🎓</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Children Learning Hub</h1>
              <p className="text-xs text-white/70">Learning Portal</p>
            </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/"
              className="hidden sm:flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Home
            </Link>
            <Link
              to="/"
              className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-all"
              title="Back to Home"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg">
            <div className="mb-8 text-center slide-up">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
                <span className="text-5xl">🎓</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white mb-2">Welcome Back!</h1>
              <p className="text-lg text-white/80 font-light">Log in to continue your learning journey</p>
            </div>

            <div className="rounded-3xl bg-white/90 backdrop-blur-2xl p-8 md:p-10 shadow-2xl border border-white/30 slide-up-delay-1">
              {error && (
                <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-start gap-3">
                  <span className="text-xl mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative group">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-violet-500"><MailIcon /></span>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="you@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/80 py-4 pl-12 pr-4 text-base text-slate-800 transition-all duration-300 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 hover:border-slate-300"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
                    Password
                  </label>
                  <div className="relative group">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-violet-500"><LockIcon /></span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/80 py-4 pl-12 pr-14 text-base text-slate-800 transition-all duration-300 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 hover:border-slate-300"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    >
                      <EyeIcon off={showPassword} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-600 font-medium">Remember me</span>
                  </label>
                  <a href="#" className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-sky-500 py-4 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:from-violet-600 hover:to-sky-600 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="h-6 w-6 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    '🚀 Log In'
                  )}
                </button>
              </form>

              {/* Google Sign-In Button - Disabled until OAuth is configured */}
              {/* 
              <button
                type="button"
                onClick={() => window.location.href = `http://localhost:5000/api/auth/google`}
                className="mt-6 w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white py-4 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-lg"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              */}

              <div className="my-8 flex items-center">
                <div className="flex-1 border-t border-slate-200" />
                <span className="mx-4 text-sm text-slate-400 font-medium">— or —</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold text-violet-600 hover:text-violet-700 transition-all duration-200 hover:underline underline-offset-4 decoration-2">
                    Create a Parent Account ✨
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-6 slide-up-delay-2">
              <span className="flex items-center gap-2 text-sm text-white/70 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Secure
              </span>
              <span className="flex items-center gap-2 text-sm text-white/70 font-medium">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" /> Encrypted
              </span>
              <span className="flex items-center gap-2 text-sm text-white/70 font-medium">
                <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" /> Child-Safe
              </span>
            </div>
          </div>
        </main>

        <footer className="px-6 py-4 text-center slide-up-delay-4">
          <p className="text-sm text-white/50 font-medium">
            © {new Date().getFullYear()} Brana Youth Academy. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
