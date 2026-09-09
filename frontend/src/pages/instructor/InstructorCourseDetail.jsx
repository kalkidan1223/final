import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack, MdMenuBook, MdAdd, MdVisibility, MdEdit, MdDelete, MdPlayArrow, MdPause } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const COURSE_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

const LESSON_STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  archived: 'bg-amber-100 text-amber-700',
};

export default function InstructorCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosClient.get(`/instructor/courses/${id}`);
      setCourse(data.course);
      setLessons(data.lessons || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the course');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(lessonId, status) {
    setBusy(true);
    try {
      await axiosClient.patch(`/lessons/${lessonId}/status`, { status });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update the lesson status');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await axiosClient.delete(`/lessons/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response?.data?.error || 'This lesson cannot be deleted yet. Deactivate it instead.');
      } else {
        alert(err.response?.data?.error || 'Could not delete the lesson');
      }
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function moveLesson(index, direction) {
    const newOrder = [...lessons];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    [newOrder[index], newOrder[swapWith]] = [newOrder[swapWith], newOrder[index]];
    setLessons(newOrder);
    try {
      const { data } = await axiosClient.put(`/courses/${id}/lessons/reorder`, {
        ordered_lesson_ids: newOrder.map((l) => l.id),
      });
      setLessons(data.lessons || newOrder);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not reorder lessons');
      await load();
    }
  }

  if (loading) {
    return (
      <InstructorLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-1/2 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </InstructorLayout>
    );
  }

  if (error && !course) {
    return (
      <InstructorLayout>
        <div className="mx-auto max-w-2xl mt-10 rounded-xl bg-rose-50 border border-rose-200 p-6 text-sm text-rose-700">
          {error}
          <div className="mt-4">
            <Link to="/instructor/courses" className="text-indigo-600 hover:underline">Back to Courses</Link>
          </div>
        </div>
      </InstructorLayout>
    );
  }

  const stats = [
    { label: 'Age Group', value: course.age_group_name },
    { label: 'Grade / Class', value: course.grade || '—' },
    { label: 'Section', value: course.section || '—' },
    { label: 'Academic Year', value: course.academic_year || '—' },
    { label: 'Students', value: course.student_count },
    { label: 'Lessons', value: lessons.length },
  ];

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/instructor/courses" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
          <MdArrowBack /> Back to Courses
        </Link>

        {/* Course header */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {course.description && (
                <p className="mt-1 text-sm text-indigo-100 line-clamp-2">{course.description}</p>
              )}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${COURSE_STATUS_STYLES[course.course_status] || COURSE_STATUS_STYLES.draft}`}>
              {course.course_status || course.status}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-indigo-200">{s.label}</div>
                <div className="mt-0.5 text-sm font-semibold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lessons toolbar */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <MdMenuBook className="text-indigo-500" /> Lessons
          </h2>
          <button
            onClick={() => navigate(`/instructor/courses/${id}/lessons/create`)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <MdAdd /> CREATE LESSON
          </button>
        </div>

        {/* Lessons list */}
        {lessons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <MdMenuBook className="text-5xl text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700">No Lessons Yet</h3>
            <p className="mt-1 text-sm text-slate-500">No lessons have been created for this course yet.</p>
            <button
              onClick={() => navigate(`/instructor/courses/${id}/lessons/create`)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <MdAdd /> CREATE LESSON
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {lessons.map((lesson, index) => (
              <li
                key={lesson.id}
                className={`rounded-2xl bg-white p-4 shadow-sm border ${
                  lesson.status === 'inactive' ? 'border-slate-200 opacity-70' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                      {lesson.order_index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/instructor/courses/${id}/lessons/${lesson.id}`}
                        className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline"
                      >
                        {lesson.title || `Lesson ${lesson.order_index + 1}`}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${LESSON_STATUS_STYLES[lesson.status] || LESSON_STATUS_STYLES.active}`}>
                          {lesson.status}
                        </span>
                        <span>{lesson.material_count} material{lesson.material_count === 1 ? '' : 's'}</span>
                        <span>·</span>
                        <span>{lesson.video_count} video{lesson.video_count === 1 ? '' : 's'}</span>
                        <span>·</span>
                        <span>{lesson.quiz_count} quiz{lesson.quiz_count === 1 ? '' : 'zes'}</span>
                        <span>·</span>
                        <span>{lesson.activity_count} activit{lesson.activity_count === 1 ? 'y' : 'ies'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveLesson(index, -1)}
                      disabled={index === 0 || busy}
                      className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Move lesson up"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLesson(index, 1)}
                      disabled={index === lessons.length - 1 || busy}
                      className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Move lesson down"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <Link
                      to={`/instructor/courses/${id}/lessons/${lesson.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                      title="View lesson"
                    >
                      <MdVisibility /> View
                    </Link>
                    <Link
                      to={`/instructor/lessons/${lesson.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                      title="Edit lesson"
                    >
                      <MdEdit /> Edit
                    </Link>
                    {lesson.status === 'inactive' ? (
                      <button
                        onClick={() => changeStatus(lesson.id, 'active')}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                        title="Activate lesson"
                      >
                        <MdPlayArrow /> Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => changeStatus(lesson.id, 'inactive')}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        title="Deactivate lesson"
                      >
                        <MdPause /> Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(lesson)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      title="Delete lesson"
                    >
                      <MdDelete /> Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">Delete Lesson?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete <strong>{deleteTarget.title || 'this lesson'}</strong>? This cannot be
              undone. If learners have already made progress or submitted work for this lesson, you will be asked to
              deactivate it instead.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </InstructorLayout>
  );
}