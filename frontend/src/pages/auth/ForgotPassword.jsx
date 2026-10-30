import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Hits POST /api/password-reset/request (passwordResetController.js)
      await axiosClient.post('/password-reset/request', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}
    >
      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute left-[10%] top-[20%] h-40 w-40 rounded-full bg-white/30 blur-[80px]" />
        <div className="absolute right-[15%] bottom-[20%] h-52 w-52 rounded-full bg-indigo-300/30 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl">🎓</div>
            <span className="text-white font-bold">Children Learning Hub</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Forgot Password?</h1>
          <p className="text-white/60">Enter your email and we'll send you a reset link.</p>
        </div>

        <div className="rounded-3xl bg-white/95 backdrop-blur-2xl p-8 shadow-2xl border border-white/30">
          {/* Success state */}
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Check Your Email</h2>
              <p className="text-slate-500 text-sm mb-6">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox (and spam folder).
              </p>
              <Link
                to="/login"
                className="inline-block rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-8 py-3 font-bold text-white shadow-lg hover:scale-105 transition-transform"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/80 py-4 px-4 text-base text-slate-800 transition-all focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending…
                    </span>
                  ) : '📧 Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                  ← Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
