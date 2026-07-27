import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

function StatusBadge({ status }) {
  const colors = {
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  async function loadCourses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await axiosClient.get(`/admin/courses?${params.toString()}`);
      setCourses(data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCourses(); }, []);

  useEffect(() => {
    const timer = setTimeout(loadCourses, 300);
    return () => clearTimeout(timer);
  }, [statusFilter]);

  async function handleStatusChange(courseId, newStatus) {
    try {
      await axiosClient.patch(`/admin/courses/${courseId}/status`, { status: newStatus });
      loadCourses();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteCourse(courseId) {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    try {
      await axiosClient.delete(`/admin/courses/${courseId}`);
      loadCourses();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">📚 Course Management</h1>
        <p className="text-slate-500 mb-8">Manage all courses, change their status, or remove them.</p>

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setStatusFilter('')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${statusFilter === '' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${statusFilter === 'published' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Published
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${statusFilter === 'draft' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Draft
          </button>
          <button
            onClick={() => setStatusFilter('archived')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${statusFilter === 'archived' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Archived
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading courses…</p>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-violet-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Course</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Instructor</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Age Group</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-violet-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-800">{course.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{course.instructor_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{course.age_group_name}</td>
                      <td className="px-6 py-4"><StatusBadge status={course.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {course.status !== 'published' && (
                            <button
                              onClick={() => handleStatusChange(course.id, 'published')}
                              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Publish
                            </button>
                          )}
                          {course.status !== 'draft' && (
                            <button
                              onClick={() => handleStatusChange(course.id, 'draft')}
                              className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                            >
                              Draft
                            </button>
                          )}
                          {course.status !== 'archived' && (
                            <button
                              onClick={() => handleStatusChange(course.id, 'archived')}
                              className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {courses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No courses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}