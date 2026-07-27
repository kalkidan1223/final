import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterStudent() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    invite_code: searchParams.get('code') || '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      await registerStudent(form);
      navigate('/student/dashboard');
    } catch (err) {
      const apiErrors = err.response?.data?.errors || [err.response?.data?.error || 'Registration failed'];
      setErrors(apiErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-10 top-20 h-32 w-32 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute right-20 top-40 h-40 w-40 rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 h-36 w-36 rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute top-1/3 right-10 h-28 w-28 rounded-full bg-purple-200/30 blur-3xl" />
      </div>

      <div className="absolute top-8 left-8 flex items-center gap-3">
        <span className="text-4xl">🎓</span>
        <span className="text-xl font-bold text-white/90 tracking-wide">Brana Uz Academy</span>
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <span className="text-5xl">🧒</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Set Up Your Account</h1>
            <p className="mt-2 text-lg text-white/80">Start your learning adventure today!</p>
          </div>

          <div className="rounded-3xl bg-white/95 backdrop-blur-lg p-8 shadow-2xl">
            {errors.length > 0 && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                {errors.map((e) => (
                  <p key={e} className="flex items-center gap-1">
                    <span>⚠️</span> {e}
                  </p>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="invite_code" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Invite Code
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔑</span>
                  <input
                    id="invite_code"
                    required
                    placeholder="Paste the code from your parent"
                    value={form.invite_code}
                    onChange={update('invite_code')}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">📧</span>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@school.edu"
                    value={form.email}
                    onChange={update('email')}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔒</span>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={update('password')}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100 transition-all"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Minimum 8 characters, must include a letter and a number.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 disabled:hover:scale-100"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting up…
                  </span>
                ) : (
                  '🚀 Start Learning'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-amber-600 hover:text-amber-700 transition-colors">
                  Log in here 🔑
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}