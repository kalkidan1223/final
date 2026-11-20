import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import ThemeToggle from '../../components/ThemeToggle';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [resending, setResending] = useState(false);

  // Auto-verify if token is provided in query params (clicked link in email)
  useEffect(() => {
    if (tokenParam) {
      handleAutoVerify(tokenParam);
    }
  }, [tokenParam]);

  async function handleAutoVerify(token) {
    setAutoVerifying(true);
    setError('');
    try {
      const res = await axiosClient.post('/auth/verify-email/confirm', { token });
      setSuccess(true);
      setSuccessMessage(res.data?.message || 'Email verified successfully! Your account is now pending administrator review.');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification link is invalid or has expired. Please enter your code or request a new one.');
    } finally {
      setAutoVerifying(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    if (!code || code.trim().length === 0) {
      setError('Please enter your 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.post('/auth/verify-email/confirm', {
        code: code.trim(),
        email: email ? email.trim() : undefined,
      });
      setSuccess(true);
      setSuccessMessage(res.data?.message || 'Email verified successfully! Your registration is now pending administrator approval.');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address to resend verification.');
      return;
    }
    setResending(true);
    setResendStatus('');
    setError('');
    try {
      const res = await axiosClient.post('/auth/verify-email/resend', { email: email.trim() });
      setResendStatus(res.data?.message || 'A new verification email has been sent. Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col justify-between"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute left-[10%] top-[20%] h-52 w-52 rounded-full bg-indigo-300/30 blur-[90px]" />
        <div className="absolute right-[15%] bottom-[20%] h-60 w-60 rounded-full bg-violet-400/30 blur-[100px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-3xl">🎓</span>
          <span className="text-lg font-bold text-white tracking-wide">Children Learning Hub</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-3xl mb-4 backdrop-blur-md shadow-inner">
              ✉️
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Verify Your Email</h1>
            <p className="text-indigo-200 text-sm">
              Confirm your email address to complete your registration
            </p>
          </div>

          <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-8 shadow-2xl border border-white/30 dark:border-slate-800">
            {autoVerifying ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Verifying your email...</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please hold on while we validate your link.</p>
              </div>
            ) : success ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">Email Verified!</h2>
                
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 mb-6 text-left">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                    {successMessage}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 mb-6 text-xs text-slate-600 dark:text-slate-300 text-left space-y-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>📋</span> Next Step: Administrator Approval
                  </p>
                  <p>
                    Our administrative team reviews all new instructor and parent applications. You will receive an email confirmation as soon as your account is approved.
                  </p>
                </div>

                <Link
                  to="/login"
                  className="w-full inline-block rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 font-bold text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Return to Login
                </Link>
              </div>
            ) : (
              <div>
                {error && (
                  <div className="mb-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-300 flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <span className="leading-tight">{error}</span>
                  </div>
                )}

                {resendStatus && (
                  <div className="mb-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                    <span className="text-lg">✅</span>
                    <span className="leading-tight">{resendStatus}</span>
                  </div>
                )}

                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-all text-sm"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                        6-Digit Verification Code
                      </label>
                      <span className="text-xs text-slate-400">From your email</span>
                    </div>
                    <input
                      type="text"
                      maxLength={10}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. 583921"
                      className="w-full tracking-widest text-center text-xl font-mono font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100 mt-2"
                  >
                    {loading ? 'Verifying...' : 'Verify Code & Submit →'}
                  </button>
                </form>

                {/* Resend link */}
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Didn't receive the verification code? Check your spam folder or request a new one:
                  </p>
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resending}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                  >
                    {resending ? 'Sending email...' : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-indigo-200/60">
        © {new Date().getFullYear()} Children Learning Hub. All rights reserved.
      </footer>
    </div>
  );
}
