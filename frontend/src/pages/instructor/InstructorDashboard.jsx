import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdSchool, MdPeople, MdMenuBook, MdAssignment, MdTrendingUp,
  MdCalendarToday, MdPending, MdCheckCircle, MdNotifications,
  MdArrowForward, MdOpenInNew, MdInfoOutline
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

function StatCard({ icon: Icon, label, value, color, to }) {
  const colors = {
    indigo:  'bg-indigo-600',
    emerald: 'bg-emerald-600',
    amber:   'bg-amber-500',
    rose:    'bg-rose-500',
    sky:     'bg-sky-600',
    violet:  'bg-violet-600',
  };
  const card = (
    <div className={`${colors[color]} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/70 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
        </div>
        <div className="bg-white/15 rounded-xl p-2.5">
          <Icon className="text-2xl" />
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

function AssignmentCard({ assignment }) {
  return (
    <Link
      to={`/instructor/assignments/${assignment.id}`}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 text-base group-hover:text-indigo-700 transition-colors">
              {assignment.course_title}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium border border-indigo-100">
                {assignment.age_group_name}
              </span>
              {assignment.grade && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                  Grade {assignment.grade}
                </span>
              )}
              {assignment.section && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                  Section {assignment.section}
                </span>
              )}
            </div>
          </div>
          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
            assignment.status === 'active'
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {assignment.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Students', value: assignment.student_count ?? 0, icon: '👥' },
            { label: 'Lessons',  value: assignment.lesson_count ?? 0,  icon: '📚' },
            { label: 'Pending',  value: assignment.pending_count ?? 0, icon: '⏳' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl py-2.5 border border-slate-100">
              <div className="text-base">{s.icon}</div>
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">{assignment.academic_year || ''}</span>
          <span className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
            Open Course <MdOpenInNew className="text-sm" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient.get('/instructor/dashboard')
      .then(({ data: res }) => setData(res))
      .catch(err => setError(err.response?.data?.error || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome banner */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">
            <p className="text-indigo-200 text-sm font-medium mb-1">{greeting} 👋</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">{user?.full_name || 'Instructor'}</h1>
            <p className="text-indigo-200 text-sm max-w-lg">
              Manage your teaching assignments, create lessons, review submissions, and track student progress.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link to="/instructor/assignments"
                className="bg-white text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-50 transition shadow-lg">
                My Assignments
              </Link>
              <Link to="/instructor/submissions"
                className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/20 transition backdrop-blur-sm">
                Review Submissions
              </Link>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        {/* No assignment state */}
        {!loading && !error && data && data.assignments?.length === 0 && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 border-dashed p-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">No Teaching Assignments Yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
              Your account has been approved, but no teaching assignment has been assigned yet. 
              Please contact the administrator.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium border border-amber-200">
              <MdInfoOutline /> Contact your administrator for assignment
            </div>
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : data?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={MdSchool}     label="Assignments"    value={data.summary.assignments}       color="indigo" to="/instructor/assignments" />
            <StatCard icon={MdPeople}     label="My Students"    value={data.summary.students}          color="emerald" to="/instructor/students" />
            <StatCard icon={MdMenuBook}   label="Lessons"        value={data.summary.lessons}           color="violet" />
            <StatCard icon={MdPending}    label="Pending Review" value={data.summary.pending_submissions} color="amber" to="/instructor/submissions" />
            <StatCard icon={MdCalendarToday} label="Attendance"  value={`${data.summary.attendance_rate ?? 0}%`} color="sky" to="/instructor/attendance" />
            <StatCard icon={MdCheckCircle} label="Avg Score"     value={`${data.summary.avg_score ?? 0}%`}      color="rose" />
          </div>
        )}

        {/* Assignments grid */}
        {!loading && data?.assignments?.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MdAssignment className="text-indigo-600" /> My Teaching Assignments
              </h2>
              <Link to="/instructor/assignments" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View All <MdArrowForward className="text-sm" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.assignments.map(a => <AssignmentCard key={a.id} assignment={a} />)}
            </div>
          </section>
        )}

        {/* Loading skeleton for assignments */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className="h-52 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
