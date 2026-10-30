import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters',     met: password.length >= 8 },
    { label: 'Uppercase letter',  met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',  met: /[a-z]/.test(password) },
    { label: 'Number',            met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.met).length;
  const levels = [
    { label: 'Very Weak', color: 'bg-red-500',     width: '20%' },
    { label: 'Weak',      color: 'bg-orange-500',  width: '40%' },
    { label: 'Fair',      color: 'bg-yellow-500',  width: '60%' },
    { label: 'Good',      color: 'bg-teal-500',    width: '80%' },
    { label: 'Strong',    color: 'bg-emerald-500', width: '100%' },
  ];
  const level = levels[Math.min(score, 4)];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">Strength</span>
        <span className={`font-semibold ${score <= 1 ? 'text-red-500' : score <= 2 ? 'text-orange-500' : score <= 3 ? 'text-yellow-600' : 'text-emerald-500'}`}>{level.label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${level.color}`} style={{ width: password ? level.width : '0%' }} />
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-1 text-xs">
            <span className={c.met ? 'text-emerald-500' : 'text-slate-300'}>{c.met ? '✓' : '○'}</span>
            <span className={c.met ? 'text-slate-600' : 'text-slate-400'}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [verifying, setVerifying]       = useState(true);
  const [tokenValid, setTokenValid]     = useState(false);
  const [error, setError]               = useState('');

  // Verify token on mount using GET /api/password-reset/verify/:token
  useEffect(() => {
    if (!token) {
      setError('No reset token found. Please request a new reset link.');
      setVerifying(false);
      return;
    }
    axiosClient.get(`/password-reset/verify/${token}`)
      .then(() => setTokenValid(true))
      .catch(err => setError(err.response?.data?.error || 'Invalid or expired reset token.'))
      .finally(() => setVerifying(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setError('Password must be 8+ characters with uppercase, lowercase, number, and special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // POST /api/password-reset/reset/:token
      await axiosClient.post(`/password-reset/reset/${token}`, { password });
      navigate('/login?message=' + encodeURIComponent('Password reset successful! Please log in with your new password.'));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state ──
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-sky-500 to-pink-500">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-white mx-auto mb-4" />
          <p className="font-semibold text-lg">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid token state ──
  if (!tokenValid) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}
      >
        <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl p-8 shadow-2xl text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link Invalid or Expired</h1>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <Link
              to="/forgot-password"
              className="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-8 py-3 font-bold text-white shadow-lg hover:scale-105 transition-transform"
            >
              Request a New Link
            </Link>
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700 font-semibold">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute left-[10%] top-[20%] h-40 w-40 rounded-full bg-white/30 blur-[80px]" />
        <div className="absolute right-[15%] bottom-[20%] h-52 w-52 rounded-full bg-indigo-300/30 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl">🎓</div>
            <span className="text-white font-bold">Children Learning Hub</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2">Set New Password</h1>
          <p className="text-white/60">Choose a strong password for your account.</p>
        </div>

        <div className="rounded-3xl bg-white/95 backdrop-blur-2xl p-8 shadow-2xl border border-white/30">
          {error && (
            <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/80 py-4 pl-4 pr-12 text-base text-slate-800 transition-all focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-violet-600 rounded-lg"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`w-full rounded-2xl border-2 bg-slate-50/80 py-4 pl-4 pr-12 text-base text-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-violet-100
                    ${confirmPassword && password !== confirmPassword
                      ? 'border-red-400 focus:border-red-400'
                      : confirmPassword && password === confirmPassword
                      ? 'border-emerald-400 focus:border-emerald-400'
                      : 'border-slate-200 focus:border-violet-400'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-violet-600 rounded-lg"
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-emerald-500 mt-1">✓ Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-base font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Resetting…
                </span>
              ) : '🔐 Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
