import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    if (!form.password) errs.push('Password is required');
    if (form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password))
      errs.push('Password must be 8+ characters with uppercase, lowercase, number, and special character');
    if (form.password !== form.confirm_password) errs.push('Passwords do not match');
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
          <Link
            to="/signup"
            className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="hidden sm:inline">Back</span>
          </Link>
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
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Submitted!</h2>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                    Your instructor account is pending administrator review. You will receive access
                    once an admin approves your application.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 font-bold text-white shadow-lg hover:scale-105 transition-transform"
                  >
                    Go to Login
                  </Link>
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
                      <label className="block text-sm font-medium text-slate-600 mb-1">Email Address *</label>
                      <input
                        required
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={update('email')}
                        className="input-field"
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

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Password *</label>
                    <input
                      required
                      type="password"
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={update('password')}
                      className="input-field"
                    />
                    {form.password && <PasswordStrength password={form.password} />}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Confirm Password *</label>
                    <input
                      required
                      type="password"
                      placeholder="Repeat your password"
                      value={form.confirm_password}
                      onChange={update('confirm_password')}
                      className="input-field"
                    />
                  </div>

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
                  <div className="flex justify-between pt-2">
                    <Link
                      to="/signup"
                      className="rounded-2xl bg-slate-100 px-8 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition"
                    >
                      ← Back
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 font-bold text-white shadow-lg hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {submitting ? 'Submitting…' : '✨ Create Instructor Account'}
                    </button>
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
