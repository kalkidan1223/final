import { useEffect, useState, useCallback } from 'react';
import { MdCampaign, MdAdd, MdRefresh, MdPeople, MdSchool, MdFamilyRestroom, MdGroups, MdDelete, MdCalendarToday } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone', icon: MdPeople },
  { value: 'parents', label: 'All Parents & Guardians', icon: MdFamilyRestroom },
  { value: 'students', label: 'All Students', icon: MdSchool },
  { value: 'instructors', label: 'All Instructors', icon: MdGroups },
];

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal', color: 'bg-slate-100 text-slate-600' },
  { value: 'important', label: 'Important', color: 'bg-amber-100 text-amber-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-100 text-rose-700' },
];

const EMPTY_FORM = {
  title: '',
  message: '',
  audience: 'all',
  priority: 'normal',
  start_date: '',
  end_date: '',
};

function PriorityBadge({ priority }) {
  const opt = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[0];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${opt.color}`}>{opt.label}</span>;
}

function AudienceBadge({ audience }) {
  const opt = AUDIENCE_OPTIONS.find(a => a.value === audience);
  const Icon = opt?.icon || MdPeople;
  return (
    <span className="flex items-center gap-1 text-xs text-slate-600">
      <Icon className="text-slate-400" /> {opt?.label || audience}
    </span>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
        <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-rose-500 text-white py-2.5 text-sm font-semibold hover:bg-rose-600 transition">Delete</button>
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const loadAnnouncements = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await axiosClient.get('/admin/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  function updateForm(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function validate() {
    if (!form.title.trim() || form.title.trim().length < 3) return 'Title must be at least 3 characters';
    if (!form.message.trim() || form.message.trim().length < 10) return 'Message must be at least 10 characters';
    if (!form.audience) return 'Please select an audience';
    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) return 'End date must be after start date';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/announcements', form);
      setSuccess('Announcement created and sent successfully!');
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadAnnouncements(true);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await axiosClient.delete(`/admin/announcements/${id}`);
      setSuccess('Announcement deleted');
      setToDelete(null);
      loadAnnouncements(true);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
      setToDelete(null);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500 p-2.5"><MdCampaign className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
              <p className="text-sm text-slate-500">Send announcements to parents, students, and instructors</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadAnnouncements(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              <MdRefresh className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => { setShowForm(v => !v); setError(''); }} className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-semibold transition">
              <MdAdd /> {showForm ? 'Cancel' : 'New Announcement'}
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-800">Create Announcement</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => updateForm('title', e.target.value)}
                placeholder="Announcement title…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Message <span className="text-rose-500">*</span></label>
              <textarea
                value={form.message}
                onChange={e => updateForm('message', e.target.value)}
                rows={4}
                placeholder="Write the announcement message…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Audience <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {AUDIENCE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const active = form.audience === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateForm('audience', opt.value)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${active ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <Icon className="flex-shrink-0" /> {opt.label.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => updateForm('priority', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-amber-400 focus:outline-none">
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date (optional)</label>
                <input type="date" value={form.start_date} onChange={e => updateForm('start_date', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date (optional)</label>
                <input type="date" value={form.end_date} onChange={e => updateForm('end_date', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-60 transition">
                {submitting ? 'Sending…' : 'Send Announcement'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Announcements list */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 h-24 animate-pulse" />)}
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <MdCampaign className="text-5xl text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No announcements yet</p>
            <button onClick={() => setShowForm(true)} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 text-sm font-semibold transition">Create first announcement</button>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-slate-800">{ann.title}</h3>
                      <PriorityBadge priority={ann.priority} />
                    </div>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{ann.message}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <AudienceBadge audience={ann.audience} />
                      <span className="flex items-center gap-1">
                        <MdCalendarToday className="text-xs" />
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                      {ann.start_date && <span>From {new Date(ann.start_date).toLocaleDateString()}</span>}
                      {ann.end_date && <span>Until {new Date(ann.end_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <button onClick={() => setToDelete(ann)} className="flex-shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                    <MdDelete className="text-lg" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          title="Delete Announcement"
          message={`Are you sure you want to delete "${toDelete.title}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(toDelete.id)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </AdminLayout>
  );
}
