import { useEffect, useState, useCallback, useRef } from 'react';
import { MdMenuBook, MdSearch, MdRefresh, MdVisibility, MdCheckCircle, MdArchive, MdUnpublished } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 20;

function StatusBadge({ published }) {
  return published
    ? <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">Published</span>
    : <span className="rounded-full bg-slate-100 text-slate-500 px-2.5 py-0.5 text-xs font-semibold">Draft</span>;
}

function LessonModal({ lesson, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Lesson Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-slate-400 font-medium uppercase mb-0.5">Title</p><p className="text-slate-700 font-medium">{lesson.title}</p></div>
            <div><p className="text-xs text-slate-400 font-medium uppercase mb-0.5">Course</p><p className="text-slate-700">{lesson.course_title}</p></div>
            <div><p className="text-xs text-slate-400 font-medium uppercase mb-0.5">Instructor</p><p className="text-slate-700">{lesson.instructor_name}</p></div>
            <div><p className="text-xs text-slate-400 font-medium uppercase mb-0.5">Age Group</p><p className="text-slate-700">{lesson.age_group_name}</p></div>
            <div><p className="text-xs text-slate-400 font-medium uppercase mb-0.5">Order</p><p className="text-slate-700">#{lesson.order_index + 1}</p></div>
            <div><p className="text-xs text-slate-400 font-medium uppercase mb-0.5">Created</p><p className="text-slate-700">{new Date(lesson.created_at).toLocaleDateString()}</p></div>
          </div>
          {lesson.description && (
            <div><p className="text-xs text-slate-400 font-medium uppercase mb-0.5">Description</p><p className="text-slate-600">{lesson.description}</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const debounce = useRef(null);

  const loadCourses = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/admin/courses');
      setCourses(data.courses || []);
    } catch { /* silent */ }
  }, []);

  const loadLessons = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (courseFilter) params.set('course_id', courseFilter);
      params.set('limit', '200');
      const { data } = await axiosClient.get(`/admin/lessons?${params}`);
      const all = data.lessons || [];
      const filtered = search
        ? all.filter(l => l.title?.toLowerCase().includes(search.toLowerCase()) || l.course_title?.toLowerCase().includes(search.toLowerCase()) || l.instructor_name?.toLowerCase().includes(search.toLowerCase()))
        : all;
      setTotal(filtered.length);
      setLessons(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lessons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseFilter, search, page]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadLessons(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, courseFilter]);

  useEffect(() => { loadLessons(); }, [page]);

  async function handleAction(lessonId, action) {
    setError('');
    try {
      await axiosClient.patch(`/admin/lessons/${lessonId}/status`, { action });
      setSuccess(`Lesson ${action}ed successfully`);
      setTimeout(() => setSuccess(''), 3000);
      loadLessons(true);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} lesson`);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-2.5"><MdMenuBook className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Lessons</h1>
              <p className="text-sm text-slate-500">Supervise and manage all lesson content</p>
            </div>
          </div>
          <button onClick={() => loadLessons(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
            <MdRefresh className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search lessons, courses, instructors…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-violet-400 focus:outline-none"
          >
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {(search || courseFilter) && (
            <button onClick={() => { setSearch(''); setCourseFilter(''); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">Clear</button>
          )}
          <p className="w-full text-xs text-slate-400">{total} lesson{total !== 1 ? 's' : ''} found</p>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Title', 'Course', 'Instructor', 'Age Group', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : lessons.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No lessons found.</td></tr>
                ) : lessons.map(lesson => (
                  <tr key={lesson.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs text-slate-400">{lesson.order_index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800 max-w-[180px] truncate">{lesson.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[140px]">
                      <p className="truncate">{lesson.course_title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{lesson.instructor_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{lesson.age_group_name}</td>
                    <td className="px-4 py-3"><StatusBadge published={lesson.is_published} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(lesson.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setSelected(lesson)} className="rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-600 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                          <MdVisibility className="text-sm" /> View
                        </button>
                        {!lesson.is_published ? (
                          <button onClick={() => handleAction(lesson.id, 'publish')} className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                            <MdCheckCircle className="text-sm" /> Publish
                          </button>
                        ) : (
                          <button onClick={() => handleAction(lesson.id, 'unpublish')} className="rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-medium transition flex items-center gap-1">
                            <MdUnpublished className="text-sm" /> Unpublish
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
      {selected && <LessonModal lesson={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
