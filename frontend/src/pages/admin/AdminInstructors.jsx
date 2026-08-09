import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import FormField, { inputClass } from '../../components/FormField';
import axiosClient from '../../api/axiosClient';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  qualification: '',
  specialty: '',
  bio: '',
};

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Deactivated'}
    </span>
  );
}

function validateForm(form) {
  const errors = {};
  if (!form.full_name.trim() || form.full_name.trim().length < 2) {
    errors.full_name = 'Full name is required (at least 2 characters)';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'A valid email address is required';
  }
  if (!/^\d{10,15}$/.test(form.phone)) {
    errors.phone = 'Phone number is required (10-15 digits, no spaces)';
  }
  if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    errors.password = 'Password must be at least 8 characters with a letter and a number';
  }
  if (!form.qualification.trim() || form.qualification.trim().length < 2) {
    errors.qualification = 'Qualification is required';
  }
  if (!form.specialty.trim() || form.specialty.trim().length < 2) {
    errors.specialty = 'Teaching specialty is required';
  }
  if (form.bio.trim() && form.bio.trim().length < 10) {
    errors.bio = 'Bio must be at least 10 characters when provided';
  }
  return errors;
}

export default function AdminInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function loadInstructors() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set('is_active', activeFilter);
      const { data } = await axiosClient.get(`/admin/instructors?${params.toString()}`);
      setInstructors(data.instructors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstructors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadInstructors, 300);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  async function handleToggleInstructor(instructorId, currentStatus) {
    try {
      if (currentStatus) {
        await axiosClient.patch(`/admin/instructors/${instructorId}/deactivate`);
      } else {
        await axiosClient.patch(`/admin/instructors/${instructorId}/activate`);
      }
      loadInstructors();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateInstructor(e) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        qualification: form.qualification.trim(),
        specialty: form.specialty.trim(),
        bio: form.bio.trim() || undefined,
      };
      await axiosClient.post('/admin/instructors', payload);
      setFormSuccess(`Instructor account created for ${form.full_name.trim()}`);
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setShowForm(false);
      loadInstructors();
    } catch (err) {
      const apiErrors = err.response?.data?.errors || [
        err.response?.data?.error || 'Could not create account',
      ];
      setFormError(apiErrors.join(', '));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Instructors</h1>
            <p className="text-slate-500 mt-1">Create and manage instructor accounts</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setFormError('');
              setFormSuccess('');
              setFieldErrors({});
            }}
            className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 transition"
          >
            {showForm ? 'Cancel' : '+ Add Instructor'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateInstructor}
            className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-semibold text-slate-700 mb-1">New Instructor Account</h2>
            <p className="text-sm text-slate-500 mb-6">
              Fill in all teacher details. Required fields are marked with *.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-violet-700 mb-3">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Full Name" required error={fieldErrors.full_name}>
                    <input
                      value={form.full_name}
                      onChange={(e) => updateField('full_name', e.target.value)}
                      placeholder="e.g. Sara Bekele"
                      className={inputClass(fieldErrors.full_name)}
                    />
                  </FormField>
                  <FormField label="Email Address" required error={fieldErrors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="teacher@brana.edu"
                      className={inputClass(fieldErrors.email)}
                    />
                  </FormField>
                  <FormField
                    label="Phone Number"
                    required
                    error={fieldErrors.phone}
                    hint="Digits only, 10-15 characters"
                  >
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                      placeholder="0912345678"
                      className={inputClass(fieldErrors.phone)}
                    />
                  </FormField>
                  <FormField
                    label="Temporary Password"
                    required
                    error={fieldErrors.password}
                    hint="Min 8 characters, include a letter and number"
                  >
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="Teacher123"
                      className={inputClass(fieldErrors.password)}
                    />
                  </FormField>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-violet-700 mb-3">Professional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Qualification" required error={fieldErrors.qualification}>
                    <input
                      value={form.qualification}
                      onChange={(e) => updateField('qualification', e.target.value)}
                      placeholder="e.g. B.Ed. in Primary Education"
                      className={inputClass(fieldErrors.qualification)}
                    />
                  </FormField>
                  <FormField label="Teaching Specialty / Subject" required error={fieldErrors.specialty}>
                    <input
                      value={form.specialty}
                      onChange={(e) => updateField('specialty', e.target.value)}
                      placeholder="e.g. Mathematics, English, Science"
                      className={inputClass(fieldErrors.specialty)}
                    />
                  </FormField>
                  <FormField
                    label="Bio / About the Teacher"
                    error={fieldErrors.bio}
                    hint="Optional — brief background, experience, or teaching approach"
                    className="md:col-span-2"
                  >
                    <textarea
                      rows={4}
                      value={form.bio}
                      onChange={(e) => updateField('bio', e.target.value)}
                      placeholder="Describe the teacher's experience, certifications, and teaching style…"
                      className={`${inputClass(fieldErrors.bio)} resize-y min-h-[100px]`}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {formError && (
              <p className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
                {formSuccess}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-60 transition"
              >
                {submitting ? 'Saving…' : 'Save Instructor'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setFieldErrors({});
                  setShowForm(false);
                }}
                className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2 mb-6">
          {[
            { value: '', label: 'All' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Deactivated' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveFilter(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeFilter === value
                  ? 'bg-violet-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading instructors…</p>
        ) : instructors.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center border border-slate-100">
            <p className="text-slate-500 mb-4">No instructors yet.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 transition"
            >
              Add your first instructor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instructors.map((inst) => (
              <div
                key={inst.id}
                className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{inst.full_name}</h3>
                    <p className="text-sm text-slate-500">{inst.email}</p>
                    {inst.phone && (
                      <p className="text-sm text-slate-500 mt-0.5">📞 {inst.phone}</p>
                    )}
                  </div>
                  <StatusBadge isActive={inst.is_active} />
                </div>

                <dl className="space-y-1.5 text-sm text-slate-600 mb-4">
                  {inst.qualification && (
                    <div>
                      <dt className="inline font-medium text-slate-700">Qualification: </dt>
                      <dd className="inline">{inst.qualification}</dd>
                    </div>
                  )}
                  {inst.specialty && (
                    <div>
                      <dt className="inline font-medium text-slate-700">Specialty: </dt>
                      <dd className="inline">{inst.specialty}</dd>
                    </div>
                  )}
                  {inst.bio && (
                    <div className="pt-1">
                      <dt className="font-medium text-slate-700">Bio</dt>
                      <dd className="text-slate-500 mt-0.5 line-clamp-3">{inst.bio}</dd>
                    </div>
                  )}
                </dl>

                <button
                  type="button"
                  onClick={() => handleToggleInstructor(inst.id, inst.is_active)}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition ${
                    inst.is_active
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {inst.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
