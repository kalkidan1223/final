import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLE = { draft: 'bg-slate-100 text-slate-700', published: 'bg-emerald-100 text-emerald-700', archived: 'bg-amber-100 text-amber-700' };

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient.get('/courses/my-dashboard').then(({ data: response }) => setData(response)).catch((err) => setError(err.response?.data?.error || 'Could not load instructor dashboard'));
  }, []);

  if (error) return <Layout><p className="p-10 text-rose-600">{error}</p></Layout>;
  if (!data) return <Layout><p className="p-10 text-slate-500">Loading teaching workspace...</p></Layout>;
  const { summary, recent_courses: recentCourses } = data;
  const cards = [['Assigned courses', summary.assigned_courses], ['Total lessons', summary.total_lessons], ['Students reached', summary.total_students], ['Parent-managed children', summary.parent_managed_children], ['Activities to review', summary.pending_activities], ['New notifications', summary.unread_notifications]];

  return <Layout><div className="mx-auto max-w-6xl px-4 py-8">
    <section className="rounded-3xl bg-gradient-to-r from-sky-600 to-blue-700 p-7 text-white shadow-lg">
      <p className="text-sm font-semibold text-sky-100">Instructor Portal</p>
      <h1 className="mt-1 text-3xl font-bold">Welcome back, {user?.full_name || 'Instructor'}</h1>
      <p className="mt-2 text-sky-100">Plan lessons, guide learners, and review their work from one workspace.</p>
      <div className="mt-5"><Link to="/instructor/courses" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50">Manage courses</Link></div>
    </section>
    <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-800">{value}</p></div>)}</section>
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-800">My courses</h2><p className="mt-1 text-sm text-slate-500">Recent course activity and publishing state.</p></div><Link to="/instructor/courses" className="text-sm font-semibold text-sky-700 hover:underline">View all</Link></div>
      <div className="mt-5 space-y-3">{recentCourses.map((course) => <Link key={course.id} to={`/instructor/courses/${course.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 hover:bg-sky-50"><div><p className="font-semibold text-slate-800">{course.title}</p><p className="text-sm text-slate-500">{course.age_group_name} · {course.lesson_count} lessons</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[course.status]}`}>{course.status}</span></Link>)}{recentCourses.length === 0 && <p className="text-slate-500">No assigned courses yet.</p>}</div>
    </section>
  </div></Layout>;
}
