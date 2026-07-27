import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
      if (err.response?.data?.code === 'PENDING_APPROVAL') {
        setError('Your account is pending administrator approval. Please wait for confirmation.');
      }
    } finally {
      setSubmitting(false);
      setLoading(false);
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-lg">
              <span className="text-3xl">🎓</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Brana Youth Academy</h1>
              <p className="text-xs text-white/70">Learning Hub</p>
            </div>
          </div>
          <div className="hidden md:block">
            <span className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/20">
              ✨ Where Young Minds Shine
            </span>
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
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl transition group-focus-within:scale-110">📧</span>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="you@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/80 py-4 pl-12 pr-4 text-base text-slate-800 transition-all duration-300 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 hover:border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
                    Password
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl transition group-focus-within:scale-110">🔒</span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/80 py-4 pl-12 pr-14 text-base text-slate-800 transition-all duration-300 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 hover:border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xl hover:scale-110 transition-transform"
                    >
                      {showPassword ? '🙈' : '👁️'}
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
                  {loading ? (
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