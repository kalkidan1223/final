import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

function StatCard({ label, value, accent, icon }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ full_name: '', email: '', password: '', qualification: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadStats() {
    setLoading(true);
    const { data } = await axiosClient.get('/admin/dashboard');
    setStats(data);
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  function countFor(rows, key) {
    return rows?.find((r) => r.role === key || r.status === key)?.count || 0;
  }

  async function handleCreateInstructor(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/instructors', form);
      setSuccess(`Instructor account created for ${form.full_name}`);
      setForm({ full_name: '', email: '', password: '', qualification: '' });
    } catch (err) {
      const apiErrors = err.response?.data?.errors || [err.response?.data?.error || 'Could not create account'];
      setError(apiErrors.join(', '));
    } finally {
      setSubmitting(false);
    }
  }

  const totalUsers = stats?.users_by_role?.reduce((sum, r) => sum + r.count, 0) || 0;
  const totalPublished = stats?.courses_by_status?.find((r) => r.status === 'published')?.count || 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">🎓 Admin Dashboard</h1>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading dashboard…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              <StatCard label="Total Users" value={totalUsers} accent="text-violet-600" icon="👥" />
              <StatCard label="Published Courses" value={totalPublished} accent="text-emerald-600" icon="📚" />
              <StatCard label="Active Students" value={stats.active_students} accent="text-amber-600" icon="🎓" />
              <StatCard label="Pending Submissions" value={countFor(stats.submissions_by_status, 'pending')} accent="text-rose-600" icon="📋" />
              <StatCard label="Parents" value={countFor(stats.users_by_role, 'parent')} accent="text-emerald-600" icon="👨‍👩‍👧" />
              <StatCard label="Instructors" value={countFor(stats.users_by_role, 'instructor')} accent="text-sky-600" icon="👨‍🏫" />
              <StatCard label="Graded Submissions" value={countFor(stats.submissions_by_status, 'graded')} accent="text-emerald-600" icon="✅" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleCreateInstructor} className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">
                  <span className="text-2xl">➕</span> Create an Instructor Account
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                    <input
                      required
                      placeholder="Enter full name"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                    <input
                      required
                      type="email"
                      placeholder="instructor@school.edu"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Temporary Password</label>
                    <input
                      required
                      type="password"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Qualification (optional)</label>
                    <input
                      placeholder="e.g. B.Sc. Mathematics"
                      value={form.qualification}
                      onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                  {error && <p className="text-sm text-rose-600">{error}</p>}
                  {success && <p className="text-sm text-emerald-600">{success}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-600 disabled:opacity-60 transition text-lg"
                  >
                    {submitting ? 'Creating…' : '✨ Create Instructor'}
                  </button>
                </div>
              </form>

              <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
                <h2 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">
                  <span className="text-2xl">⚡</span> Quick Actions
                </h2>
                <div className="space-y-4">
                  <a href="/admin/users" className="flex items-center gap-4 rounded-xl bg-violet-50 p-4 hover:bg-violet-100 transition group">
                    <span className="text-3xl group-hover:scale-110 transition">👥</span>
                    <div>
                      <p className="font-semibold text-violet-700">Manage Users</p>
                      <p className="text-sm text-violet-500">Activate, deactivate, or view all user accounts</p>
                    </div>
                  </a>
                  <a href="/admin/students" className="flex items-center gap-4 rounded-xl bg-sky-50 p-4 hover:bg-sky-100 transition group">
                    <span className="text-3xl group-hover:scale-110 transition">🎓</span>
                    <div>
                      <p className="font-semibold text-sky-700">Manage Students</p>
                      <p className="text-sm text-sky-500">Oversee all student accounts and progress</p>
                    </div>
                  </a>
                  <a href="/admin/courses" className="flex items-center gap-4 rounded-xl bg-emerald-50 p-4 hover:bg-emerald-100 transition group">
                    <span className="text-3xl group-hover:scale-110 transition">📚</span>
                    <div>
                      <p className="font-semibold text-emerald-700">Manage Courses</p>
                      <p className="text-sm text-emerald-500">Publish, archive, or delete courses</p>
                    </div>
                  </a>
                  <a href="/admin/analytics" className="flex items-center gap-4 rounded-xl bg-amber-50 p-4 hover:bg-amber-100 transition group">
                    <span className="text-3xl group-hover:scale-110 transition">📈</span>
                    <div>
                      <p className="font-semibold text-amber-700">View Analytics</p>
                      <p className="text-sm text-amber-500">Detailed platform performance insights</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}