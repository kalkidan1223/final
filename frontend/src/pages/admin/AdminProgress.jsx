import { useEffect, useState, useCallback, useRef } from 'react';
import { MdTrendingUp, MdSearch, MdRefresh, MdPerson } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 20;

function ProgressBar({ pct, color = 'bg-violet-500' }) {
  const p = Math.min(100, Math.max(0, Number(pct) || 0));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 w-8 text-right">{Math.round(p)}%</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed:   'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-amber-100 text-amber-700',
    not_started: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function DetailModal({ progress, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{progress.student_name}</h3>
            <p className="text-xs text-slate-500">{progress.course_title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-1">Overall Progress</p>
              <p className="text-xl font-bold text-violet-700">{Math.round(progress.completion_percentage || 0)}%</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <StatusBadge status={progress.status} />
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-1">Last Accessed</p>
              <p className="text-slate-700">{progress.last_accessed_at ? new Date(progress.last_accessed_at).toLocaleDateString() : 'Never'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-400 mb-1">Updated</p>
              <p className="text-slate-700">{new Date(progress.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
          {progress.parent_name && (
            <div><p className="text-xs text-slate-400 font-medium mb-0.5">Parent / Guardian</p><p className="text-slate-700">{progress.parent_name}</p></div>
          )}
          {progress.age_group_name && (
            <div><p className="text-xs text-slate-400 font-medium mb-0.5">Age Group</p><p className="text-slate-700">{progress.age_group_name}</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminProgress() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const debounce = useRef(null);

  const loadRecords = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '200');
      const { data } = await axiosClient.get(`/admin/progress?${params}`);
      const all = data.progress || [];
      const filtered = search
        ? all.filter(r =>
            r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.course_title?.toLowerCase().includes(search.toLowerCase()) ||
            r.parent_name?.toLowerCase().includes(search.toLowerCase())
          )
        : all;
      setTotal(filtered.length);
      setRecords(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadRecords(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, statusFilter]);

  useEffect(() => { loadRecords(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5"><MdTrendingUp className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Student Progress</h1>
              <p className="text-sm text-slate-500">Monitor learning progress across all courses</p>
            </div>
          </div>
          <button onClick={() => loadRecords(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
            <MdRefresh className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, course, parent…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['', 'not_started', 'in_progress', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {s === '' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <p className="w-full text-xs text-slate-400">{total} record{total !== 1 ? 's' : ''} found</p>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Student', 'Course', 'Progress', 'Status', 'Last Active', 'Parent', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No progress records found.</td></tr>
                ) : records.map((r, i) => (
                  <tr key={`${r.student_id}-${r.course_id}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-sm font-bold flex-shrink-0">
                          {r.student_name?.[0] || 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[120px]">{r.student_name}</p>
                          {r.age_group_name && <p className="text-xs text-slate-400">{r.age_group_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[140px]"><p className="truncate">{r.course_title}</p></td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <ProgressBar
                        pct={r.completion_percentage}
                        color={r.status === 'completed' ? 'bg-emerald-500' : r.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-300'}
                      />
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {r.last_accessed_at ? new Date(r.last_accessed_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.parent_name || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(r)} className="rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-600 px-2.5 py-1 text-xs font-medium transition">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {selected && <DetailModal progress={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
