import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [coursesRes, progressRes, recsRes] = await Promise.all([
      axiosClient.get('/courses'),
      axiosClient.get('/progress/me'),
      axiosClient.get(`/ai/recommendations/${user.student_id}`),
    ]);
    setCourses(coursesRes.data.courses);
    setProgress(progressRes.data.progress);
    setRecommendations(recsRes.data.recommendations);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.student_id) loadAll();
  }, [user]);

  async function handleGenerateRecommendations() {
    setGenerating(true);
    try {
      await axiosClient.post(`/ai/recommendations/${user.student_id}/generate`);
      const { data } = await axiosClient.get(`/ai/recommendations/${user.student_id}`);
      setRecommendations(data.recommendations);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-slate-800">Hi, {user.full_name.split(' ')[0]}! 👋</h1>

        <div className="mb-8 flex items-center justify-between rounded-2xl bg-amber-50 p-6">
          <div>
            <h2 className="font-medium text-amber-900">Recommended for you</h2>
            <p className="text-sm text-amber-700">Based on your quiz and activity results</p>
          </div>
          <button
            onClick={handleGenerateRecommendations}
            disabled={generating}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {generating ? 'Thinking…' : 'Refresh'}
          </button>
        </div>

        <ul className="mb-10 space-y-2">
          {recommendations.map((rec) => (
            <li key={rec.id} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">{rec.recommendation_type.replace('_', ' ')}</p>
              <p className="text-sm text-slate-700">{rec.reason}</p>
            </li>
          ))}
          {recommendations.length === 0 && (
            <p className="text-slate-500">No recommendations yet — hit refresh once you've tried a few lessons.</p>
          )}
        </ul>

        <h2 className="mb-3 text-lg font-medium text-slate-700">Courses</h2>
        <ul className="mb-10 space-y-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Link to={`/courses/${c.id}`} className="block rounded-2xl bg-white p-5 shadow-sm hover:shadow-md">
                <p className="font-medium text-slate-800">{c.title}</p>
                <p className="text-sm text-slate-500">{c.age_group_name} · by {c.instructor_name}</p>
              </Link>
            </li>
          ))}
          {courses.length === 0 && <p className="text-slate-500">No courses available yet.</p>}
        </ul>

        <h2 className="mb-3 text-lg font-medium text-slate-700">Your progress</h2>
        <ul className="space-y-2">
          {progress.map((p) => (
            <li key={p.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">{p.lesson_title || p.course_title}</p>
                <span className="text-xs text-slate-500">{Math.round(p.completion_percentage)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-sky-400"
                  style={{ width: `${p.completion_percentage}%` }}
                />
              </div>
            </li>
          ))}
          {progress.length === 0 && <p className="text-slate-500">No progress recorded yet — jump into a lesson!</p>}
        </ul>
      </div>
    </Layout>
  );
}
