import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdPeople, MdSearch, MdOpenInNew, MdInfoOutline } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

export default function InstructorStudents() {
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [students, setStudents]       = useState([]);
  const [loadingA, setLoadingA]       = useState(true);
  const [loadingS, setLoadingS]       = useState(false);
  const [search, setSearch]           = useState('');

  useEffect(() => {
    axiosClient.get('/instructor/assignments')
      .then(({ data }) => {
        const list = data.assignments || [];
        setAssignments(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .finally(() => setLoadingA(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingS(true);
    setStudents([]);
    axiosClient.get(`/instructor/assignments/${selected.id}/students`)
      .then(({ data }) => setStudents(data.students || []))
      .finally(() => setLoadingS(false));
  }, [selected]);

  const filtered = students.filter(s =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <MdPeople className="text-indigo-600" /> My Students
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Select an assignment to view its students. You can only see students in your assigned classes.
          </p>
        </div>

        {/* Security notice */}
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 flex items-start gap-3 text-sm text-indigo-700">
          <MdInfoOutline className="text-indigo-500 text-lg flex-shrink-0 mt-0.5" />
          Students shown here belong only to your assigned classes. You cannot see students from other instructors' classes.
        </div>

        {/* Assignment selector */}
        {loadingA ? (
          <div className="flex gap-3">{[1,2,3].map(i => <div key={i} className="h-10 w-36 bg-slate-200 rounded-xl animate-pulse" />)}</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="font-bold text-slate-700">No Assignments Yet</h3>
            <p className="text-sm text-slate-400 mt-1">Contact admin to get teaching assignments.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {assignments.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    selected?.id === a.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {a.course_title}
                  {a.grade && ` · G${a.grade}`}
                  {a.section && ` · ${a.section}`}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search students…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Selected assignment info */}
            {selected && (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>Assignment:</span>
                <span className="font-semibold text-slate-700">{selected.course_title}</span>
                {selected.age_group_name && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{selected.age_group_name}</span>}
                {selected.grade && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Grade {selected.grade}</span>}
                <span className="ml-auto font-medium">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Students grid */}
            {loadingS ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <div className="text-4xl mb-2">👥</div>
                <p className="font-semibold text-slate-700">
                  {students.length === 0 ? 'No Students in This Class' : 'No Results Found'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {students.length === 0
                    ? 'Students will appear here once they are enrolled.'
                    : 'Try a different search.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(s => (
                  <Link
                    key={s.id}
                    to={`/instructor/students/${s.id}`}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all p-5 flex items-center gap-4"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {s.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">
                        {s.full_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.account_type === 'individual'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {s.account_type === 'individual' ? '👤 Individual' : '👨‍👩‍👧 Parent-managed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{s.age_group_name}</p>
                    </div>
                    <MdOpenInNew className="text-slate-300 group-hover:text-indigo-500 transition flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </InstructorLayout>
  );
}
