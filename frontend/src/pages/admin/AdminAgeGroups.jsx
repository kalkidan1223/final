import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

export default function AdminAgeGroups() {
  const [ageGroups, setAgeGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', min_age: '', max_age: '', requires_account: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadAgeGroups() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/admin/age-groups');
      setAgeGroups(data.age_groups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAgeGroups(); }, []);

  function resetForm() {
    setForm({ name: '', min_age: '', max_age: '', requires_account: false });
    setEditing(null);
    setShowForm(false);
    setError('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/age-groups', {
        ...form,
        min_age: Number(form.min_age),
        max_age: Number(form.max_age),
      });
      resetForm();
      loadAgeGroups();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create age group');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.put(`/admin/age-groups/${editing}`, {
        ...form,
        min_age: Number(form.min_age),
        max_age: Number(form.max_age),
      });
      resetForm();
      loadAgeGroups();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update age group');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this age group?')) return;
    try {
      await axiosClient.delete(`/admin/age-groups/${id}`);
      loadAgeGroups();
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(ag) {
    setEditing(ag.id);
    setForm({
      name: ag.name,
      min_age: String(ag.min_age),
      max_age: String(ag.max_age),
      requires_account: ag.requires_account,
    });
    setShowForm(true);
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">🔢 Age Group Management</h1>
            <p className="text-slate-500 mt-1">Define age groups and whether they require a login account.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-600 transition"
          >
            + Add Age Group
          </button>
        </div>

        {showForm && (
          <form onSubmit={editing ? handleUpdate : handleCreate} className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              {editing ? 'Edit Age Group' : 'Create Age Group'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                required
                placeholder="Name (e.g. 5-7)"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-base"
              />
              <input
                required
                type="number"
                placeholder="Min age"
                value={form.min_age}
                onChange={(e) => setForm((f) => ({ ...f, min_age: e.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-base"
              />
              <input
                required
                type="number"
                placeholder="Max age"
                value={form.max_age}
                onChange={(e) => setForm((f) => ({ ...f, max_age: e.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-base"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.requires_account}
                  onChange={(e) => setForm((f) => ({ ...f, requires_account: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Requires Account
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-violet-500 px-5 py-2.5 font-semibold text-white hover:bg-violet-600 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading age groups…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ageGroups.map((ag) => (
              <div key={ag.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-800">{ag.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${ag.requires_account ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {ag.requires_account ? 'Needs Account' : 'Parent-managed'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-4">Ages {ag.min_age} – {ag.max_age}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(ag)}
                    className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ag.id)}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {ageGroups.length === 0 && (
              <p className="col-span-full text-center text-slate-500 py-10">No age groups defined yet.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}