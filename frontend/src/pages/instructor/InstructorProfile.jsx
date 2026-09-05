import { useEffect, useState } from 'react';
import { MdPerson, MdEdit, MdSave, MdClose, MdSchool, MdEmail, MdPhone } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

export default function InstructorProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({});
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    axiosClient.get('/instructor/profile')
      .then(({ data }) => { setProfile(data.profile); setForm(data.profile || {}); })
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await axiosClient.patch('/instructor/profile', {
        bio: form.bio,
        specialty: form.specialty,
        qualification: form.qualification,
        phone: form.phone,
      });
      setProfile(data.profile);
      setEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <InstructorLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    </InstructorLayout>
  );

  return (
    <InstructorLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <MdPerson className="text-indigo-600" /> My Profile
        </h1>

        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">✓ {success}</div>}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">⚠️ {error}</div>}

        {/* Profile header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="flex items-center gap-5 relative">
            <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-bold">
              {profile?.full_name?.charAt(0) || 'I'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.full_name}</h2>
              <p className="text-indigo-200 flex items-center gap-1.5 text-sm mt-1"><MdEmail className="text-base" /> {profile?.email}</p>
              {profile?.phone && <p className="text-indigo-200 flex items-center gap-1.5 text-sm mt-0.5"><MdPhone className="text-base" /> {profile?.phone}</p>}
            </div>
            <div className="ml-auto">
              <span className="bg-white/15 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                {profile?.status || 'Active'} Instructor
              </span>
            </div>
          </div>
        </div>

        {/* Details + edit */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-800">Professional Details</h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition"
              >
                <MdEdit /> Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
              >
                <MdClose /> Cancel
              </button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-3">
              {[
                { label: 'Qualification',  value: profile?.qualification || '—' },
                { label: 'Specialization', value: profile?.specialty || '—' },
                { label: 'Phone',          value: profile?.phone || '—' },
                { label: 'Account Status', value: profile?.status || 'Active', capitalize: true },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{r.label}</span>
                  <span className={`text-sm font-medium text-slate-800 ${r.capitalize ? 'capitalize' : ''}`}>{r.value}</span>
                </div>
              ))}
              {profile?.bio && (
                <div className="pt-3">
                  <p className="text-sm text-slate-500 mb-1.5">Biography</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={save} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Qualification</label>
                  <input
                    value={form.qualification || ''}
                    onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                    placeholder="e.g. Bachelor's Degree in Education"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Specialization</label>
                  <input
                    value={form.specialty || ''}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                    placeholder="e.g. Amharic, Mathematics"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                <input
                  value={form.phone || ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                  placeholder="0911234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Biography</label>
                <textarea
                  rows={4}
                  value={form.bio || ''}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none resize-none"
                  placeholder="Brief introduction about yourself…"
                />
              </div>

              <div className="pt-1">
                <p className="text-xs text-slate-400 mb-4">
                  Note: You cannot change your role, email, or approval status. Contact the administrator for those changes.
                </p>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                    <MdSave /> {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Assignments summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MdSchool className="text-indigo-600" /> My Assignments</h3>
          {(profile?.assignments || []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No active assignments. Contact admin for assignment.</p>
          ) : (
            <div className="space-y-2">
              {profile.assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-800">{a.course_title}</span>
                  <span className="text-xs text-slate-400">{a.age_group_name} {a.grade && `· Grade ${a.grade}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </InstructorLayout>
  );
}
