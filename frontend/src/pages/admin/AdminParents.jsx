import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const EMPTY_PARENT_FORM = {
  full_name: '', email: '', phone: '', password: '', date_of_birth: '', address: '',
  emergency_contact: '', guardian_relationship: 'parent', in_person_verified: false, verification_notes: '',
};

function StatusBadge({ isActive }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Deactivated'}
    </span>
  );
}

export default function AdminParents() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PARENT_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadParents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set('is_active', activeFilter);
      const { data } = await axiosClient.get(`/admin/parents?${params.toString()}`);
      setParents(data.parents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadParents(); }, []);

  useEffect(() => {
    const timer = setTimeout(loadParents, 300);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  async function handleToggleParent(parentId, currentStatus) {
    try {
      if (currentStatus) {
        await axiosClient.patch(`/admin/parents/${parentId}/deactivate`);
      } else {
        await axiosClient.patch(`/admin/parents/${parentId}/activate`);
      }
      loadParents();
    } catch (err) {
      console.error(err);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateParent(event) {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/parents', form);
      setForm(EMPTY_PARENT_FORM);
      setShowCreateForm(false);
      loadParents();
    } catch (err) {
      const errors = err.response?.data?.errors || [err.response?.data?.error || 'Could not create parent or guardian account'];
      setFormError(errors.join(', '));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">👨‍👩‍👧 Parent Management</h1>
        <p className="text-slate-500 mb-8">Manage parent accounts and their linked children.</p>

        <button onClick={() => { setShowCreateForm((visible) => !visible); setFormError(''); }} className="mb-6 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 transition">
          {showCreateForm ? 'Cancel' : '+ Create Parent / Guardian'}
        </button>

        {showCreateForm && (
          <form onSubmit={handleCreateParent} className="mb-8 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Create Parent or Guardian Account</h2>
            <p className="mt-1 text-sm text-slate-500">All parents and guardians must be 18+. Siblings and other guardians require in-person verification by an administrator.</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <input required placeholder="Full name" value={form.full_name} onChange={(e) => updateForm('full_name', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5" />
              <input required type="date" value={form.date_of_birth} onChange={(e) => updateForm('date_of_birth', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5" />
              <input required type="email" placeholder="Email address" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5" />
              <input required placeholder="Phone number" value={form.phone} onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, ''))} className="rounded-lg border border-slate-200 px-3 py-2.5" />
              <input required type="password" placeholder="Temporary password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5" />
              <select value={form.guardian_relationship} onChange={(e) => updateForm('guardian_relationship', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5">
                <option value="parent">Parent</option><option value="sibling">Adult sibling</option><option value="relative">Relative</option><option value="other">Other guardian</option>
              </select>
              <input placeholder="Address (optional)" value={form.address} onChange={(e) => updateForm('address', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5" />
              <input placeholder="Emergency phone (optional)" value={form.emergency_contact} onChange={(e) => updateForm('emergency_contact', e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5" />
            </div>
            {form.guardian_relationship !== 'parent' && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-amber-900"><input type="checkbox" checked={form.in_person_verified} onChange={(e) => updateForm('in_person_verified', e.target.checked)} /> I verified this guardian in person and reviewed their documents.</label>
                <textarea required rows={3} placeholder="Verification notes (minimum 10 characters)" value={form.verification_notes} onChange={(e) => updateForm('verification_notes', e.target.value)} className="mt-3 w-full rounded-lg border border-amber-200 px-3 py-2" />
              </div>
            )}
            {formError && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}
            <button disabled={submitting} className="mt-5 rounded-lg bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-60">{submitting ? 'Creating...' : 'Create Account'}</button>
          </form>
        )}

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveFilter('')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeFilter === '' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('true')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeFilter === 'true' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter('false')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeFilter === 'false' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Deactivated
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading parents…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parents.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{p.full_name}</h3>
                    <p className="text-sm text-slate-500">{p.email}</p>
                  </div>
                  <StatusBadge isActive={p.is_active} />
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  {p.phone && <p><span className="font-medium">Phone:</span> {p.phone}</p>}
                  {p.address && <p><span className="font-medium">Address:</span> {p.address}</p>}
                  {p.emergency_contact && <p><span className="font-medium">Emergency:</span> {p.emergency_contact}</p>}
                  <p><span className="font-medium">Role:</span> {p.guardian_relationship === 'parent' ? 'Parent' : `Verified ${p.guardian_relationship}`}</p>
                  {p.guardian_relationship !== 'parent' && <p><span className="font-medium">In-person verified:</span> {p.in_person_verified ? 'Yes' : 'No'}</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleParent(p.id, p.is_active)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${p.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    {p.is_active ? 'Deactivate Parent' : 'Activate Parent'}
                  </button>
                </div>
              </div>
            ))}
            {parents.length === 0 && (
              <p className="col-span-full text-center text-slate-500 py-10">No parents found.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
