import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

const ACTIVITY_TYPES = [
  'writing', 'reading', 'drawing', 'speaking', 'worksheet',
  'matching', 'coloring', 'counting', 'fill_in_the_blank',
  'drag_and_drop', 'multiple_choice', 'true_false', 'puzzle',
  'story_reading', 'pronunciation', 'vocabulary_practice',
  'letter_tracing', 'number_tracing',
];

export default function InstructorLessonDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [videoForm, setVideoForm] = useState({ title: '', video_url: '' });
  const [quizForm, setQuizForm] = useState({ title: '', description: '' });
  const [activityForm, setActivityForm] = useState({
    title: '', activity_type: 'worksheet', instructions: '', age_group_id: '', requires_upload: false,
  });
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await axiosClient.get(`/lessons/${id}`);
    setData(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    axiosClient.get('/age-groups').then(({ data }) => setAgeGroups(data.age_groups));
  }, [id]);

  async function handleAddVideo(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post(`/lessons/${id}/videos`, videoForm);
      setVideoForm({ title: '', video_url: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add video');
    }
  }

  async function handleAddQuiz(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post(`/lessons/${id}/quizzes`, quizForm);
      setQuizForm({ title: '', description: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add quiz');
    }
  }

  async function handleAddActivity(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post(`/lessons/${id}/activities`, activityForm);
      setActivityForm({ title: '', activity_type: 'worksheet', instructions: '', age_group_id: '', requires_upload: false });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add activity');
    }
  }

  if (loading || !data) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  const { lesson, videos, quizzes, activities } = data;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to={`/instructor/courses/${lesson.course_id}`} className="text-sm text-sky-600 hover:underline">
          ← Back to {lesson.course_title}
        </Link>
        <h1 className="mb-6 mt-2 text-2xl font-semibold text-slate-800">{lesson.title}</h1>
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

        {/* Videos */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-medium text-slate-700">Videos</h2>
          <ul className="mb-3 space-y-2">
            {videos.map((v) => (
              <li key={v.id} className="rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm">▶ {v.title}</li>
            ))}
          </ul>
          <form onSubmit={handleAddVideo} className="flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
            <input required placeholder="Title" value={videoForm.title}
              onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input required placeholder="Video URL" value={videoForm.video_url}
              onChange={(e) => setVideoForm((f) => ({ ...f, video_url: e.target.value }))}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">Add</button>
          </form>
        </section>

        {/* Quizzes */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-medium text-slate-700">Quizzes</h2>
          <ul className="mb-3 space-y-2">
            {quizzes.map((q) => (
              <li key={q.id}>
                <Link to={`/instructor/quizzes/${q.id}`} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm hover:shadow-md">
                  <span className="text-slate-700">📝 {q.title}</span>
                  <span className="text-sky-600">Manage questions →</span>
                </Link>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddQuiz} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
            <input required placeholder="Quiz title" value={quizForm.title}
              onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">Add quiz</button>
          </form>
        </section>

        {/* Activities */}
        <section>
          <h2 className="mb-3 text-lg font-medium text-slate-700">Activities</h2>
          <ul className="mb-3 space-y-2">
            {activities.map((a) => (
              <li key={a.id}>
                <Link to={`/instructor/activities/${a.id}/submissions`} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm hover:shadow-md">
                  <span className="text-slate-700">🎨 {a.title} <span className="text-xs text-slate-400">({a.activity_type.replace(/_/g, ' ')})</span></span>
                  <span className="text-sky-600">Review submissions →</span>
                </Link>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddActivity} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
            <input required placeholder="Activity title" value={activityForm.title}
              onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <select value={activityForm.activity_type}
                onChange={(e) => setActivityForm((f) => ({ ...f, activity_type: e.target.value }))}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
              <select required value={activityForm.age_group_id}
                onChange={(e) => setActivityForm((f) => ({ ...f, age_group_id: e.target.value }))}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Age group</option>
                {ageGroups.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
              </select>
            </div>
            <textarea required placeholder="Instructions" rows={2} value={activityForm.instructions}
              onChange={(e) => setActivityForm((f) => ({ ...f, instructions: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={activityForm.requires_upload}
                onChange={(e) => setActivityForm((f) => ({ ...f, requires_upload: e.target.checked }))} />
              Requires a file/photo upload
            </label>
            <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">Add activity</button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
