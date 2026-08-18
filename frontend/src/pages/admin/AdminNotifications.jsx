import { useEffect, useState, useCallback, useRef } from 'react';
import { MdNotifications, MdAdd, MdRefresh, MdSearch, MdSend, MdPeople, MdPerson } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 20;

const TYPE_COLORS = {
  info:     'bg-sky-100 text-sky-700',
  alert:    'bg-rose-100 text-rose-700',
  reminder: 'bg-amber-100 text-amber-700',
  feedback: 'bg-emerald-100 text-emerald-700',
  message:  'bg-violet-100 text-violet-700',
};

const EMPTY_FORM = { title: '', message: '', type: 'info', target: 'all', user_id: '' };

function TypeBadge({ type }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[type] || 'bg-slate-100 text-slate-500'}`}>{type}</span>;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const debounce = useRef(null);
  const userDebounce = useRef(null);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (readFilter !== '') params.set('is_read', readFilter);
      params.set('limit', '200');
      const { data } = await axiosClient.get(`/admin/notifications?${params}`);
      let all = data.notifications || [];
      if (search) {
        const q = search.toLowerCase();
        all = all.filter(n => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q) || n.user_name?.toLowerCase().includes(q));
      }
      setTotal(all.length);
      setNotifications(all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, readFilter, search, page]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadNotifications(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, typeFilter, readFilter]);

  useEffect(() => { loadNotifications(); }, [page]);

  // User search for targeting
  useEffect(() => {
    if (!userSearch.trim() || form.target !== 'user') { setUsers([]); return; }
    clearTimeout(userDebounce.current);
    userDebounce.current = setTimeout(async () => {
      try {
        const { data } = await axiosClient.get(`/admin/users?search=${encodeURIComponent(userSearch)}&limit=10`);
        setUsers(data.users || []);
      } catch { /* silent */ }
    }, 400);
    return () => clearTimeout(userDebounce.current);
  }, [userSearch, form.target]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function validate() {
    if (!form.title.trim() || form.title.trim().length < 3) return 'Title must be at least 3 characters';
    if (!form.message.trim() || form.message.trim().length < 5) return 'Message must be at least 5 characters';
    if (form.target === 'user' && !form.user_id) return 'Please select a user to send to';
    return null;
  }

  async function handleSend(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/notifications/send', form);
      setSuccess('Notification sent successfully!');
      setForm(EMPTY_FORM);
      setUserSearch('');
      setUsers([]);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
      loadNotifications(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-2.5"><MdNotifications className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
              <p className="text-sm text-slate-500">Send and monitor platform notifications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadNotifications(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              <MdRefresh className={refreshing ? 'animate-spin' : ''} />Refresh
            </button>
            <button onClick={() => { setShowForm(v => !v); setError(''); }} className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm font-semibold transition">
              <MdAdd />{showForm ? 'Cancel' : 'Send Notification'}
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex justify-between">{error}<button onClick={() => setError('')}>&times;</button></div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Send Form */}
        {showForm && (
          <form onSubmit={handleSend} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Send Notification</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title <span className="text-rose-500">*</span></label>
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Notification title"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-violet-400 focus:outline-none">
                  <option value="info">Info</option>
                  <option value="alert">Alert</option>
                  <option value="reminder">Reminder</option>
                  <option value="feedback">Feedback</option>
                  <option value="message">Message</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Message <span className="text-rose-500">*</span></label>
              <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} placeholder="Notification message…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-y" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Send To</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'all', l: 'All Users', icon: MdPeople },
                  { v: 'parents', l: 'All Parents', icon: MdPeople },
                  { v: 'students', l: 'All Students', icon: MdPeople },
                  { v: 'instructors', l: 'All Instructors', icon: MdPeople },
                  { v: 'user', l: 'Specific User', icon: MdPerson },
                ].map(o => {
                  const Icon = o.icon;
                  const active = form.target === o.v;
                  return (
                    <button key={o.v} type="button" onClick={() => set('target', o.v)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${active ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <Icon className="text-sm" />{o.l}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.target === 'user' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Search User <span className="text-rose-500">*</span></label>
                <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Type name or email to search…"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none mb-2" />
                {users.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    {users.map(u => (
                      <button key={u.id} type="button" onClick={() => { set('user_id', String(u.id)); setUserSearch(u.full_name); setUsers([]); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-violet-50 transition text-left border-b border-slate-50 last:border-0 ${form.user_id === String(u.id) ? 'bg-violet-50 text-violet-700' : 'text-slate-700'}`}>
                        <span className="font-medium">{u.full_name}</span>
                        <span className="text-xs text-slate-400">{u.email} · {u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.user_id && (
                  <p className="text-xs text-violet-600 mt-1">Selected user ID: {form.user_id}</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-60 transition">
                <MdSend />{submitting ? 'Sending…' : 'Send Notification'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search title, message, user…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-violet-400 focus:outline-none">
            <option value="">All Types</option>
            {['info','alert','reminder','feedback','message'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
          <select value={readFilter} onChange={e => setReadFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-violet-400 focus:outline-none">
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <p className="w-full text-xs text-slate-400">{total} notification{total !== 1 ? 's' : ''}</p>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? [...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-20 animate-pulse" />)
            : notifications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                <MdNotifications className="text-5xl text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">No notifications found</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition ${!n.is_read ? 'border-violet-200 bg-violet-50/30' : 'border-slate-100'}`}>
                <div className="flex items-start gap-4">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-violet-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <TypeBadge type={n.type} />
                      <span className="text-sm font-semibold text-slate-800">{n.title}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{n.message}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><MdPerson className="text-xs" />{n.user_name || `User #${n.user_id}`}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                      {n.is_read && <span className="text-emerald-600">✓ Read</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
