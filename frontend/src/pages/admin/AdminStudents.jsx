import { useEffect, useState, useCallback, useRef } from 'react';
import { MdSchool, MdSearch, MdRefresh, MdPerson, MdPause, MdPlayArrow } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 15;

function StatusBadge({ isActive }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function AccountTypeBadge({ hasLogin }) {
  return hasLogin
    ? <span className="rounded-full bg-sky-100 text-sky-700 px-2.5 py-0.5 text-xs font-semibold">Student Account</span>
    : <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">Parent-Managed</span>;
}

function ViewModal({ student, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-lg">{student.full_name?.[0] || 'S'}</div>
            <div>
              <h3 className="font-semibold text-slate-800">{student.full_name}</h3>
              <p className="text-xs text-slate-500">{student.age_group_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Student Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Full Name', student.full_name],
                ['Date of Birth', student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : '—'],
                ['Gender', student.gender || '—'],
                ['Age Group', student.age_group_name],
                ['Grade', student.grade || '—'],
                ['Section', student.section || '—'],
                ['Account Type', <AccountTypeBadge key="at" hasLogin={!!student.user_id} />],
                ['Status', <StatusBadge key="st" isActive={student.is_active} />],
                ['Admission No.', student.admission_number || '—'],
                ['Academic Year', student.academic_year || '—'],
                ['Language', student.preferred_language || '—'],
                ['Blood Group', student.blood_group || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-slate-700">{val || '—'}</p>
                </div>
              ))}
            </div>
          </section>

          {(student.medical_condition || student.learning_disability) && (
            <section className="rounded-xl bg-rose-50 border border-rose-100 p-4">
              <h4 className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">Health & Learning Notes</h4>
              <div className="space-y-2 text-sm">
                {student.medical_condition && <div><p className="text-xs text-rose-500 mb-0.5">Medical Condition</p><p className="text-rose-800">{student.medical_condition}</p></div>}
                {student.learning_disability && <div><p className="text-xs text-rose-500 mb-0.5">Learning Disability</p><p className="text-rose-800">{student.learning_disability}</p></div>}
              </div>
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Parent / Guardian</h4>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">{student.parent_name || '—'}</p>
              {student.user_id && <p className="text-xs text-slate-400 mt-0.5">Login: {student.email || student.user_full_name}</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewStudent, setViewStudent] = useState(null);
  const debounce = useRef(null);

  const loadStudents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set('is_active', activeFilter);
      params.set('limit', '300');
      const { data } = await axiosClient.get(`/admin/students?${params}`);
      let all = data.students || [];

      if (accountFilter === 'managed') all = all.filter(s => !s.user_id);
      else if (accountFilter === 'account') all = all.filter(s => !!s.user_id);

      if (search) {
        const q = search.toLowerCase();
        all = all.filter(s =>
          s.full_name?.toLowerCase().includes(q) ||
          s.parent_name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.grade?.toLowerCase().includes(q)
        );
      }
      setTotal(all.length);
      setStudents(all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, accountFilter, search, page]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadStudents(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, activeFilter, accountFilter]);

  useEffect(() => { loadStudents(); }, [page]);

  async function handleToggle(studentId, isActive) {
    try {
      await axiosClient.patch(`/admin/students/${studentId}/${isActive ? 'deactivate' : 'activate'}`);
      setSuccess(isActive ? 'Student deactivated' : 'Student activated');
      setTimeout(() => setSuccess(''), 2500);
      loadStudents(true);
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
            <div className="rounded-xl bg-sky-600 p-2.5"><MdSchool className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Students</h1>
              <p className="text-sm text-slate-500">View and manage all enrolled children and student accounts</p>
            </div>
          </div>
          <button onClick={() => loadStudents(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
            <MdRefresh className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex justify-between">{error}<button onClick={() => setError('')}>&times;</button></div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by name, parent, email, grade…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 self-center mr-1">Status:</span>
            {[{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }].map(o => (
              <button key={o.v} onClick={() => { setActiveFilter(o.v); setPage(1); }}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${activeFilter === o.v ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {o.l}
              </button>
            ))}
            <span className="text-xs text-slate-400 self-center ml-3 mr-1">Type:</span>
            {[{ v: '', l: 'All' }, { v: 'managed', l: 'Parent-Managed' }, { v: 'account', l: 'Student Account' }].map(o => (
              <button key={o.v} onClick={() => { setAccountFilter(o.v); setPage(1); }}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${accountFilter === o.v ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {o.l}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">{total} student{total !== 1 ? 's' : ''} found</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['', 'Student', 'Age Group', 'Grade / Section', 'Account Type', 'Parent', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                )) : students.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No students found.</td></tr>
                ) : students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm">{s.full_name?.[0] || 'S'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{s.full_name}</p>
                      <p className="text-xs text-slate-400">{s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.age_group_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.grade || '—'} {s.section ? `· ${s.section}` : ''}</td>
                    <td className="px-4 py-3"><AccountTypeBadge hasLogin={!!s.user_id} /></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.parent_name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={s.is_active} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setViewStudent(s)} className="rounded-lg bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-slate-600 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                          <MdPerson className="text-sm" />View
                        </button>
                        <button onClick={() => handleToggle(s.id, s.is_active)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition flex items-center gap-1 ${s.is_active ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}>
                          {s.is_active ? <><MdPause className="text-sm" />Deactivate</> : <><MdPlayArrow className="text-sm" />Activate</>}
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
      {viewStudent && <ViewModal student={viewStudent} onClose={() => setViewStudent(null)} />}
    </AdminLayout>
  );
}
