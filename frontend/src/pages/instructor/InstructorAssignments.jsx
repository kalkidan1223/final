import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAssignment, MdSearch, MdFilterList, MdOpenInNew, MdPeople, MdMenuBook, MdInfoOutline } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  archived: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function InstructorAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    axiosClient.get('/instructor/assignments')
      .then(({ data }) => setAssignments(data.assignments || []))
      .catch(err => setError(err.response?.data?.error || 'Could not load assignments'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assignments.filter(a => {
    const matchSearch = !search ||
      a.course_title?.toLowerCase().includes(search.toLowerCase()) ||
      a.age_group_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <MdAssignment className="text-indigo-600" /> My Teaching Assignments
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              These assignments are set by the administrator. Click any assignment to open its workspace.
            </p>
          </div>
        </div>

        {/* Info notice */}
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 flex items-start gap-3 text-sm text-indigo-800">
          <MdInfoOutline className="text-indigo-600 text-lg flex-shrink-0 mt-0.5" />
          <p>
            Teaching assignments are managed by the administrator. Each assignment links you to a specific
            course, age group, grade, and section. You can only see and manage students within your assignments.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by course or age group…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'inactive', 'archived'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                  filterStatus === s
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">⚠️ {error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="h-56 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="font-bold text-slate-700 text-lg mb-2">
              {assignments.length === 0 ? 'No Assignments Yet' : 'No Results Found'}
            </h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              {assignments.length === 0
                ? 'No teaching assignments have been assigned yet. Please contact the administrator.'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        )}

        {/* Assignments grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(a => (
              <Link
                key={a.id}
                to={`/instructor/assignments/${a.id}`}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all overflow-hidden"
              >
                {/* Color stripe */}
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-slate-800 text-base group-hover:text-indigo-700 transition-colors leading-tight">
                      {a.course_title}
                    </h3>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[a.status] || STATUS_COLORS.inactive}`}>
                      {a.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium border border-indigo-100">
                      {a.age_group_name}
                    </span>
                    {a.grade && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Grade {a.grade}</span>
                    )}
                    {a.section && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Sec. {a.section}</span>
                    )}
                    {a.academic_year && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{a.academic_year}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Students', v: a.student_count ?? 0, icon: '👥' },
                      { label: 'Lessons',  v: a.lesson_count ?? 0,  icon: '📚' },
                      { label: 'Pending',  v: a.pending_count ?? 0, icon: '⏳' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 rounded-xl py-2 text-center border border-slate-100">
                        <div className="text-sm">{s.icon}</div>
                        <div className="font-bold text-slate-800 text-sm">{s.v}</div>
                        <div className="text-xs text-slate-400">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
                      Open Workspace <MdOpenInNew className="text-sm" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
