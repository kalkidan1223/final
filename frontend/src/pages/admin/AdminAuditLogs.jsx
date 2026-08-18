import { useEffect, useState, useCallback, useRef } from 'react';
import { MdSecurity, MdSearch, MdRefresh, MdFilterList, MdPerson, MdInfo } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const ACTION_COLORS = {
  APPROVE_PARENT_REGISTRATION:  'bg-emerald-100 text-emerald-700',
  REJECT_PARENT_REGISTRATION:   'bg-red-100 text-red-700',
  SUSPEND_PARENT_REGISTRATION:  'bg-violet-100 text-violet-700',
  APPROVE_STUDENT_REGISTRATION: 'bg-emerald-100 text-emerald-700',
  REJECT_STUDENT_REGISTRATION:  'bg-red-100 text-red-700',
  CREATE_PARENT_OR_GUARDIAN:    'bg-sky-100 text-sky-700',
  CREATE_INSTRUCTOR:            'bg-sky-100 text-sky-700',
  UPDATE_STUDENT:               'bg-amber-100 text-amber-700',
  SUSPEND_USER:                 'bg-violet-100 text-violet-700',
  PUBLISH_LESSON:               'bg-emerald-100 text-emerald-700',
  DELETE_MATERIAL:              'bg-red-100 text-red-700',
  LOGIN:                        'bg-slate-100 text-slate-600',
};

const PAGE_SIZE = 25;

function ActionBadge({ action }) {
  const cls = ACTION_COLORS[action] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {action?.replace(/_/g, ' ')}
    </span>
  );
}

function JsonModal({ data, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><MdInfo /> Log Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-5 max-h-96 overflow-y-auto">
          <pre className="text-xs text-slate-700 bg-slate-50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const debounce = useRef(null);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity_type', entityFilter);
      params.set('limit', '200');
      const { data } = await axiosClient.get(`/admin/approval/audit-logs?${params}`);
      const all = data.audit_logs || [];
      // client-side search filter
      const filtered = search
        ? all.filter(l =>
            l.action?.toLowerCase().includes(search.toLowerCase()) ||
            l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
            String(l.entity_id).includes(search) ||
            String(l.user_id).includes(search)
          )
        : all;
      setTotal(filtered.length);
      setLogs(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter, entityFilter, search, page]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadLogs(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, actionFilter, entityFilter]);

  useEffect(() => { loadLogs(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ENTITY_TYPES = ['registration_request', 'student_registration_request', 'parent', 'instructor', 'student', 'course', 'lesson'];
  const ACTION_TYPES = Object.keys(ACTION_COLORS);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800 p-2.5"><MdSecurity className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
              <p className="text-sm text-slate-500">Complete record of all administrative actions</p>
            </div>
          </div>
          <button
            onClick={() => loadLogs(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <MdRefresh className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search action, entity, ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 bg-white"
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 bg-white"
            >
              <option value="">All Entities</option>
              {ENTITY_TYPES.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </select>
            {(search || actionFilter || entityFilter) && (
              <button
                onClick={() => { setSearch(''); setActionFilter(''); setEntityFilter(''); setPage(1); }}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">{total} log{total !== 1 ? 's' : ''} found</p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex justify-between">
            {error} <button onClick={() => loadLogs()} className="underline font-semibold">Retry</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Action', 'Entity', 'Admin', 'Timestamp', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No audit logs found.</td></tr>
                ) : logs.map((log, i) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition group">
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.id}</td>
                    <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-slate-700 capitalize">{log.entity_type?.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-400 ml-1">#{log.entity_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MdPerson className="text-slate-300 text-sm" />
                        <span className="text-sm text-slate-600">User #{log.user_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {(log.old_values || log.new_values || log.metadata) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-xs rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 px-2.5 py-1 font-medium transition"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                >← Prev</button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <JsonModal
          data={{ action: selectedLog.action, entity: `${selectedLog.entity_type} #${selectedLog.entity_id}`, old_values: selectedLog.old_values, new_values: selectedLog.new_values, metadata: selectedLog.metadata, ip_address: selectedLog.ip_address, timestamp: selectedLog.created_at }}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </AdminLayout>
  );
}
