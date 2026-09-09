import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MdArrowBack, MdSave } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const EMPTY_FORM = {
  title: '',
  description: '',
  learning_objectives: '',
  instructions: '',
  order_index: '',
  estimated_duration_minutes: '',
  difficulty_level: 'beginner',
};

export default function InstructorLessonCreate() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(lessonId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId]);

  async function loadContext() {
    setError('');
    try {
      if (courseId) {
        const { data } = await axiosClient.get(`/instructor/courses/${courseId}`);
        setCourseTitle(data.course?.title || '');
      }
      if (isEdit) {
        const { data } = await axiosClient.get(`/lessons/${lessonId}`);
        const lesson = data.lesson;
        setForm({
          title: lesson.title || '',
          description: lesson.description || '',
          learning_objectives: lesson.learning_objectives || '',
          instructions: lesson.instructions || '',
          order_index: lesson.order_index ?? '',
          estimated_duration_minutes: lesson.estimated_duration_minutes ?? '',
          difficulty_level: lesson.difficulty_level || 'beginner',
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load lesson details');
    } finally {
      setLoading(false);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        learning_objectives: form.learning_objectives.trim() || null,
        instructions: form.instructions.trim() || null,
        difficulty_level: form.difficulty_level,
        estimated_duration_minutes:
          form.estimated_duration_minutes === '' ? null : Number(form.estimated_duration_minutes),
      };

      let lesson;
      if (isEdit) {
        const { data } = await axiosClient.put(`/lessons/${lessonId}`, payload);
        lesson = data.lesson;
      } else {
        const order =
          form.order_index === '' ? undefined : Number(form.order_index);
        const { data } = await axiosClient.post(`/courses/${courseId}/lessons`, { ...payload, order_index: order });
        lesson = data.lesson;
      }

      navigate(`/instructor/courses/${lesson.course_id}/lessons/${lesson.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the lesson');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <InstructorLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-2/3 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </InstructorLayout>
    );
  }

  const backTo = courseId ? `/instructor/courses/${courseId}` : '/instructor/courses';

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-2xl">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
          <MdArrowBack /> Back {courseTitle ? `to ${courseTitle}` : 'to Courses'}
        </Link>

        <h1 className="mt-3 mb-1 text-2xl font-bold text-slate-800">
          {isEdit ? 'Edit Lesson' : 'Create Lesson'}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {isEdit
            ? 'Update the lesson details below.'
            : 'The course, age group, grade, section and academic year are applied automatically from your assignment.'}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lesson Title <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Introduction to Letters A–F"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="What is this lesson about?"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Learning Objectives</label>
            <textarea
              rows={3}
              value={form.learning_objectives}
              onChange={(e) => update('learning_objectives', e.target.value)}
              placeholder="What will students be able to do after this lesson?"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Instructions</label>
            <textarea
              rows={3}
              value={form.instructions}
              onChange={(e) => update('instructions', e.target.value)}
              placeholder="Step-by-step instructions for delivering this lesson"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Estimated Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.estimated_duration_minutes}
                onChange={(e) => update('estimated_duration_minutes', e.target.value)}
                placeholder="e.g. 45"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Difficulty Level</label>
              <select
                value={form.difficulty_level}
                onChange={(e) => update('difficulty_level', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            {!isEdit && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Lesson Order</label>
                <input
                  type="number"
                  min="0"
                  value={form.order_index}
                  onChange={(e) => update('order_index', e.target.value)}
                  placeholder="Leave blank to add at the end"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <MdSave /> {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Lesson'}
            </button>
          </div>
        </form>
      </div>
    </InstructorLayout>
  );
}