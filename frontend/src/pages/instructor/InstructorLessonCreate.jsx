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
  prerequisites: '',
  teacher_notes: '',
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
  const [lessonBuilderType, setLessonBuilderType] = useState('structured');
  const [targetCourseId, setTargetCourseId] = useState(courseId || '');
  const [courses, setCourses] = useState([]);
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
        setLessonBuilderType(data.course?.lesson_builder_type || 'structured');
        setTargetCourseId(courseId);
      } else if (!isEdit) {
        const { data } = await axiosClient.get('/instructor/courses');
        setCourses(data.courses || []);
        if (data.courses?.length > 0) {
          setTargetCourseId(data.courses[0].course_id);
          setCourseTitle(data.courses[0].course_title);
          setLessonBuilderType(data.courses[0].lesson_builder_type || 'structured');
        }
      }
      if (isEdit) {
        const { data } = await axiosClient.get(`/lessons/${lessonId}`);
        const lesson = data.lesson;
        setForm({
          title: lesson.title || '',
          description: lesson.description || '',
          learning_objectives: lesson.learning_objectives || '',
          prerequisites: lesson.prerequisites || '',
          teacher_notes: lesson.teacher_notes || '',
          instructions: lesson.instructions || '',
          order_index: lesson.order_index ?? '',
          estimated_duration_minutes: lesson.estimated_duration_minutes ?? '',
          difficulty_level: lesson.difficulty_level || 'beginner',
        });
        setLessonBuilderType(lesson.lesson_builder_type || 'structured');
        setCourseTitle(lesson.course_title || '');
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
        prerequisites: form.prerequisites.trim() || null,
        teacher_notes: form.teacher_notes.trim() || null,
        instructions: form.instructions.trim() || null,
        difficulty_level: form.difficulty_level,
        estimated_duration_minutes:
          form.estimated_duration_minutes === '' ? null : Number(form.estimated_duration_minutes),
      };

      let lesson;
      const effectiveCourseId = courseId || targetCourseId;
      if (isEdit) {
        const { data } = await axiosClient.put(`/lessons/${lessonId}`, payload);
        lesson = data.lesson;
      } else {
        if (!effectiveCourseId) {
          setError('Please select a course for this lesson');
          setSaving(false);
          return;
        }
        const order =
          form.order_index === '' ? undefined : Number(form.order_index);
        const { data } = await axiosClient.post(`/courses/${effectiveCourseId}/lessons`, { ...payload, order_index: order });
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

  const backTo = courseId ? `/instructor/courses/${courseId}` : '/instructor/lessons';

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-2xl pb-12">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline">
          <MdArrowBack /> Back {courseTitle ? `to ${courseTitle}` : 'to Lessons'}
        </Link>

        <h1 className="mt-3 mb-1 text-2xl font-bold text-slate-900">
          {isEdit ? 'Edit Lesson' : 'Create Lesson'}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {isEdit
            ? 'Update the lesson details below.'
            : 'Start with the lesson details and learning goal. After saving, add materials, videos, activities, or quizzes, then publish when the lesson is ready for students.'}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          {!courseId && !isEdit && courses.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Assigned Course <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={targetCourseId}
                onChange={(e) => {
                  setTargetCourseId(e.target.value);
                  const sel = courses.find(c => String(c.course_id) === String(e.target.value));
                  setCourseTitle(sel?.course_title || '');
                  setLessonBuilderType(sel?.lesson_builder_type || 'structured');
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none bg-white font-medium"
              >
                {courses.map(c => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title} ({c.grade_level_name}{c.grade ? ` • Grade ${c.grade}` : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lesson Title <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Introduction to Letters ሀ–ቀ"
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

          {lessonBuilderType === 'visual' ? (
            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wide text-indigo-700">Child preview · Visual & guided</p>
                {courseTitle && <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-600">{courseTitle}</span>}
              </div>
              <h2 className="mt-3 text-lg font-black text-slate-900">{form.title || 'Your lesson title'}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{form.description || 'Add a short introduction that helps students know what they will learn.'}</p>
              {form.learning_objectives && <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm font-semibold text-indigo-900">{form.learning_objectives}</p>}
              <p className="mt-3 text-xs text-slate-500">After saving, add pictures, audio, videos, practice activities, or a quiz from the lesson page.</p>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Structured lesson · {courseTitle || 'Assigned course'}</p>
              <p className="mt-1 text-sm text-slate-600">Set the learning goal and lesson sequence. Add prerequisites and teacher notes where they help.</p>
            </section>
          )}

          {lessonBuilderType === 'structured' && <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Prerequisites</label>
              <textarea rows={2} value={form.prerequisites} onChange={(e) => update('prerequisites', e.target.value)} placeholder="What should students know before starting? (optional)" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teacher Notes</label>
              <textarea rows={2} value={form.teacher_notes} onChange={(e) => update('teacher_notes', e.target.value)} placeholder="Private planning notes for the instructor (optional)" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none" />
            </div>
          </>}

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
