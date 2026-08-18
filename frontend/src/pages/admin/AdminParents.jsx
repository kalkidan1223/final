import { useEffect, useState, useCallback, useRef } from 'react';
import { MdFamilyRestroom, MdSearch, MdRefresh, MdAdd, MdPerson, MdCheck, MdClose, MdPause, MdPlayArrow } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 15;
const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'exceptional', label: 'Exceptional Guardians' },
];

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', password: '', date_of_birth: '',
  address: '', emergency_contact: '', guardian_relationship: 'parent',
  in_person_verified: false, verification_notes: '',
};

function StatusBadge({ isActive, status }) {
  if (status) {
    const map = {
      active:    'bg-emerald-100 text-emerald-700',
      pending:   'bg-amber-100 text-amber-700',
      rejected:  'bg-red-100 text-red-700',
      suspended: 'bg-violet-100 text-violet-700',
    };
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function ViewModal({ parent, onClose }) {
  const relationship = parent.guardian_relationship || 'parent';
  const isExceptional = relationship !== 'parent';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg">{parent.full_name?.[0] || 'P'}</div>
            <div>
              <h3 className="font-semibold text-slate-800">{parent.full_name}</h3>
              <p className="text-xs text-slate-500">{parent.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Personal */}
          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Personal Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Full Name', parent.full_name],
                ['Email', parent.email],
                ['Phone', parent.phone],
                ['Date of Birth', parent.date_of_birth ? new Date(parent.date_of_birth).toLocaleDateString() : '—'],
                ['Relationship', relationship],
                ['Status', <StatusBadge key="s" isActive={parent.is_active} />],
                ['Last Login', parent.last_login_at ? new Date(parent.last_login_at).toLocaleDateString() : 'Never'],
                ['Registered', new Date(parent.created_at).toLocaleDateString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-slate-700">{val || '—'}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Address */}
          {parent.address && (
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Address</h4>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{typeof parent.address === 'object' ? JSON.stringify(parent.address, null, 2) : parent.address}</p>
            </section>
          )}

          {/* Exceptional guardian */}
          {isExceptional && (
            <section className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">Exceptional Guardian Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-amber-600 mb-0.5">Relationship</p><p className="text-amber-800 font-medium capitalize">{relationship}</p></div>
                <div><p className="text-xs text-amber-600 mb-0.5">In-Person Verified</p>
                  {parent.in_person_verified
                    ? <span className="flex items-center gap-1 text-emerald-700 font-medium"><MdCheck className="text-emerald-600" /> Verified</span>
                    : <span className="flex items-center gap-1 text-red-600 font-medium"><MdClose className="text-red-500" /> Not verified</span>
                  }
                </div>
                {parent.verified_at && <div><p className="text-xs text-amber-600 mb-0.5">Verified At</p><p className="text-amber-800">{new Date(parent.verified_at).toLocaleDateString()}</p></div>}
                {parent.verification_notes && <div className="col-span-2"><p className="text-xs text-amber-600 mb-0.5">Notes</p><p className="text-amber-800">{parent.verification_notes}</p></div>}
              </div>
            </section>
          )}

          {parent.emergency_contact && (
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Emergency Contact</h4>
              <p className="text-sm text-slate-600">{parent.emergency_contact}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isExceptional = form.guardian_relationship !== 'parent';

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/parents', form);
      onCreated();
    } catch (err) {
      const errs = err.response?.data?.errors || [err.response?.data?.error || 'Failed to create'];
      setError(errs.join('. '));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Create Parent / Guardian Account</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-slate-500">Admin-created accounts are for walk-in registration or families without internet access. All parents and guardians must be 18+.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', field: 'full_name', type: 'text', placeholder: 'Full legal name', required: true },
              { label: 'Date of Birth', field: 'date_of_birth', type: 'date', required: true },
              { label: 'Email Address', field: 'email', type: 'email', placeholder: 'parent@example.com', required: true },
              { label: 'Phone Number', field: 'phone', type: 'tel', placeholder: '0912345678', required: true },
              { label: 'Temporary Password', field: 'password', type: 'password', placeholder: 'Min 8 chars, letter + number', required: true },
              { label: 'Emergency Contact', field: 'emergency_contact', type: 'tel', placeholder: 'Emergency phone' },
            ].map(({ label, field, type, placeholder, required }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>
                <input type={type} placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} required={required}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Relationship <span className="text-rose-500">*</span></label>
              <select value={form.guardian_relationship} onChange={e => set('guardian_relationship', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-violet-400 focus:outline-none">
                <option value="parent">Parent</option>
                <option value="sibling">Adult Sibling</option>
                <option value="relative">Relative</option>
                <option value="other">Other Guardian</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input type="text" placeholder="Full address" value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
            </div>
          </div>

          {isExceptional && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-amber-800">Exceptional Guardian Verification Required</h4>
              <label className="flex items-start gap-2 text-sm text-amber-900 cursor-pointer">
                <input type="checkbox" checked={form.in_person_verified} onChange={e => set('in_person_verified', e.target.checked)} className="mt-0.5 rounded" />
                <span>I have completed face-to-face verification and reviewed identity and supporting documents for this guardian.</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Verification Notes <span className="text-rose-500">*</span></label>
                <textarea rows={3} placeholder="Record verification details (minimum 10 characters)…" value={form.verification_notes} onChange={e => set('verification_notes', e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none" />
              </div>
            </div>
          )}

          {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white py-2.5 text-sm font-semibold disabled:opacity-60 transition">
              {submitting ? 'Creating…' : 'Create Account'}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminParents() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewParent, setViewParent] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const debounce = useRef(null);

  const loadParents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      // tab filtering
      if (tab === 'active') params.set('is_active', 'true');
      else if (tab === 'rejected' || tab === 'suspended' || tab === 'pending') {
        // These come from registration_requests — for approved parents we filter by is_active
        // We use the generic listParents and filter client-side for status tabs
      }
      params.set('limit', '300');
      const { data } = await axiosClient.get(`/admin/parents?${params}`);
      let all = data.parents || [];

      // exceptional filter
      if (tab === 'exceptional') all = all.filter(p => p.guardian_relationship && p.guardian_relationship !== 'parent');
      else if (tab === 'active') all = all.filter(p => p.is_active);
      else if (tab === 'suspended') all = all.filter(p => !p.is_active);

      // search
      if (search) {
        const q = search.toLowerCase();
        all = all.filter(p => p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.phone?.includes(q));
      }
      setTotal(all.length);
      setParents(all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load parents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, search, page]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadParents(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [tab, search]);

  useEffect(() => { loadParents(); }, [page]);

  async function handleToggle(parentId, isActive) {
    try {
      await axiosClient.patch(`/admin/parents/${parentId}/${isActive ? 'deactivate' : 'activate'}`);
      setSuccess(isActive ? 'Parent deactivated' : 'Parent activated');
      setTimeout(() => setSuccess(''), 2500);
      loadParents(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-2.5"><MdFamilyRestroom className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Parents & Guardians</h1>
              <p className="text-sm text-slate-500">Manage all parent and guardian accounts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadParents(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              <MdRefresh className={refreshing ? 'animate-spin' : ''} />Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm font-semibold transition">
              <MdAdd /> Create Parent
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex justify-between">{error}<button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">&times;</button></div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Tabs + Search */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-wrap gap-1 px-4 pt-4 border-b border-slate-100">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px ${tab === t.key ? 'border-violet-500 text-violet-700 bg-violet-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by name, email, or phone…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
            </div>
            <p className="text-xs text-slate-400 mt-2">{total} record{total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['', 'Name', 'Email', 'Phone', 'Relationship', 'Status', 'Registered', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                )) : parents.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No parents found.</td></tr>
                ) : parents.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                        {p.full_name?.[0] || 'P'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{p.full_name}</p>
                      {p.guardian_relationship !== 'parent' && (
                        <span className="text-xs text-amber-600 font-medium">Exceptional</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{p.guardian_relationship || 'parent'}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={p.is_active} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setViewParent(p)} className="rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-600 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                          <MdPerson className="text-sm" /> View
                        </button>
                        <button onClick={() => handleToggle(p.id, p.is_active)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1 ${p.is_active ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}>
                          {p.is_active ? <><MdPause className="text-sm" />Deactivate</> : <><MdPlayArrow className="text-sm" />Activate</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {page} of {totalPages} · {total} total</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewParent && <ViewModal parent={viewParent} onClose={() => setViewParent(null)} />}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); setSuccess('Parent account created successfully'); setTimeout(() => setSuccess(''), 3000); loadParents(true); }} />}
    </AdminLayout>
  );
}
