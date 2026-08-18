import { useEffect, useState, useCallback, useRef } from 'react';
import { MdBook, MdSearch, MdRefresh, MdPublish, MdUnpublished, MdArchive, MdDelete } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 15;

function StatusBadge({ status }) {
  const map = {
    draft:     'bg-slate-100 text-slate-600',
    published: 'bg-emerald-100 text-emerald-700',
    archived:  'bg-violet-100 text-violet-600',
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
}

function ViewModal({ course, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{course.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Title', course.title],
              ['Status', <StatusBadge key="s" status={course.status} />],
              ['Instructor', course.instructor_name],
              ['Age Group', course.age_group_name],
              ['Created', new Date(course.created_at).toLocaleDateString()],
              ['Updated', new Date(course.updated_at).toLocaleDateString()],
            ].map(([label, val]) => (
              <div key={label}><p className="text-xs text-slate-400 mb-0.5">{label}</p><p className="text-slate-700">{val || '—'}</p></div>
            ))}
          </div>
          {course.description && (
            <div><p className="text-xs text-slate-400 mb-1">Description</p><p className="text-slate-600 bg-slate-50 rounded-xl p-3">{course.description}</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
        <p className="text-sm text-slate-700 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-rose-500 text-white py-2.5 text-sm font-semibold hover:bg-rose-600 transition">Delete</button>
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [ageGroups, setAgeGroups] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewCourse, setViewCourse] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const debounce = useRef(null);

  const loadAgeGroups = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/admin/age-groups');
      setAgeGroups(data.age_groups || []);
    } catch { /* silent */ }
  }, []);

  const loadCourses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (ageFilter) params.set('age_group_id', ageFilter);
      params.set('limit', '300');
      const { data } = await axiosClient.get(`/admin/courses?${params}`);
      let all = data.courses || [];
      if (search) {
        const q = search.toLowerCase();
        all = all.filter(c => c.title?.toLowerCase().includes(q) || c.instructor_name?.toLowerCase().includes(q) || c.age_group_name?.toLowerCase().includes(q));
      }
      setTotal(all.length);
      setCourses(all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, ageFilter, search, page]);

  useEffect(() => { loadAgeGroups(); }, [loadAgeGroups]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadCourses(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, statusFilter, ageFilter]);

  useEffect(() => { loadCourses(); }, [page]);

  async function handleStatus(courseId, status) {
    try {
      await axiosClient.patch(`/admin/courses/${courseId}/status`, { status });
      setSuccess(`Course ${status}`);
      setTimeout(() => setSuccess(''), 2500);
      loadCourses(true);
    } catch (err) { setError(err.response?.data?.error || 'Action failed'); }
  }

  async function handleDelete(courseId) {
    try {
      await axiosClient.delete(`/admin/courses/${courseId}`);
      setSuccess('Course deleted');
      setConfirmDelete(null);
      setTimeout(() => setSuccess(''), 2500);
      loadCourses(true);
    } catch (err) { setError(err.response?.data?.error || 'Delete failed'); setConfirmDelete(null); }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5"><MdBook className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Course Management</h1>
              <p className="text-sm text-slate-500">Publish, archive, and manage all courses</p>
            </div>
          </div>
          <button onClick={() => loadCourses(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
            <MdRefresh className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex justify-between">{error}<button onClick={() => setError('')}>&times;</button></div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by title, instructor, age group…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 self-center mr-1">Status:</span>
            {[{ v: '', l: 'All' }, { v: 'published', l: 'Published' }, { v: 'draft', l: 'Draft' }, { v: 'archived', l: 'Archived' }].map(o => (
              <button key={o.v} onClick={() => { setStatusFilter(o.v); setPage(1); }}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${statusFilter === o.v ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {o.l}
              </button>
            ))}
            {ageGroups.length > 0 && (
              <>
                <span className="text-xs text-slate-400 self-center ml-3 mr-1">Age Group:</span>
                <select value={ageFilter} onChange={e => { setAgeFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none">
                  <option value="">All Ages</option>
                  {ageGroups.map(ag => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                </select>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400">{total} course{total !== 1 ? 's' : ''} found</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Title', 'Instructor', 'Age Group', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                )) : courses.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No courses found.</td></tr>
                ) : courses.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800 max-w-[200px] truncate">{c.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.instructor_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.age_group_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setViewCourse(c)} className="rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 px-2.5 py-1 text-xs font-medium transition">View</button>
                        {c.status !== 'published' && (
                          <button onClick={() => handleStatus(c.id, 'published')} className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                            <MdPublish className="text-sm" />Publish
                          </button>
                        )}
                        {c.status === 'published' && (
                          <button onClick={() => handleStatus(c.id, 'draft')} className="rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                            <MdUnpublished className="text-sm" />Unpublish
                          </button>
                        )}
                        {c.status !== 'archived' && (
                          <button onClick={() => handleStatus(c.id, 'archived')} className="rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                            <MdArchive className="text-sm" />Archive
                          </button>
                        )}
                        <button onClick={() => setConfirmDelete(c)} className="rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                          <MdDelete className="text-sm" />Delete
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

      {viewCourse && <ViewModal course={viewCourse} onClose={() => setViewCourse(null)} />}
      {confirmDelete && (
        <ConfirmModal
          message={`Delete course "${confirmDelete.title}"? This will remove all lessons, materials, quizzes, and activities. This cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AdminLayout>
  );
}
