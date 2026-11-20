import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import ThemeToggle from '../components/ThemeToggle';

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordStrength({ password }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Very Weak', color: 'bg-red-500',     width: '20%' },
    { label: 'Weak',      color: 'bg-orange-500',  width: '40%' },
    { label: 'Fair',      color: 'bg-yellow-500',  width: '60%' },
    { label: 'Good',      color: 'bg-teal-500',    width: '80%' },
    { label: 'Strong',    color: 'bg-emerald-500', width: '100%' },
  ];
  const level = levels[Math.min(score, 4)];

  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">Password Strength</span>
        <span className={`text-xs font-semibold ${score <= 1 ? 'text-red-500' : score <= 2 ? 'text-orange-500' : score <= 3 ? 'text-yellow-600' : 'text-emerald-500'}`}>
          {level.label}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${level.color}`} style={{ width: password ? level.width : '0%' }} />
      </div>
    </div>
  );
}

const SPECIALIZATIONS = [
  'Amharic',
  'English',
  'Mathematics',
  'Reading',
  'General Knowledge',
  'Science',
  'Art & Creativity',
  'Music',
];

const EDUCATION_LEVELS = [
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD',
  'Diploma',
  'Teaching Certificate',
  'Other',
];

export default function SignupInstructor() {
  const { registerInstructor } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    specialization: '',
    education_level: '',
    years_of_experience: '',
    bio: '',
    terms_agreed: false,
  });

  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Check if user is authenticated via Google
    const checkGoogleAuth = async () => {
      try {
        const res = await axiosClient.get('/auth/me');
        const user = res.data.user;
        if (user && user.google_id && user.role === 'pending') {
          setIsGoogleUser(true);
          // Pre-fill form with Google user data
          const nameParts = user.full_name ? user.full_name.split(' ') : ['', ''];
          setForm(prev => ({
            ...prev,
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            email: user.email || '',
          }));
        }
      } catch (err) {
        // Not authenticated or error, proceed with normal registration
      }
    };
    checkGoogleAuth();
  }, []);

  function update(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  function validate() {
    const errs = [];
    if (!form.first_name || form.first_name.length < 2) errs.push('First name is required (minimum 2 characters)');
    if (!form.last_name || form.last_name.length < 2) errs.push('Last name is required (minimum 2 characters)');
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push('A valid email address is required');
    if (!form.phone || !/^\d{10,15}$/.test(form.phone)) errs.push('Phone number must be 10–15 digits');
    if (!isGoogleUser && !form.password) errs.push('Password is required');
    if (!isGoogleUser && form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password))
      errs.push('Password must be 8+ characters with uppercase, lowercase, number, and special character');
    if (!isGoogleUser && form.password !== form.confirm_password) errs.push('Passwords do not match');
    if (!form.specialization) errs.push('Please select a specialization');
    if (!form.education_level) errs.push('Education level is required');
    if (!form.terms_agreed) errs.push('You must agree to the Terms and Conditions');
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSubmitting(true);
    try {
      await registerInstructor({
        ...form,
        full_name: `${form.first_name} ${form.last_name}`.trim(),
        is_google: isGoogleUser,
      });
      setSubmitted(true);
    } catch (err) {
      const apiErrors = err.response?.data?.errors || [err.response?.data?.error || 'Registration failed. Please try again.'];
      setErrors(apiErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute left-10 top-20 h-40 w-40 rounded-full bg-white/30 blur-[80px]" />
        <div className="absolute right-20 top-40 h-56 w-56 rounded-full bg-yellow-300/30 blur-[100px]" />
        <div className="absolute bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-300/30 blur-[90px]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-3xl">🎓</span>
            <span className="text-lg font-bold text-white/90">Children Learning Hub</span>
          </Link>
          <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/signup"
            className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="hidden sm:inline">Back</span>
          </Link>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-sm">
                👩‍🏫
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-2">Instructor Registration</h1>
              <p className="text-white/60">Create your instructor account — pending admin approval</p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl bg-white/95 backdrop-blur-2xl p-8 md:p-10 shadow-2xl border border-white/30"
            >
              {/* Errors */}
              {errors.length > 0 && (
                <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 space-y-1">
                  {errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="flex-shrink-0">⚠️</span> {e}
                    </p>
                  ))}
                </div>
              )}

              {submitted ? (
                <div className="text-center py-10">
                  <div className="text-6xl mb-4">📬</div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email to Verify!</h2>
                  <p className="text-slate-600 mb-2 max-w-sm mx-auto">
                    We've sent a verification link and confirmation code to <strong>{form.email}</strong>.
                  </p>
                  <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                    Please verify your email address to complete your application. Once verified, it will be reviewed by an administrator.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      to={`/verify-email?email=${encodeURIComponent(form.email)}`}
                      className="inline-block rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-bold text-white shadow-lg hover:scale-105 transition-transform"
                    >
                      Enter Verification Code →
                    </Link>
                    <Link
                      to="/login"
                      className="inline-block rounded-2xl bg-slate-100 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition"
                    >
                      Go to Login
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-100">
                    👤 Personal Information
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">First Name *</label>
                      <input
                        required
                        placeholder="e.g. Tigist"
                        value={form.first_name}
                        onChange={update('first_name')}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Last Name *</label>
                      <input
                        required
                        placeholder="e.g. Bekele"
                        value={form.last_name}
                        onChange={update('last_name')}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Email Address *
                        {isGoogleUser && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 font-semibold">
                            ?? from Google (locked)
                          </span>
                        )}
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={update('email')}
                        readOnly={isGoogleUser}
                        className={`input-field${isGoogleUser ? ' bg-blue-50 text-slate-500 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number *</label>
                      <input
                        required
                        type="tel"
                        placeholder="0911234567"
                        value={form.phone}
                        onChange={update('phone')}
                        className="input-field"
                      />
                    </div>
                  </div>

                  {!isGoogleUser && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Password *</label>
                        <div className="relative">
                          <input
                            required
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a strong password"
                            value={form.password}
                            onChange={update('password')}
                            className="input-field pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            title={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-1 rounded-lg transition-colors"
                          >
                            <EyeIcon off={showPassword} />
                          </button>
                        </div>
                        {form.password && <PasswordStrength password={form.password} />}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Confirm Password *</label>
                        <div className="relative">
                          <input
                            required
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Repeat your password"
                            value={form.confirm_password}
                            onChange={update('confirm_password')}
                            className="input-field pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            title={showConfirmPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-1 rounded-lg transition-colors"
                          >
                            <EyeIcon off={showConfirmPassword} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {isGoogleUser && (
                    <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                      <p className="text-sm text-blue-700 flex items-center gap-2">
                        <span className="text-xl">🔐</span>
                        You're signing in with Google. No password needed.
                      </p>
                    </div>
                  )}

                  <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 pt-2 pb-2 border-b border-slate-100">
                    🏫 Professional Information
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Specialization *</label>
                      <select
                        required
                        value={form.specialization}
                        onChange={update('specialization')}
                        className="input-field"
                      >
                        <option value="">Select subject area</option>
                        {SPECIALIZATIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Education Level *</label>
                      <select
                        required
                        value={form.education_level}
                        onChange={update('education_level')}
                        className="input-field"
                      >
                        <option value="">Select level</option>
                        {EDUCATION_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      placeholder="e.g. 3"
                      value={form.years_of_experience}
                      onChange={update('years_of_experience')}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Short Bio (optional)</label>
                    <textarea
                      placeholder="Brief introduction about yourself and your teaching approach..."
                      value={form.bio}
                      onChange={update('bio')}
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>

                  {/* Terms */}
                  <label
                    className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition ${
                      form.terms_agreed ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.terms_agreed}
                      onChange={update('terms_agreed')}
                      className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="text-sm text-slate-700">
                      I agree to the{' '}
                      <span className="text-emerald-600 font-semibold">Terms and Conditions</span> *
                    </span>
                  </label>

                  {/* Submit */}
                  <div className="space-y-4 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 font-bold text-white shadow-lg hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {submitting ? 'Submitting…' : '✨ Create Instructor Account'}
                    </button>

                    <Link
                      to="/signup"
                      className="block text-center text-slate-600 hover:text-slate-800 font-semibold"
                    >
                      ← Back to account types
                    </Link>
                  </div>
                </div>
              )}
            </form>

            <p className="text-center text-white/40 text-xs mt-6">
              After submission, your account will be reviewed by an administrator.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
