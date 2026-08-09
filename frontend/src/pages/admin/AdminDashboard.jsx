import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

function StatCard({ label, value, accent, icon, to, highlight }) {
  const inner = (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm border transition hover:shadow-md ${
        highlight ? 'border-amber-200 ring-2 ring-amber-100' : 'border-slate-100'
      } ${to ? 'cursor-pointer hover:border-violet-200' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {highlight && value > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Action needed
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );

  if (to) {
    return <Link to={to} className="block no-underline">{inner}</Link>;
  }
  return inner;
}

function QuickAction({ to, icon, title, description, color }) {
  const colors = {
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700',
    violet: 'bg-violet-50 hover:bg-violet-100 text-violet-700',
    sky: 'bg-sky-50 hover:bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700',
  };
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 rounded-xl p-4 transition group ${colors[color]}`}
    >
      <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-80">{description}</p>
      </div>
      <span className="ml-auto opacity-50 group-hover:opacity-100 transition">→</span>
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const { data } = await axiosClient.get('/admin/dashboard');
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function countFor(rows, key) {
    const row = rows?.find((r) => r.role === key || r.status === key);
    return row ? Number(row.count) : 0;
  }

  const totalUsers = stats?.users_by_role?.reduce((sum, r) => sum + Number(r.count), 0) || 0;
  const pendingApprovals =
    (stats?.pending_parent_registrations || 0) + (stats?.pending_student_registrations || 0);
  const pendingSubmissions = countFor(stats?.submissions_by_status, 'pending');
  const publishedCourses = countFor(stats?.courses_by_status, 'published');
  const population = stats?.population || {};
  const content = stats?.content || {};
  const maxRegistrations = Math.max(1, ...(stats?.child_registrations || []).map((item) => Number(item.count)));

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-1">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadStats(true)}
            disabled={refreshing || loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadStats()}
              className="font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {pendingApprovals > 0 && !loading && (
          <Link
            to="/admin/approval"
            className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 hover:bg-amber-100 transition no-underline"
          >
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-800">
                {pendingApprovals} registration{pendingApprovals !== 1 ? 's' : ''} awaiting review
              </p>
              <p className="text-sm text-amber-600">
                {stats.pending_parent_registrations} parent
                {stats.pending_parent_registrations !== 1 ? 's' : ''},{' '}
                {stats.pending_student_registrations} student
                {stats.pending_student_registrations !== 1 ? 's' : ''} — click to review
              </p>
            </div>
            <span className="text-amber-600 font-semibold">Review →</span>
          </Link>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-5 border border-slate-100 animate-pulse">
                <div className="h-8 w-8 bg-slate-200 rounded mb-3" />
                <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Pending Approvals"
                value={pendingApprovals}
                accent="text-amber-600"
                icon="✅"
                to="/admin/approval"
                highlight={pendingApprovals > 0}
              />
              <StatCard
                label="Active Students"
                value={stats.active_students}
                accent="text-sky-600"
                icon="🎓"
                to="/admin/students"
              />
              <StatCard
                label="Total Users"
                value={totalUsers}
                accent="text-violet-600"
                icon="👥"
                to="/admin/users"
              />
              <StatCard
                label="Published Courses"
                value={publishedCourses}
                accent="text-emerald-600"
                icon="📚"
                to="/admin/courses"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Parents" value={content.total_parents || 0} accent="text-violet-600" icon="P" to="/admin/parents" />
              <StatCard label="Exceptional Guardians" value={content.total_guardians || 0} accent="text-indigo-600" icon="G" to="/admin/parents" />
              <StatCard label="Parent-Managed Children" value={population.parent_managed_children || 0} accent="text-emerald-600" icon="C" to="/admin/students" />
              <StatCard label="Student Accounts" value={population.student_accounts || 0} accent="text-sky-600" icon="A" to="/admin/students" />
              <StatCard label="Active Instructors" value={content.active_instructors || 0} accent="text-violet-600" icon="I" to="/admin/instructors" />
              <StatCard label="Total Lessons" value={content.total_lessons || 0} accent="text-amber-600" icon="L" to="/admin/courses" />
              <StatCard label="Learning Materials" value={content.total_materials || 0} accent="text-sky-600" icon="M" to="/admin/courses" />
              <StatCard label="Total Quizzes" value={content.total_quizzes || 0} accent="text-emerald-600" icon="Q" to="/admin/analytics" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <QuickAction
                    to="/admin/approval"
                    icon="✅"
                    title="Review Approvals"
                    description="Approve or reject parent & student registrations"
                    color="amber"
                  />
                  <QuickAction
                    to="/admin/instructors"
                    icon="👨‍🏫"
                    title="Manage Instructors"
                    description="Create accounts and manage instructor access"
                    color="violet"
                  />
                  <QuickAction
                    to="/admin/courses"
                    icon="📚"
                    title="Manage Courses"
                    description="Publish, archive, or review course content"
                    color="emerald"
                  />
                  <QuickAction
                    to="/admin/users"
                    icon="👥"
                    title="Manage Users"
                    description="Activate, deactivate, or view all accounts"
                    color="sky"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Platform Overview</h2>
                <dl className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <dt className="text-sm text-slate-500">Parents</dt>
                    <dd className="font-semibold text-slate-800">
                      {countFor(stats.users_by_role, 'parent')}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <dt className="text-sm text-slate-500">Instructors</dt>
                    <dd className="font-semibold text-slate-800">
                      {countFor(stats.users_by_role, 'instructor')}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-50">
                    <dt className="text-sm text-slate-500">Pending Submissions</dt>
                    <dd className="font-semibold text-slate-800">{pendingSubmissions}</dd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm text-slate-500">Draft Courses</dt>
                    <dd className="font-semibold text-slate-800">
                      {countFor(stats.courses_by_status, 'draft')}
                    </dd>
                  </div>
                </dl>

                {stats.recent_instructors?.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Recent Instructors</h3>
                    <ul className="space-y-2">
                      {stats.recent_instructors.map((inst) => (
                        <li key={inst.id} className="flex justify-between text-sm">
                          <span className="text-slate-700">{inst.full_name}</span>
                          <span className="text-slate-400 truncate ml-2 max-w-[140px]">{inst.email}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-700">Child Account Distribution</h2>
                <p className="mt-1 text-sm text-slate-500">Approved children by access model.</p>
                <div className="mt-5 space-y-4">
                  {[
                    ['Ages 5-9 · Parent Managed', population.ages_5_to_9 || 0, 'bg-emerald-500'],
                    ['Ages 10-12 · Student Account', population.ages_10_to_12 || 0, 'bg-sky-500'],
                  ].map(([label, value, color]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-semibold text-slate-800">{value}</span></div><div className="h-3 rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${population.total_children ? (Number(value) / Number(population.total_children)) * 100 : 0}%` }} /></div></div>)}
                </div>
                <h3 className="mt-7 text-sm font-semibold text-slate-700">Recent child registrations</h3>
                <div className="mt-4 flex h-24 items-end gap-2">{(stats.child_registrations || []).map((item) => <div key={item.day} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t bg-violet-400" style={{ height: `${(Number(item.count) / maxRegistrations) * 76}px` }} title={`${item.day}: ${item.count}`} /><span className="text-[10px] text-slate-400">{new Date(item.day).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span></div>)}{stats.child_registrations?.length === 0 && <p className="text-sm text-slate-500">No recent child registrations.</p>}</div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
