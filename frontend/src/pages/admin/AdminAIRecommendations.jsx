import { useEffect, useState, useCallback, useRef } from 'react';
import { MdSmartToy, MdSearch, MdRefresh, MdCheckCircle, MdCancel, MdInfo } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 20;

const TYPE_COLORS = {
  lesson:                'bg-violet-100 text-violet-700',
  video:                 'bg-sky-100 text-sky-700',
  activity:              'bg-amber-100 text-amber-700',
  revision:              'bg-rose-100 text-rose-700',
  practice_material:     'bg-emerald-100 text-emerald-700',
  performance_prediction:'bg-indigo-100 text-indigo-700',
};

function TypeBadge({ type }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[type] || 'bg-slate-100 text-slate-500'}`}>
      {type?.replace('_', ' ')}
    </span>
  );
}

function ConfidenceBar({ score }) {
  const pct = Math.round((Number(score) || 0) * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100 min-w-[60px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function AdminAIRecommendations() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewedFilter, setViewedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const debounce = useRef(null);

  const loadRecs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (viewedFilter !== '') params.set('is_viewed', viewedFilter);
      params.set('limit', '200');
      const { data } = await axiosClient.get(`/admin/ai-recommendations?${params}`);
      const all = data.recommendations || [];
      const filtered = search
        ? all.filter(r =>
            r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.reason?.toLowerCase().includes(search.toLowerCase()) ||
            r.recommendation_type?.toLowerCase().includes(search.toLowerCase())
          )
        : all;
      setTotal(filtered.length);
      setRecs(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, viewedFilter, search, page]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadRecs(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, typeFilter, viewedFilter]);

  useEffect(() => { loadRecs(); }, [page]);

  async function markViewed(id) {
    try {
      await axiosClient.patch(`/admin/ai-recommendations/${id}/view`);
      setSuccess('Marked as viewed');
      setTimeout(() => setSuccess(''), 2000);
      loadRecs(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5"><MdSmartToy className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">AI Recommendations</h1>
              <p className="text-sm text-slate-500">Monitor AI-generated learning recommendations</p>
            </div>
          </div>
          <button onClick={() => loadRecs(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
            <MdRefresh className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, reason, type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-violet-400 focus:outline-none">
            <option value="">All Types</option>
            {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select value={viewedFilter} onChange={e => setViewedFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-violet-400 focus:outline-none">
            <option value="">All</option>
            <option value="false">Unviewed</option>
            <option value="true">Viewed</option>
          </select>
          {(search || typeFilter || viewedFilter !== '') && (
            <button onClick={() => { setSearch(''); setTypeFilter(''); setViewedFilter(''); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">Clear</button>
          )}
          <p className="w-full text-xs text-slate-400">{total} recommendation{total !== 1 ? 's' : ''} found</p>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Student', 'Type', 'Reason', 'Confidence', 'Item ID', 'Generated', 'Viewed', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : recs.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No recommendations found.</td></tr>
                ) : recs.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                          {r.student_name?.[0] || 'S'}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[110px]">{r.student_name || `Student #${r.student_id}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={r.recommendation_type} /></td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px]">
                      <p className="truncate" title={r.reason}>{r.reason || '—'}</p>
                    </td>
                    <td className="px-4 py-3 min-w-[100px]"><ConfidenceBar score={r.confidence_score} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">#{r.recommended_item_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(r.generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.is_viewed
                        ? <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-medium">Viewed</span>
                        : <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium flex items-center gap-1 w-fit"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />New</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(r)} className="rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 px-2.5 py-1 text-xs font-medium transition">
                          View
                        </button>
                        {!r.is_viewed && (
                          <button onClick={() => markViewed(r.id)} className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-medium transition">
                            Mark Viewed
                          </button>
                        )}
                      </div>
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

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><MdSmartToy className="text-indigo-600" /> Recommendation Details</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-400 mb-0.5">Student</p><p className="font-medium text-slate-700">{selected.student_name || `#${selected.student_id}`}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Type</p><TypeBadge type={selected.recommendation_type} /></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Item ID</p><p className="font-mono text-slate-700">#{selected.recommended_item_id}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Confidence</p><ConfidenceBar score={selected.confidence_score} /></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Generated</p><p className="text-slate-700">{new Date(selected.generated_at).toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-400 mb-0.5">Viewed</p><p className="text-slate-700">{selected.is_viewed ? 'Yes' : 'No'}</p></div>
              </div>
              {selected.reason && (
                <div><p className="text-xs text-slate-400 mb-0.5">Reason</p><p className="text-slate-700 bg-slate-50 rounded-lg p-3">{selected.reason}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
