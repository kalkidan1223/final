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

export default function AdminInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  async function loadInstructors() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set('is_active', activeFilter);
      const { data } = await axiosClient.get(`/admin/instructors?${params.toString()}`);
      setInstructors(data.instructors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInstructors(); }, []);

  useEffect(() => {
    const timer = setTimeout(loadInstructors, 300);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  async function handleToggleInstructor(instructorId, currentStatus) {
    try {
      if (currentStatus) {
        await axiosClient.patch(`/admin/instructors/${instructorId}/deactivate`);
      } else {
        await axiosClient.patch(`/admin/instructors/${instructorId}/activate`);
      }
      loadInstructors();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">👨‍🏫 Instructor Management</h1>
        <p className="text-slate-500 mb-8">Manage instructor accounts, view their details, and activate or deactivate them.</p>

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
          <p className="text-slate-500 text-center py-10">Loading instructors…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((inst) => (
              <div key={inst.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{inst.full_name}</h3>
                    <p className="text-sm text-slate-500">{inst.email}</p>
                  </div>
                  <StatusBadge isActive={inst.is_active} />
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  {inst.qualification && <p><span className="font-medium">Qualification:</span> {inst.qualification}</p>}
                  {inst.specialty && <p><span className="font-medium">Specialty:</span> {inst.specialty}</p>}
                  {inst.bio && <p><span className="font-medium">Bio:</span> {inst.bio}</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleInstructor(inst.id, inst.is_active)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${inst.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    {inst.is_active ? 'Deactivate Instructor' : 'Activate Instructor'}
                  </button>
                </div>
              </div>
            ))}
            {instructors.length === 0 && (
              <p className="col-span-full text-center text-slate-500 py-10">No instructors found.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}