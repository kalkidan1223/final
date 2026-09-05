import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DateOfBirthField from '../components/DateOfBirthField';

function calculateAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function PasswordStrength({ password }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Very Weak', color: 'bg-red-500', width: '20%' },
    { label: 'Weak', color: 'bg-orange-500', width: '40%' },
    { label: 'Fair', color: 'bg-yellow-500', width: '60%' },
    { label: 'Good', color: 'bg-teal-500', width: '80%' },
    { label: 'Strong', color: 'bg-emerald-500', width: '100%' },
  ];

  const level = levels[Math.min(score, 4)];

  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">Password Strength</span>
        <span className={`text-xs font-semibold ${score <= 1 ? 'text-red-500' : score <= 2 ? 'text-orange-500' : score <= 3 ? 'text-yellow-500' : 'text-emerald-500'}`}>
          {level.label}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${level.color}`}
          style={{ width: password ? level.width : '0%' }}
        />
      </div>
      <div className="mt-2 space-y-1">
        {[
          { label: '8+ characters', met: password.length >= 8 },
          { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
          { label: 'Lowercase letter', met: /[a-z]/.test(password) },
          { label: 'Number', met: /[0-9]/.test(password) },
          { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
        ].map((req) => (
          <div key={req.label} className="flex items-center gap-2 text-xs">
            <span className={req.met ? 'text-emerald-500' : 'text-slate-400'}>
              {req.met ? '✓' : '○'}
            </span>
            <span className={req.met ? 'text-slate-600' : 'text-slate-400'}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const steps = [
  { key: 'personal', label: 'Personal Info', icon: '👤' },
  { key: 'address', label: 'Address Info', icon: '📍' },
  { key: 'consent', label: 'Review & Consent', icon: '🔑' },
];

export default function RegisterParent() {
  const { registerParent } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    // Personal
    first_name: '', middle_name: '', last_name: '',
    gender: '', date_of_birth: '', nationality: '',
    phone: '', alt_phone: '', email: '',
    password: '', confirm_password: '',
    occupation: '', relationship_to_child: '',
    national_id: '',
    // Address
    country: '', region: '', city: '',
    sub_city: '', woreda: '', house_number: '', postal_code: '',
    // Consent
    terms_agreed: false, guardian_confirmed: false,
  });

  function update(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  const age = calculateAge(form.date_of_birth);

  const validateStep = (step) => {
    const errs = [];
    if (step === 0) {
      if (!form.first_name || form.first_name.length < 2) errs.push('First name is required (2-50 characters)');
      if (form.first_name && !/^[A-Za-z\s]+$/.test(form.first_name)) errs.push('First name must contain only letters');
      if (form.middle_name && !/^[A-Za-z\s]*$/.test(form.middle_name)) errs.push('Middle name must contain only letters');
      if (!form.last_name || form.last_name.length < 2) errs.push('Last name is required (2-50 characters)');
      if (form.last_name && !/^[A-Za-z\s]+$/.test(form.last_name)) errs.push('Last name must contain only letters');
      if (!form.gender) errs.push('Gender is required');
      if (!form.date_of_birth) errs.push('Date of birth is required');
      if (age !== null && age < 18) errs.push('A parent must be at least 18 years old');
      if (!form.nationality) errs.push('Nationality is required');
      if (!form.phone || !/^\d{10,15}$/.test(form.phone)) errs.push('Phone number must be 10-15 digits');
      if (form.alt_phone && !/^\d{10,15}$/.test(form.alt_phone)) errs.push('Alt phone must be 10-15 digits');
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push('Valid email is required');
      if (!form.password) errs.push('Password is required');
      if (form.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password))
        errs.push('Password must be 8+ chars, with uppercase, lowercase, number, and special character');
      if (form.password !== form.confirm_password) errs.push('Passwords do not match');
    } else if (step === 1) {
      if (!form.country) errs.push('Country is required');
      if (!form.region) errs.push('Region is required');
      if (!form.city) errs.push('City is required');
    } else if (step === 2) {
      if (!form.terms_agreed) errs.push('You must agree to the Terms and Conditions');
      if (!form.guardian_confirmed) errs.push('You must confirm you are the legal guardian');
    }
    return errs;
  };

  function handleNext() {
    const errs = validateStep(currentStep);
    setErrors(errs);
    if (errs.length === 0) {
      setCurrentStep((s) => Math.min(s + 1, 2));
    }
  }

  function handleBack() {
    setErrors([]);
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const consentErrors = validateStep(2);
    if (consentErrors.length) {
      setErrors(consentErrors);
      return;
    }
    setErrors([]);
    setSubmitting(true);
    try {
      const allErrors = [
        ...validateStep(0),
        ...validateStep(1),
        ...validateStep(2),
      ];
      if (allErrors.length > 0) {
        setErrors(allErrors);
        return;
      }
      const full_name = `${form.first_name} ${form.middle_name} ${form.last_name}`.trim();
      const payload = {
        ...form,
        full_name,
        date_of_birth: form.date_of_birth || null,
        occupation: form.occupation || 'Not Specified',
        relationship_to_child: form.relationship_to_child || 'Parent',
      };
      await registerParent(payload);
      setSubmitted(true);
    } catch (err) {
      const apiErrors = err.response?.data?.errors || [err.response?.data?.error || 'Registration failed'];
      setErrors(apiErrors);
    } finally {
      setSubmitting(false);
    }
  }

  const allFieldsFilled = currentStep === 2
    ? form.first_name && form.last_name && form.email && form.password && form.confirm_password && form.terms_agreed && form.guardian_confirmed
    : currentStep === 1
    ? form.country && form.region && form.city
    : form.first_name && form.last_name && form.gender && form.date_of_birth && form.nationality && form.phone && form.email;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-500">
      <style>{`
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .animate-gradient { animation: gradientShift 8s ease infinite; background-size: 200% 200%; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .slide-up { animation: slideUp 0.5s ease-out both; }
      `}</style>

      <div className="absolute inset-0 opacity-15">
        <div className="absolute left-10 top-20 h-36 w-36 rounded-full bg-white/30 blur-[80px]" />
        <div className="absolute right-20 top-40 h-48 w-48 rounded-full bg-yellow-300/30 blur-[100px]" />
        <div className="absolute bottom-20 left-1/3 h-40 w-40 rounded-full bg-pink-300/30 blur-[90px]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
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

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8 slide-up">
              <h1 className="text-3xl font-extrabold text-white mb-2">Create Parent Account</h1>
              <p className="text-white/80">Register to manage your children's learning journey</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-10 slide-up">
              {steps.map((step, i) => (
                <div key={step.key} className="flex items-center">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all duration-300 ${
                    i <= currentStep ? 'bg-violet-500 text-white shadow-lg scale-110' : 'bg-white/30 text-white/60'
                  }`}>
                    {step.icon}
                  </div>
                  <span className={`ml-2 text-sm font-semibold hidden sm:block ${i <= currentStep ? 'text-white' : 'text-white/50'}`}>
                    {step.label}
                  </span>
                  {i < 2 && <div className={`w-12 h-1 mx-2 rounded-full ${i < currentStep ? 'bg-violet-400' : 'bg-white/20'}`} />}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl bg-white/92 backdrop-blur-2xl p-8 md:p-10 shadow-2xl border border-white/30 slide-up">
              {errors.length > 0 && (
                <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4">
                  {errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span>⚠️</span> {e}
                    </p>
                  ))}
                </div>
              )}

              {submitted ? (
                <div className="text-center py-10 slide-up">
                  <div className="text-6xl mb-4">📬</div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Submitted!</h2>
                  <p className="text-slate-600 mb-6">Your parent account is now pending administrator approval. You will be able to log in once an admin reviews and approves your registration.</p>
                  <Link to="/login" className="inline-block rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-lg transition hover:scale-105">Go to Login</Link>
                </div>
              ) : (
                <>
                  {/* Step 0: Personal Info */}
              {currentStep === 0 && (
                <div className="space-y-6 slide-up">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">👤 Personal Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input required placeholder="First Name *" value={form.first_name} onChange={update('first_name')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                    <input placeholder="Middle Name" value={form.middle_name} onChange={update('middle_name')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                    <input required placeholder="Last Name *" value={form.last_name} onChange={update('last_name')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select required value={form.gender} onChange={update('gender')} className="self-end rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100">
                      <option value="">Gender *</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <DateOfBirthField
                      required
                      value={form.date_of_birth}
                      onChange={(iso) => setForm((f) => ({ ...f, date_of_birth: iso }))}
                    />
                  </div>
                  {age && (
                    <p className="text-sm text-emerald-600 font-semibold">📅 Age: {age} years</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required placeholder="Nationality *" value={form.nationality} onChange={update('nationality')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                    <input required placeholder="Phone *" value={form.phone} onChange={update('phone')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                  </div>
                  <input placeholder="Alternative Phone" value={form.alt_phone} onChange={update('alt_phone')} className="w-full rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                  <input required type="email" placeholder="Email Address *" value={form.email} onChange={update('email')} className="w-full rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                  <input required type="password" placeholder="Password *" value={form.password} onChange={update('password')} className="w-full rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                  <input required type="password" placeholder="Confirm Password *" value={form.confirm_password} onChange={update('confirm_password')} className="w-full rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100" />
                  {form.password && <PasswordStrength password={form.password} />}
                </div>
              )}

              {/* Step 1: Address Info */}
              {currentStep === 1 && (
                <div className="space-y-6 slide-up">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">📍 Address Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required placeholder="Country *" value={form.country} onChange={update('country')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100" />
                    <input required placeholder="Region *" value={form.region} onChange={update('region')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required placeholder="City *" value={form.city} onChange={update('city')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100" />
                    <input placeholder="Sub City (Optional)" value={form.sub_city} onChange={update('sub_city')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input placeholder="Woreda (Optional)" value={form.woreda} onChange={update('woreda')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100" />
                    <input placeholder="House Number (Optional)" value={form.house_number} onChange={update('house_number')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100" />
                    <input placeholder="Postal Code (Optional)" value={form.postal_code} onChange={update('postal_code')} className="rounded-xl border-2 border-slate-200 py-3 px-4 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100" />
                  </div>
                </div>
              )}

              {/* Step 2: Consent & Submit */}
              {currentStep === 2 && (
                <div className="space-y-6 slide-up">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">✅ Review & Consent</h2>
                  <div className="rounded-2xl bg-slate-50 p-6 space-y-4">
                    <h3 className="font-semibold text-slate-700">Registration Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <p><span className="font-medium">Name:</span> {form.first_name} {form.middle_name} {form.last_name}</p>
                      <p><span className="font-medium">Email:</span> {form.email}</p>
                      <p><span className="font-medium">Phone:</span> {form.phone}</p>
                      <p><span className="font-medium">Gender:</span> {form.gender}</p>
                      <p><span className="font-medium">Nationality:</span> {form.nationality}</p>
                      {age && <p><span className="font-medium">Age:</span> {age} years</p>}
                      <p><span className="font-medium">City:</span> {form.city}</p>
                      <p><span className="font-medium">Country:</span> {form.country}</p>
                    </div>
                  </div>
                  <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition ${form.terms_agreed ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="checkbox" checked={form.terms_agreed} onChange={update('terms_agreed')} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-slate-700">I agree to the <a href="#" className="text-violet-600 font-semibold hover:underline">Terms and Conditions</a> *</span>
                  </label>
                  <label className={`flex items-start gap-3 cursor-pointer rounded-2xl border-2 p-4 transition ${form.guardian_confirmed ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="checkbox" checked={form.guardian_confirmed} onChange={update('guardian_confirmed')} className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-slate-700">I confirm I am the legal guardian of the child(ren) I am registering. *</span>
                  </label>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                {currentStep > 0 ? (
                  <button type="button" onClick={handleBack} className="rounded-2xl bg-slate-100 px-8 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition">← Back</button>
                ) : (
                  <Link to="/signup" className="rounded-2xl bg-slate-100 px-8 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition">← Back</Link>
                )}
                {currentStep < 2 ? (
                  <button type="button" onClick={handleNext} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-lg transition hover:scale-105">Next →</button>
                ) : (
                  <button type="submit" disabled={submitting} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-60 disabled:hover:scale-100">
                    {submitting ? 'Creating...' : '✨ Create Parent Account'}
                  </button>
                )}
              </div>
              </>
            )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
