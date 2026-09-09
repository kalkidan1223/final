import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MdArrowBack, MdEdit, MdDelete, MdLink, MdPictureAsPdf,
  MdVideocam, MdQuiz, MdAssignment, MdPerson, MdUpload, MdAdd,
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl, fileSource, fileNameFromUrl } from '../../utils/fileUrl';
import MaterialModal from '../../components/instructor/MaterialModal';
import VideoModal from '../../components/instructor/VideoModal';
import ActivityBuilder from '../../components/instructor/ActivityBuilder';
import QuizBuilder from '../../components/instructor/QuizBuilder';

const STATUS_BADGE = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  archived: 'bg-amber-100 text-amber-700',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'materials', label: 'Materials' },
  { id: 'videos', label: 'Videos' },
  { id: 'activities', label: 'Activities' },
  { id: 'quizzes', label: 'Quizzes' },
];

function toEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function fmtS(n) {
  if (Number.isFinite(Number(n))) return Number(n) < 60 ? `${Math.round(n)} sec` : `${Math.round(n / 60)} min`;
  return '';
}

function TYPE_ICON(type) {
  if (type.includes('video')) return MdVideocam;
  if (type === 'image') return MdPictureAsPdf;
  return MdLink;
}

export default function InstructorLessonDetail() {
  const { id, lessonId } = useParams();
  const lessonParam = lessonId || id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState({ type: null, item: null });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosClient.get(`/lessons/${lessonParam}`);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the lesson');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonParam]);

  async function patchStatus(url, status) {
    setBusy(true);
    setError('');
    try {
      await axiosClient.patch(url, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update status');
    } finally {
      setBusy(false);
    }
  }

  async function remove(url, label, deactivateAction) {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setError('');
    try {
      await axiosClient.delete(url);
      await load();
    } catch (err) {
      if (err.response?.status === 409 && deactivateAction) {
        deactivateAction();
      } else {
        setError(err.response?.data?.error || `Could not delete the ${label}`);
      }
    }
  }

  function openModal(type, item = null) {
    setModal({ type, item });
  }

  if (loading || !data) {
    return (
      <InstructorLayout>
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-8 w-1/2 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </InstructorLayout>
    );
  }

  const { lesson, materials, videos, quizzes, activities, summary } = data;
  const courseDetailPath = `/instructor/courses/${lesson.course_id}`;

  const summaryCards = [
    { label: 'Materials', value: summary?.materials ?? materials.length, icon: MdPictureAsPdf, tab: 'materials' },
    { label: 'Videos', value: summary?.videos ?? videos.length, icon: MdVideocam, tab: 'videos' },
    { label: 'Activities', value: summary?.activities ?? activities.length, icon: MdAssignment, tab: 'activities' },
    { label: 'Quizzes', value: summary?.quizzes ?? quizzes.length, icon: MdQuiz, tab: 'quizzes' },
    {
      label: 'Completed',
      value: `${summary?.completed_students ?? 0} / ${summary?.total_students ?? 0}`,
      icon: MdPerson,
      tab: 'overview',
    },
  ];

  const actionBtnCls = 'rounded-lg px-2.5 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50';

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <Link to={courseDetailPath} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
            <MdArrowBack /> Back to {lesson.course_title}
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800">{lesson.title}</h1>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[lesson.status] || STATUS_BADGE.active}`}>
                  {lesson.status || 'active'}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {lesson.course_title && <span>{lesson.course_title}</span>}
                {lesson.grade && <span>Grade {lesson.grade}</span>}
                {lesson.section && <span>Section {lesson.section}</span>}
                {lesson.estimated_duration_minutes && <span>{lesson.estimated_duration_minutes} min</span>}
                {lesson.difficulty_level && <span className="capitalize">{lesson.difficulty_level}</span>}
              </div>
            </div>
            <Link
              to={`/instructor/lessons/${lesson.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <MdEdit /> Edit Lesson
            </Link>
          </div>
          {lesson.description && <p className="mt-3 text-sm text-slate-600">{lesson.description}</p>}
          {lesson.learning_objectives && (
            <div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Learning Objectives</h3>
              <p className="mt-1 text-sm text-slate-700">{lesson.learning_objectives}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summaryCards.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                onClick={() => setTab(c.tab)}
                className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-slate-400">
                  <Icon className="text-xl" />
                  <span className="text-xs font-medium uppercase tracking-wide">{c.label}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-800">{c.value}</div>
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/60'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <section className="space-y-4">
            {lesson.instructions && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Instructions</h3>
                <p className="mt-1 text-sm text-slate-700">{lesson.instructions}</p>
              </div>
            )}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Build this lesson</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button onClick={() => openModal('material')} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                  <MdUpload className="text-2xl" />
                  <span className="text-sm font-medium">Add material</span>
                </button>
                <button onClick={() => openModal('video')} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                  <MdVideocam className="text-2xl" />
                  <span className="text-sm font-medium">Add video</span>
                </button>
                <button onClick={() => openModal('activity')} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                  <MdAssignment className="text-2xl" />
                  <span className="text-sm font-medium">Create activity</span>
                </button>
                <button onClick={() => openModal('quiz')} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-slate-600 hover:border-indigo-400 hover:text-indigo-600">
                  <MdQuiz className="text-2xl" />
                  <span className="text-sm font-medium">Create quiz</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Materials */}
        {tab === 'materials' && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Learning Materials</h2>
              <button
                onClick={() => openModal('material')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <MdAdd /> Add material
              </button>
            </div>

            {materials.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-500">No learning materials yet.</p>
                <button onClick={() => openModal('material')} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  + Add your first material
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {materials.map((m, index) => {
                  const Icon = TYPE_ICON(m.type);
                  return (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon className="flex-shrink-0 text-lg text-slate-400" />
                        <div className="min-w-0">
                          <a href={resolveFileUrl(m.file_url)} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">
                            {m.title}
                          </a>
                          {fileSource(m.file_url) === 'upload' && (
                            <span className="block truncate text-xs text-slate-400">{fileNameFromUrl(m.file_url)}</span>
                          )}
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">{m.type}</span>
                            {fileSource(m.file_url) === 'upload' ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Uploaded file</span>
                            ) : (
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">External link</span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 ${STATUS_BADGE[m.status] || ''}`}>{m.status || 'active'}</span>
                            {m.description && <span className="max-w-xs truncate">{m.description}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => { const arr = [...materials]; const i = index; const j = i - 1; if (j < 0) return; [arr[i], arr[j]] = [arr[j], arr[i]]; setData({ ...data, materials: arr }); axiosClient.put(`/lessons/${lessonParam}/materials/reorder`, { ordered_material_ids: arr.map((x) => x.id) }).catch(() => load()); }} disabled={index === 0 || busy} className={`${actionBtnCls} text-lg`} aria-label="Move up">↑</button>
                        <button onClick={() => { const arr = [...materials]; const i = index; const j = i + 1; if (j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; setData({ ...data, materials: arr }); axiosClient.put(`/lessons/${lessonParam}/materials/reorder`, { ordered_material_ids: arr.map((x) => x.id) }).catch(() => load()); }} disabled={index === materials.length - 1 || busy} className={`${actionBtnCls} text-lg`} aria-label="Move down">↓</button>
                        <a href={resolveFileUrl(m.file_url)} target="_blank" rel="noreferrer" className={`${actionBtnCls} inline-flex items-center gap-1 text-slate-600`}><MdLink /> Preview</a>
                        <button onClick={() => openModal('material', m)} className={`${actionBtnCls} text-slate-600`}>Edit</button>
                        {m.status === 'inactive' ? (
                          <button onClick={() => patchStatus(`/materials/${m.id}/status`, 'active')} disabled={busy} className={`${actionBtnCls} text-emerald-600 hover:bg-emerald-50`}>Activate</button>
                        ) : (
                          <button onClick={() => patchStatus(`/materials/${m.id}/status`, m.status === 'archived' ? 'active' : 'inactive')} disabled={busy} className={`${actionBtnCls} text-slate-500`}>{m.status === 'archived' ? 'Restore' : 'Deactivate'}</button>
                        )}
                        <button onClick={() => remove(`/materials/${m.id}`, 'material', () => patchStatus(`/materials/${m.id}/status`, 'inactive'))} className={`${actionBtnCls} text-rose-600 hover:bg-rose-50`}><MdDelete /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Videos */}
        {tab === 'videos' && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Videos</h2>
              <button
                onClick={() => openModal('video')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <MdAdd /> Add video
              </button>
            </div>

            {videos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-500">No videos yet.</p>
                <button onClick={() => openModal('video')} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  + Add your first video
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {videos.map((v) => {
                  const embedUrl = toEmbedUrl(v.video_url);
                  return (
                    <li key={v.id} className="flex flex-wrap gap-3 rounded-xl border border-slate-200 p-3">
                      {embedUrl ? (
                        <iframe src={embedUrl} title={v.title} className="aspect-video w-full max-w-xs rounded-xl bg-slate-100" allowFullScreen />
                      ) : (
                        <video src={resolveFileUrl(v.video_url)} controls className="aspect-video w-full max-w-xs rounded-xl bg-slate-100" />
                      )}
                      <div className="min-w-[200px] flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-medium text-slate-800">{v.title}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[v.status] || ''}`}>{v.status || 'active'}</span>
                        </div>
                        {v.description && <p className="mt-1 text-xs text-slate-500">{v.description}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {v.source_type === 'upload' ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Uploaded</span>
                          ) : (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">YouTube / Vimeo</span>
                          )}
                          {v.duration_seconds && <span>{fmtS(v.duration_seconds)}</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-0.5">
                          <button onClick={() => openModal('video', v)} className={`${actionBtnCls} text-slate-600`}>Edit</button>
                          {v.status === 'inactive' ? (
                            <button onClick={() => patchStatus(`/videos/${v.id}/status`, 'active')} disabled={busy} className={`${actionBtnCls} text-emerald-600 hover:bg-emerald-50`}>Activate</button>
                          ) : (
                            <button onClick={() => patchStatus(`/videos/${v.id}/status`, v.status === 'archived' ? 'active' : 'inactive')} disabled={busy} className={`${actionBtnCls} text-slate-500`}>{v.status === 'archived' ? 'Restore' : 'Deactivate'}</button>
                          )}
                          <button onClick={() => remove(`/videos/${v.id}`, 'video', () => patchStatus(`/videos/${v.id}/status`, 'inactive'))} className={`${actionBtnCls} text-rose-600 hover:bg-rose-50`}><MdDelete /></button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Activities */}
        {tab === 'activities' && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Activities</h2>
              <button
                onClick={() => openModal('activity')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <MdAdd /> Create activity
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-500">No activities yet.</p>
                <button onClick={() => openModal('activity')} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  + Create your first activity
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {activities.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-800">{a.title}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">{a.activity_type.replace(/_/g, ' ')}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[a.status] || ''}`}>{a.status || 'active'}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {a.difficulty && <span className="capitalize">{a.difficulty}</span>}
                        {a.max_score && <span>{a.max_score} pts</span>}
                        {a.estimated_time_minutes && <span>{a.estimated_time_minutes} min</span>}
                        {a.due_date && <span>Due {a.due_date.slice(0, 10)}</span>}
                        {a.requires_upload && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Requires upload</span>}
                      </div>
                      {a.instructions && <p className="mt-1 line-clamp-1 text-xs text-slate-400">{a.instructions}</p>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Link to={`/instructor/activities/${a.id}/submissions`} className={`${actionBtnCls} text-indigo-600 hover:bg-indigo-50`}>View submissions</Link>
                      <button onClick={() => openModal('activity', a)} className={`${actionBtnCls} text-slate-600`}>Edit</button>
                      {a.status === 'inactive' ? (
                        <button onClick={() => patchStatus(`/activities/${a.id}/status`, 'active')} disabled={busy} className={`${actionBtnCls} text-emerald-600 hover:bg-emerald-50`}>Activate</button>
                      ) : (
                        <button onClick={() => patchStatus(`/activities/${a.id}/status`, a.status === 'archived' ? 'active' : 'inactive')} disabled={busy} className={`${actionBtnCls} text-slate-500`}>{a.status === 'archived' ? 'Restore' : 'Deactivate'}</button>
                      )}
                      <button onClick={() => remove(`/activities/${a.id}`, 'activity', () => patchStatus(`/activities/${a.id}/status`, 'inactive'))} className={`${actionBtnCls} text-rose-600 hover:bg-rose-50`}><MdDelete /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Quizzes */}
        {tab === 'quizzes' && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Quizzes</h2>
              <button
                onClick={() => openModal('quiz')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <MdAdd /> Create quiz
              </button>
            </div>

            {quizzes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-500">No quizzes yet.</p>
                <button onClick={() => openModal('quiz')} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  + Create your first quiz
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {quizzes.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <MdQuiz className="text-slate-400" />
                        <span className="font-medium text-slate-800">{q.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[q.status] || ''}`}>{q.status || 'active'}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {q.time_limit_seconds && <span>⏱ {fmtS(q.time_limit_seconds)}</span>}
                        {q.passing_score && <span>Pass: {q.passing_score}</span>}
                        {q.max_score && <span>Max: {q.max_score}</span>}
                        {q.attempt_limit && <span>{q.attempt_limit} attempt(s)</span>}
                        {q.shuffle_questions && <span>Shuffled</span>}
                      </div>
                      {q.description && <p className="mt-1 line-clamp-1 text-xs text-slate-400">{q.description}</p>}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Link to={`/instructor/quizzes/${q.id}`} className={`${actionBtnCls} text-indigo-600 hover:bg-indigo-50`}>Manage questions</Link>
                      <button onClick={() => openModal('quiz', q)} className={`${actionBtnCls} text-slate-600`}>Edit</button>
                      {q.status === 'inactive' ? (
                        <button onClick={() => patchStatus(`/quizzes/${q.id}/status`, 'active')} disabled={busy} className={`${actionBtnCls} text-emerald-600 hover:bg-emerald-50`}>Activate</button>
                      ) : (
                        <button onClick={() => patchStatus(`/quizzes/${q.id}/status`, q.status === 'archived' ? 'active' : 'inactive')} disabled={busy} className={`${actionBtnCls} text-slate-500`}>{q.status === 'archived' ? 'Restore' : 'Deactivate'}</button>
                      )}
                      <button onClick={() => remove(`/quizzes/${q.id}`, 'quiz', () => patchStatus(`/quizzes/${q.id}/status`, 'inactive'))} className={`${actionBtnCls} text-rose-600 hover:bg-rose-50`}><MdDelete /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="text-right">
          <Link to={`${courseDetailPath}/lessons/${lesson.id}`} className="text-sm text-slate-400 hover:text-slate-600">
            Permanent link to this lesson →
          </Link>
        </div>
      </div>

      {/* Modals */}
      <MaterialModal
        open={modal.type === 'material'}
        onClose={() => setModal({ type: null, item: null })}
        lessonId={lessonParam}
        material={modal.item}
        onSaved={load}
      />
      <VideoModal
        open={modal.type === 'video'}
        onClose={() => setModal({ type: null, item: null })}
        lessonId={lessonParam}
        video={modal.item}
        onSaved={load}
      />
      <ActivityBuilder
        open={modal.type === 'activity'}
        onClose={() => setModal({ type: null, item: null })}
        lessonId={lessonParam}
        activity={modal.item}
        onSaved={load}
      />
      <QuizBuilder
        open={modal.type === 'quiz'}
        onClose={() => setModal({ type: null, item: null })}
        lessonId={lessonParam}
        quiz={modal.item}
        onSaved={load}
      />
    </InstructorLayout>
  );
}