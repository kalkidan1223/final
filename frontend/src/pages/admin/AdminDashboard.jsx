import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  MdPeople, MdSchool, MdFamilyRestroom, MdMenuBook, MdBook,
  MdCheckCircle, MdGroups, MdSmartToy, MdRefresh, MdTrendingUp,
  MdAssignment, MdQuiz, MdWarning, MdArrowForward
} from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

// ─── Palette ────────────────────────────────────────────────────────────────
const COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, to, color, highlight, loading }) {
  const colorMap = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500', border: 'border-violet-200' },
    sky:    { bg: 'bg-sky-50',    text: 'text-sky-700',    icon: 'text-sky-500',    border: 'border-sky-200'    },
    emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-700',icon: 'text-emerald-500',border: 'border-emerald-200'},
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-500',  border: 'border-amber-200'  },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   icon: 'text-rose-500',   border: 'border-rose-200'   },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500', border: 'border-indigo-200' },
  };
  const c = colorMap[color] || colorMap.violet;

  const inner = (
    <div className={`rounded-2xl bg-white p-5 border transition-all duration-200 hover:shadow-md group ${
      highlight ? `border-amber-300 ring-2 ring-amber-100` : `border-slate-100 hover:border-${color}-200`
    } ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`rounded-xl p-2.5 ${c.bg}`}>
          <Icon className={`text-xl ${c.icon}`} />
        </div>
        {highlight && Number(value) > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 flex items-center gap-1">
            <MdWarning className="text-amber-500" /> Action needed
          </span>
        )}
        {to && !highlight && <MdArrowForward className="text-slate-300 group-hover:text-slate-500 transition" />}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className={`text-3xl font-bold ${c.text}`}>{value ?? '—'}</p>
          <p className="text-sm text-slate-500 mt-1">{label}</p>
        </>
      )}
    </div>
  );

  if (to && !loading) return <Link to={to} className="block no-underline">{inner}</Link>;
  return inner;
}

// ─── Section Card ────────────────────────────────────────────────────────────
function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-100 shadow-sm p-6 ${className}`}>
      {title && <h3 className="text-base font-semibold text-slate-700 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        axiosClient.get('/admin/dashboard'),
        axiosClient.get('/admin/analytics'),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── derived values ──────────────────────────────────────────────────────
  function countFor(rows, key) {
    const r = rows?.find(r => r.role === key || r.status === key);
    return r ? Number(r.count) : 0;
  }

  const pendingApprovals = (stats?.pending_parent_registrations || 0) + (stats?.pending_student_registrations || 0);
  const pop = stats?.population || {};
  const content = stats?.content || {};

  // Registration chart data (last 14 days)
  const regChartData = (stats?.child_registrations || []).map(r => ({
    date: new Date(r.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Registrations: Number(r.count),
  }));

  // User distribution pie
  const userPieData = (stats?.users_by_role || []).map(r => ({
    name: r.role.charAt(0).toUpperCase() + r.role.slice(1),
    value: Number(r.count),
  }));

  // Submissions bar chart
  const submissionsData = (stats?.submissions_by_status || []).map(r => ({
    status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    Count: Number(r.count),
  }));

  // Course status bar
  const courseData = (stats?.courses_by_status || []).map(r => ({
    status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    Count: Number(r.count),
  }));

  // Progress bar chart from analytics
  const progressData = (analytics?.progress_by_status || []).map(r => ({
    status: r.status.replace('_', ' '),
    Count: Number(r.count),
  }));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-0.5">
              Welcome back, <span className="font-medium text-violet-600">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
            </p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <MdRefresh className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => loadData()} className="font-semibold underline">Retry</button>
          </div>
        )}

        {/* ── Pending Banner ── */}
        {!loading && pendingApprovals > 0 && (
          <button
            onClick={() => navigate('/admin/approval')}
            className="w-full flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 hover:bg-amber-100 transition text-left"
          >
            <MdWarning className="text-2xl text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800">
                {pendingApprovals} registration{pendingApprovals !== 1 ? 's' : ''} awaiting review
              </p>
              <p className="text-sm text-amber-600">
                {stats.pending_parent_registrations} parent{stats.pending_parent_registrations !== 1 ? 's' : ''},&nbsp;
                {stats.pending_student_registrations} student{stats.pending_student_registrations !== 1 ? 's' : ''}
              </p>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-700">Review <MdArrowForward /></span>
          </button>
        )}

        {/* ── Primary Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Pending Approvals"     value={pendingApprovals}                  icon={MdCheckCircle}  to="/admin/approval"       color="amber"   highlight={pendingApprovals > 0} loading={loading} />
          <StatCard label="Active Students"        value={stats?.active_students}            icon={MdSchool}       to="/admin/students"       color="sky"     loading={loading} />
          <StatCard label="Parents & Guardians"    value={countFor(stats?.users_by_role,'parent')} icon={MdFamilyRestroom} to="/admin/parents" color="emerald" loading={loading} />
          <StatCard label="Active Instructors"     value={content.active_instructors}        icon={MdGroups}       to="/admin/instructors"    color="violet"  loading={loading} />
          <StatCard label="Published Courses"      value={countFor(stats?.courses_by_status,'published')} icon={MdBook} to="/admin/courses"  color="indigo"  loading={loading} />
        </div>

        {/* ── Secondary Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          <StatCard label="Parent-Managed Children" value={pop.parent_managed_children}  icon={MdFamilyRestroom} to="/admin/students" color="emerald" loading={loading} />
          <StatCard label="Student Accounts (10-12)" value={pop.student_accounts}        icon={MdSchool}         to="/admin/students" color="sky"     loading={loading} />
          <StatCard label="Total Lessons"            value={content.total_lessons}        icon={MdMenuBook}       to="/admin/lessons"  color="violet"  loading={loading} />
          <StatCard label="Total Quizzes"            value={content.total_quizzes}        icon={MdQuiz}           to="/admin/courses"  color="amber"   loading={loading} />
        </div>

        {/* ── Charts Row 1 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Registration trend */}
          <Card title="Child Registrations (Last 14 Days)" className="lg:col-span-2">
            {loading ? (
              <div className="h-52 bg-slate-50 rounded-xl animate-pulse" />
            ) : regChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={regChartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Registrations" stroke="#7c3aed" strokeWidth={2} fill="url(#regGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No registration data yet</div>
            )}
          </Card>

          {/* User distribution pie */}
          <Card title="User Distribution">
            {loading ? (
              <div className="h-52 bg-slate-50 rounded-xl animate-pulse" />
            ) : userPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={userPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {userPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No user data yet</div>
            )}
          </Card>
        </div>

        {/* ── Charts Row 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Activity submissions */}
          <Card title="Activity Submissions by Status">
            {loading ? (
              <div className="h-44 bg-slate-50 rounded-xl animate-pulse" />
            ) : submissionsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={submissionsData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Count" radius={[6, 6, 0, 0]}>
                    {submissionsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No submissions yet</div>
            )}
          </Card>

          {/* Course status */}
          <Card title="Courses by Status">
            {loading ? (
              <div className="h-44 bg-slate-50 rounded-xl animate-pulse" />
            ) : courseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={courseData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Count" radius={[6, 6, 0, 0]}>
                    {courseData.map((_, i) => <Cell key={i} fill={['#10b981','#7c3aed','#94a3b8'][i % 3]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No courses yet</div>
            )}
          </Card>

          {/* Learning progress */}
          <Card title="Learning Progress by Status">
            {loading ? (
              <div className="h-44 bg-slate-50 rounded-xl animate-pulse" />
            ) : progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={progressData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Count" radius={[0, 6, 6, 0]}>
                    {progressData.map((_, i) => <Cell key={i} fill={['#0ea5e9','#f59e0b','#10b981'][i % 3]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No progress data yet</div>
            )}
          </Card>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Age distribution */}
          <Card title="Student Age Distribution">
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Ages 5–9 · Parent-Managed', value: pop.ages_5_to_9 || 0, color: 'bg-emerald-500' },
                  { label: 'Ages 10–12 · Student Account', value: pop.ages_10_to_12 || 0, color: 'bg-sky-500' },
                ].map(({ label, value, color }) => {
                  const pct = pop.total_children ? Math.round((Number(value) / Number(pop.total_children)) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-semibold text-slate-800">{value} <span className="font-normal text-slate-400">({pct}%)</span></span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                  <span className="text-slate-500">Total children</span>
                  <span className="font-semibold text-slate-800">{pop.total_children || 0}</span>
                </div>
              </div>
            )}
          </Card>

          {/* Recent instructors + quick overview */}
          <Card title="Platform Overview">
            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}</div>
            ) : (
              <dl className="space-y-0 divide-y divide-slate-50">
                {[
                  ['Parents', countFor(stats?.users_by_role, 'parent'), '/admin/parents'],
                  ['Instructors', countFor(stats?.users_by_role, 'instructor'), '/admin/instructors'],
                  ['Total Students', stats?.active_students || 0, '/admin/students'],
                  ['Draft Courses', countFor(stats?.courses_by_status, 'draft'), '/admin/courses'],
                  ['Learning Materials', content.total_materials || 0, '/admin/courses'],
                  ['Pending Submissions', countFor(stats?.submissions_by_status, 'pending'), '/admin/analytics'],
                ].map(([label, val, to]) => (
                  <div key={label} className="flex justify-between items-center py-2.5">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <Link to={to} className="font-semibold text-slate-800 hover:text-violet-600 transition text-sm">{val}</Link>
                  </div>
                ))}
              </dl>
            )}

            {!loading && stats?.recent_instructors?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Instructors</p>
                <ul className="space-y-2">
                  {stats.recent_instructors.map(inst => (
                    <li key={inst.id} className="flex justify-between text-sm">
                      <span className="text-slate-700 font-medium">{inst.full_name}</span>
                      <span className="text-slate-400 text-xs truncate max-w-[150px]">{inst.email}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* ── Quiz Performance (from analytics) ── */}
        {!loading && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top students */}
            {analytics.top_students?.length > 0 && (
              <Card title="🏆 Top Students by Quiz Score">
                <div className="space-y-2">
                  {analytics.top_students.slice(0, 5).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-400'}`}>#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{s.full_name}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(s.avg_quiz_score || 0)}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-violet-700 flex-shrink-0">{Math.round(s.avg_quiz_score || 0)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Weak areas */}
            {analytics.weak_areas?.length > 0 && (
              <Card title="⚠️ Areas Needing Attention">
                <div className="space-y-2">
                  {analytics.weak_areas.slice(0, 5).map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{w.lesson_title}</p>
                        <p className="text-xs text-slate-400 truncate">{w.course_title}</p>
                      </div>
                      <span className="text-sm font-semibold text-rose-600 flex-shrink-0">{Math.round(w.avg_activity_score || 0)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
