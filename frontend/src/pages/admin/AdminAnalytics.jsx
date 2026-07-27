import { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

function StatCard({ label, value, accent, icon }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/admin/analytics');
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const totalRegistrations = analytics?.daily_registrations?.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">📈 Analytics</h1>
        <p className="text-slate-500 mb-8">Detailed platform analytics and insights.</p>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading analytics…</p>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              <StatCard label="Total Users" value={analytics.users_by_role?.reduce((s, r) => s + r.count, 0) || 0} accent="text-violet-600" icon="👥" />
              <StatCard label="Active Students" value={analytics.progress_by_status?.find((r) => r.status === 'in_progress')?.count || 0} accent="text-amber-600" icon="🎓" />
              <StatCard label="Published Courses" value={analytics.courses_by_status?.find((r) => r.status === 'published')?.count || 0} accent="text-emerald-600" icon="📚" />
              <StatCard label="Total Registrations (30d)" value={totalRegistrations} accent="text-sky-600" icon="📅" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">Users by Role</h3>
                <div className="space-y-3">
                  {analytics.users_by_role?.map((r) => (
                    <div key={r.role} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 capitalize">{r.role}</span>
                      <span className="text-sm font-semibold text-slate-800">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">Courses by Status</h3>
                <div className="space-y-3">
                  {analytics.courses_by_status?.map((r) => (
                    <div key={r.status} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 capitalize">{r.status}</span>
                      <span className="text-sm font-semibold text-slate-800">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">📝 Quiz Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Average Score</span>
                    <span className="text-sm font-semibold text-slate-800">{analytics.quiz_avg_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Total Submissions</span>
                    <span className="text-sm font-semibold text-slate-800">{analytics.quiz_total_submissions}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">📋 Progress by Status</h3>
                <div className="space-y-3">
                  {analytics.progress_by_status?.map((r) => (
                    <div key={r.status} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 capitalize">{r.status.replace('_', ' ')}</span>
                      <span className="text-sm font-semibold text-slate-800">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {analytics.top_students && analytics.top_students.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">🏆 Top Students</h3>
                <table className="w-full text-left">
                  <thead className="bg-violet-50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-violet-700">Student</th>
                      <th className="px-4 py-3 text-sm font-semibold text-violet-700">Email</th>
                      <th className="px-4 py-3 text-sm font-semibold text-violet-700">Avg Quiz Score</th>
                      <th className="px-4 py-3 text-sm font-semibold text-violet-700">Quizzes Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.top_students.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-medium text-slate-800">{s.full_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{s.email}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{Math.round(s.avg_quiz_score || 0)}%</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{s.quizzes_taken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {analytics.weak_areas && analytics.weak_areas.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">⚠️ Areas Needing Attention</h3>
                <table className="w-full text-left">
                  <thead className="bg-rose-50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-rose-700">Lesson</th>
                      <th className="px-4 py-3 text-sm font-semibold text-rose-700">Course</th>
                      <th className="px-4 py-3 text-sm font-semibold text-rose-700">Avg Score</th>
                      <th className="px-4 py-3 text-sm font-semibold text-rose-700">Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.weak_areas.map((w) => (
                      <tr key={w.lesson_title}>
                        <td className="px-4 py-3 font-medium text-slate-800">{w.lesson_title}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{w.course_title}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-rose-600">{Math.round(w.avg_activity_score || 0)}%</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{w.submission_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}