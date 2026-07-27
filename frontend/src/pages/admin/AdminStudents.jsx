import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

function StatusBadge({ isActive }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Deactivated'}
    </span>
  );
}

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  async function loadStudents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set('is_active', activeFilter);
      const { data } = await axiosClient.get(`/admin/students?${params.toString()}`);
      setStudents(data.students);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStudents(); }, []);

  useEffect(() => {
    const timer = setTimeout(loadStudents, 300);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  async function handleToggleStudent(studentId, currentStatus) {
    try {
      if (currentStatus) {
        await axiosClient.patch(`/admin/students/${studentId}/deactivate`);
      } else {
        await axiosClient.patch(`/admin/students/${studentId}/activate`);
      }
      loadStudents();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">🎓 Student Management</h1>
        <p className="text-slate-500 mb-8">View and manage all student accounts across the platform.</p>

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveFilter('')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeFilter === '' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('true')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeFilter === 'true' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter('false')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${activeFilter === 'false' ? 'bg-violet-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Deactivated
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading students…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((s) => (
              <div key={s.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{s.full_name}</h3>
                    <p className="text-sm text-slate-500">{s.email}</p>
                  </div>
                  <StatusBadge isActive={s.is_active} />
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium">Age Group:</span> {s.age_group_name}</p>
                  <p><span className="font-medium">Parent:</span> {s.parent_name}</p>
                  <p><span className="font-medium">DOB:</span> {new Date(s.date_of_birth).toLocaleDateString()}</p>
                  <p><span className="font-medium">Account:</span> {s.user_id ? 'Has login' : 'Parent-managed'}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleStudent(s.id, s.is_active)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${s.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    {s.is_active ? 'Deactivate Student' : 'Activate Student'}
                  </button>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <p className="col-span-full text-center text-slate-500 py-10">No students found.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}