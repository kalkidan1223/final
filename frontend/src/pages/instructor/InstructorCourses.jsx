import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Layout from '../../components/Layout';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', age_group_id: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function loadCourses() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/courses', { params: { mine: 'true' } });
      setCourses(data.courses);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
    // Age groups are needed for the create form; a lightweight endpoint is
    // assumed here (age_groups is a lookup table with no ownership rules).
    axiosClient.get('/age-groups').then(({ data }) => setAgeGroups(data.age_groups)).catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await axiosClient.post('/courses', form);
      setForm({ title: '', description: '', age_group_id: '' });
      await loadCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the course');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Layout>
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">My courses</h1>

      <form onSubmit={handleCreate} className="mb-10 space-y-3 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-700">Create a new course</h2>
        <input
          required
          placeholder="Course title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
          rows={3}
        />
        <select
          required
          value={form.age_group_id}
          onChange={(e) => setForm((f) => ({ ...f, age_group_id: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
        >
          <option value="">Select age group</option>
          {ageGroups.map((ag) => (
            <option key={ag.id} value={ag.id}>{ag.name}</option>
          ))}
        </select>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-sky-500 px-5 py-2.5 font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {creating ? 'Creating…' : 'Create course'}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">Loading courses…</p>
      ) : courses.length === 0 ? (
        <p className="text-slate-500">You haven't created any courses yet.</p>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => (
            <li key={c.id}>
              <Link
                to={`/instructor/courses/${c.id}`}
                className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <p className="font-medium text-slate-800">{c.title}</p>
                  <p className="text-sm text-slate-500">{c.age_group_name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                  {c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
    </Layout>
  );
}
