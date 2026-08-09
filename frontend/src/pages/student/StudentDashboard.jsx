import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

const TABS = ['home', 'subjects', 'progress', 'ai learning'];
const SUBJECT_STYLE = ['from-sky-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-amber-400 to-orange-500'];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function loadAll() {
    if (!user?.student_id) return;
    setLoading(true);
    try {
      const [coursesRes, progressRes, recsRes, notificationsRes] = await Promise.all([
        axiosClient.get('/courses'), axiosClient.get('/progress/me'),
        axiosClient.get(`/ai/recommendations/${user.student_id}`), axiosClient.get('/notifications'),
      ]);
      setCourses(coursesRes.data.courses || []);
      setProgress(progressRes.data.progress || []);
      setRecommendations(recsRes.data.recommendations || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your learning space');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, [user?.student_id]);

  async function refreshRecommendations() {
    setGenerating(true);
    try {
      await axiosClient.post(`/ai/recommendations/${user.student_id}/generate`);
      await loadAll();
    } catch (err) { setError(err.response?.data?.error || 'Could not refresh recommendations');
    } finally { setGenerating(false); }
  }

  const averageProgress = useMemo(() => progress.length ? Math.round(progress.reduce((sum, item) => sum + Number(item.completion_percentage || 0), 0) / progress.length) : 0, [progress]);
  const completedLessons = progress.filter((item) => item.status === 'completed').length;
  const stars = completedLessons * 25 + Math.round(averageProgress / 5);
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  if (loading) return <Layout><p className="p-10 text-slate-500">Preparing your learning adventure...</p></Layout>;
  if (error) return <Layout><p className="p-10 text-rose-600">{error}</p></Layout>;

  return <Layout><div className="mx-auto max-w-6xl px-4 py-8">
    <section className="rounded-[2rem] bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 p-7 text-white shadow-xl">
      <p className="text-sm font-semibold text-sky-100">Child Learning Portal</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Hello, {user.full_name.split(' ')[0]}!</h1><p className="mt-2 text-sky-100">Today is a great day to learn something new.</p></div><div className="rounded-2xl bg-white/15 px-4 py-3"><p className="text-xs text-sky-100">Learning stars</p><p className="text-2xl font-bold">{stars}</p></div></div>
      <div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-white/15 p-3"><p className="text-xs text-sky-100">Progress</p><p className="mt-1 text-xl font-bold">{averageProgress}%</p></div><div className="rounded-2xl bg-white/15 p-3"><p className="text-xs text-sky-100">Lessons done</p><p className="mt-1 text-xl font-bold">{completedLessons}</p></div><div className="rounded-2xl bg-white/15 p-3"><p className="text-xs text-sky-100">New updates</p><p className="mt-1 text-xl font-bold">{unreadNotifications}</p></div></div>
    </section>

    <nav className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">{TABS.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-sky-50'}`}>{item}</button>)}</nav>

    {tab === 'home' && <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><section><div className="rounded-3xl bg-amber-50 p-6"><p className="text-sm font-bold text-amber-700">Today's mission</p><h2 className="mt-1 text-xl font-extrabold text-slate-800">Keep your learning streak going!</h2><ul className="mt-4 space-y-2 text-sm text-slate-700"><li>Read or watch one lesson</li><li>Complete one activity</li><li>Earn learning stars by trying your best</li></ul>{courses[0] && <Link to={`/courses/${courses[0].id}`} className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600">Continue learning</Link>}</div><h2 className="mb-3 mt-7 text-xl font-extrabold text-slate-800">Your subjects</h2><div className="grid gap-3 sm:grid-cols-2">{courses.slice(0, 4).map((course, index) => <Link key={course.id} to={`/courses/${course.id}`} className={`rounded-3xl bg-gradient-to-br ${SUBJECT_STYLE[index % SUBJECT_STYLE.length]} p-5 text-white shadow-md transition hover:-translate-y-0.5`}><p className="text-xs font-bold text-white/80">{course.age_group_name}</p><p className="mt-2 text-lg font-extrabold">{course.title}</p><p className="mt-3 text-sm text-white/90">Continue lesson</p></Link>)}</div></section><section className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-800">AI learning helper</h2><button onClick={refreshRecommendations} disabled={generating} className="text-sm font-bold text-sky-700 hover:underline">{generating ? 'Thinking...' : 'Refresh'}</button></div><p className="mt-1 text-sm text-slate-500">Friendly ideas picked from your learning progress.</p><div className="mt-4 space-y-3">{recommendations.slice(0, 3).map((item) => <div key={item.id} className="rounded-2xl bg-sky-50 p-4"><p className="text-xs font-bold uppercase text-sky-700">{item.recommendation_type.replace(/_/g, ' ')}</p><p className="mt-1 text-sm text-slate-700">{item.reason}</p></div>)}{recommendations.length === 0 && <p className="text-sm text-slate-500">Try a lesson or activity and I will suggest your next step.</p>}</div></section></div>}

    {tab === 'subjects' && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.map((course, index) => <Link key={course.id} to={`/courses/${course.id}`} className="rounded-3xl bg-white p-6 shadow-sm transition hover:shadow-md"><div className={`h-2 rounded-full bg-gradient-to-r ${SUBJECT_STYLE[index % SUBJECT_STYLE.length]}`} /><p className="mt-5 text-xl font-extrabold text-slate-800">{course.title}</p><p className="mt-2 text-sm text-slate-500">Teacher: {course.instructor_name}</p><p className="mt-4 text-sm font-bold text-sky-700">Open subject</p></Link>)}{courses.length === 0 && <p className="text-slate-500">Your teacher has not published a course for you yet.</p>}</div>}
    {tab === 'progress' && <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-extrabold text-slate-800">Your progress</h2><p className="mt-1 text-sm text-slate-500">Every small step helps you grow.</p><div className="mt-6 space-y-4">{progress.map((item) => <div key={item.id}><div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-slate-700">{item.lesson_title || item.course_title}</span><span className="text-slate-500">{Math.round(item.completion_percentage)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-500" style={{ width: `${item.completion_percentage}%` }} /></div></div>)}{progress.length === 0 && <p className="text-slate-500">Start a lesson to see your progress here.</p>}</div></section>}
    {tab === 'ai learning' && <section className="mt-6 space-y-3">{recommendations.map((item) => <div key={item.id} className="rounded-3xl bg-sky-50 p-5"><p className="font-extrabold capitalize text-slate-800">Try a {item.recommendation_type.replace(/_/g, ' ')}</p><p className="mt-2 text-sm text-slate-600">{item.reason}</p></div>)}{recommendations.length === 0 && <p className="text-slate-500">Your learning helper will have ideas once you begin.</p>}</section>}
  </div></Layout>;
}
