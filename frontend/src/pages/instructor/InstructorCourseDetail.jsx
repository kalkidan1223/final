import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import Layout from '../../components/Layout';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function InstructorCourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '' });
  const [addingLesson, setAddingLesson] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await axiosClient.get(`/courses/${id}`);
    setCourse(data.course);
    setLessons(data.lessons);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleAddLesson(e) {
    e.preventDefault();
    setError('');
    setAddingLesson(true);
    try {
      await axiosClient.post(`/courses/${id}/lessons`, lessonForm);
      setLessonForm({ title: '', description: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add the lesson');
    } finally {
      setAddingLesson(false);
    }
  }

  async function handleDeleteLesson(lessonId) {
    if (!confirm('Delete this lesson? This cannot be undone.')) return;
    await axiosClient.delete(`/lessons/${lessonId}`);
    await load();
  }

  async function handleStatusChange(status) {
    await axiosClient.patch(`/courses/${id}/status`, { status });
    await load();
  }

  async function moveLesson(index, direction) {
    const newOrder = [...lessons];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    [newOrder[index], newOrder[swapWith]] = [newOrder[swapWith], newOrder[index]];
    setLessons(newOrder);
    await axiosClient.put(`/courses/${id}/lessons/reorder`, {
      ordered_lesson_ids: newOrder.map((l) => l.id),
    });
  }

  if (loading || !course) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  return (
    <Layout>
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{course.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{course.age_group_name}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[course.status]}`}>
          {course.status}
        </span>
      </div>

      <div className="mb-8 flex gap-2">
        {course.status !== 'published' && (
          <button
            onClick={() => handleStatusChange('published')}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Publish course
          </button>
        )}
        {course.status !== 'archived' && (
          <button
            onClick={() => handleStatusChange('archived')}
            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Archive course
          </button>
        )}
        {course.status !== 'draft' && (
          <button
            onClick={() => handleStatusChange('draft')}
            className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Move to draft
          </button>
        )}
      </div>

      <h2 className="mb-3 text-lg font-medium text-slate-700">Lessons</h2>
      <ul className="mb-8 space-y-2">
        {lessons.map((lesson, index) => (
          <li
            key={lesson.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium text-slate-800">
                <Link to={`/instructor/lessons/${lesson.id}`} className="hover:text-sky-600 hover:underline">
                  {lesson.title}
                </Link>
              </p>
              {lesson.description && <p className="text-sm text-slate-500">{lesson.description}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveLesson(index, -1)}
                disabled={index === 0}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => moveLesson(index, 1)}
                disabled={index === lessons.length - 1}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => handleDeleteLesson(lesson.id)}
                className="rounded-lg px-2 py-1 text-rose-500 hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {lessons.length === 0 && <p className="text-slate-500">No lessons yet.</p>}
      </ul>

      <form onSubmit={handleAddLesson} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="font-medium text-slate-700">Add a lesson</h3>
        <input
          required
          placeholder="Lesson title"
          value={lessonForm.title}
          onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
        />
        <textarea
          placeholder="Description"
          value={lessonForm.description}
          onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
          rows={2}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={addingLesson}
          className="rounded-xl bg-sky-500 px-5 py-2.5 font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {addingLesson ? 'Adding…' : 'Add lesson'}
        </button>
      </form>
    </div>
    </Layout>
  );
}
