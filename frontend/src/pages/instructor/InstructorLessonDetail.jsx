import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MdArrowBack, MdEdit, MdDelete, MdPlayArrow, MdPause,
  MdLink, MdDescription, MdUpload,
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl, fileSource, typeFromFileName, fileNameFromUrl } from '../../utils/fileUrl';

const ACTIVITY_TYPES = [
  'writing', 'reading', 'drawing', 'speaking', 'worksheet',
  'matching', 'coloring', 'counting', 'fill_in_the_blank',
  'drag_and_drop', 'multiple_choice', 'true_false', 'puzzle',
  'story_reading', 'pronunciation', 'vocabulary_practice',
  'letter_tracing', 'number_tracing',
];

const MATERIAL_TYPES = ['pdf', 'document', 'presentation', 'image', 'audio', 'video'];

const STATUS_BADGE = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  archived: 'bg-amber-100 text-amber-700',
};

function toEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

const EMPTY_MATERIAL = { title: '', description: '', type: 'pdf', file_url: '' };
const EMPTY_VIDEO = { title: '', description: '', video_url: '' };

export default function InstructorLessonDetail() {
  const { id, lessonId } = useParams();
  const lessonParam = lessonId || id;

  const [data, setData] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO);
  const [quizForm, setQuizForm] = useState({ title: '', description: '' });
  const [activityForm, setActivityForm] = useState({
    title: '', activity_type: 'worksheet', instructions: '', age_group_id: '', requires_upload: false,
  });

  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');

  const [materialSource, setMaterialSource] = useState('link');
  const [materialFile, setMaterialFile] = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);

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
    axiosClient.get('/age-groups').then(({ data }) => setAgeGroups(data.age_groups));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonParam]);

  if (loading || !data) {
    return (
      <InstructorLayout>
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-8 w-1/2 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </InstructorLayout>
    );
  }

  const { lesson, materials, videos, quizzes, activities } = data;
  const courseDetailPath = `/instructor/courses/${lesson.course_id}`;
  const courseLessonPath = `${courseDetailPath}/lessons/${lesson.id}`;

  // ---- Materials ----
  async function handleAddMaterial(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post(`/lessons/${lessonParam}/materials`, materialForm);
      setMaterialForm(EMPTY_MATERIAL);
      setMaterialFile(null);
      setMaterialSource('link');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add learning material');
    }
  }

  async function handleUpdateMaterial(e) {
    e.preventDefault();
    if (!editingMaterial) return;
    try {
      await axiosClient.patch(`/materials/${editingMaterial.id}`, editingMaterial);
      setEditingMaterial(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the material');
    }
  }

  async function handleMaterialFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMaterialFile(file);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    setFileUploading(true);
    setFileProgress(0);
    try {
      const { data } = await axiosClient.post('/uploads/file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setFileProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });
      setMaterialForm((f) => ({ ...f, file_url: data.url, type: typeFromFileName(file.name) }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload the file');
      setMaterialFile(null);
    } finally {
      setFileUploading(false);
    }
  }

  async function handleReplaceMaterialFile(e) {
    const file = e.target.files?.[0];
    if (!file || !editingMaterial) return;
    const fd = new FormData();
    fd.append('file', file);
    setBusy(true);
    setError('');
    try {
      const { data } = await axiosClient.post('/uploads/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditingMaterial((m) => ({ ...m, file_url: data.url, type: typeFromFileName(file.name) }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload the file');
    } finally {
      setBusy(false);
    }
  }

  async function setMaterialStatus(material, status) {
    setBusy(true);
    try {
      await axiosClient.patch(`/materials/${material.id}/status`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the material status');
    } finally {
      setBusy(false);
    }
  }

  async function deleteMaterial(material) {
    if (!window.confirm('Delete this learning material? This cannot be undone.')) return;
    try {
      await axiosClient.delete(`/materials/${material.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the material');
    }
  }

  async function moveMaterial(index, direction) {
    const newOrder = [...materials];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    [newOrder[index], newOrder[swapWith]] = [newOrder[swapWith], newOrder[index]];
    setData((d) => (d ? { ...d, materials: newOrder } : d));
    try {
      const { data } = await axiosClient.put(`/lessons/${lessonParam}/materials/reorder`, {
        ordered_material_ids: newOrder.map((m) => m.id),
      });
      setData((d) => (d ? { ...d, materials: data.materials } : d));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reorder materials');
      await load();
    }
  }

  // ---- Videos ----
  async function handleAddVideo(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post(`/lessons/${lessonParam}/videos`, videoForm);
      setVideoForm(EMPTY_VIDEO);
      setVideoPreviewUrl('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add video. Use a valid YouTube or direct video URL.');
    }
  }

  async function handleUpdateVideo(e) {
    e.preventDefault();
    if (!editingVideo) return;
    try {
      await axiosClient.patch(`/videos/${editingVideo.id}`, editingVideo);
      setEditingVideo(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the video');
    }
  }

  async function setVideoStatus(video, status) {
    setBusy(true);
    try {
      await axiosClient.patch(`/videos/${video.id}/status`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the video status');
    } finally {
      setBusy(false);
    }
  }

  async function deleteVideo(video) {
    if (!window.confirm('Delete this video? This cannot be undone.')) return;
    try {
      await axiosClient.delete(`/videos/${video.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete the video');
    }
  }

  // ---- Quizzes & Activities ----
  async function handleAddQuiz(e) {
    e.preventDefault();
    setError('');
    try {
      await axiosClient.post(`/lessons/${lessonParam}/quizzes`, quizForm);
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
      await axiosClient.post(`/lessons/${lessonParam}/activities`, activityForm);
      setActivityForm({ title: '', activity_type: 'worksheet', instructions: '', age_group_id: '', requires_upload: false });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add activity');
    }
  }

  function updateVideoForm(field, value) {
    setVideoForm((f) => ({ ...f, [field]: value }));
    if (field === 'video_url') setVideoPreviewUrl(value);
  }

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <Link to={courseDetailPath} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
            <MdArrowBack /> Back to {lesson.course_title}
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                {lesson.title}
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[lesson.status] || STATUS_BADGE.active}`}>
                  {lesson.status}
                </span>
              </h1>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {lesson.grade && <span>Grade {lesson.grade}</span>}
                {lesson.section && <span>Section {lesson.section}</span>}
                {lesson.estimated_duration_minutes && <span>{lesson.estimated_duration_minutes} min</span>}
                {lesson.difficulty_level && (
                  <span className="capitalize">{lesson.difficulty_level}</span>
                )}
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
          {lesson.instructions && (
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Instructions</h3>
              <p className="mt-1 text-sm text-slate-700">{lesson.instructions}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
        )}

        {/* ---- Learning Materials ---- */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Learning Materials</h2>

          {materials.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No learning materials have been added.</p>
          ) : (
            <ul className="mb-5 space-y-2">
              {materials.map((material, index) => (
                <li key={material.id} className="rounded-xl border border-slate-200 p-3">
                  {editingMaterial?.id === material.id ? (
                    <form onSubmit={handleUpdateMaterial} className="space-y-2 rounded-xl bg-slate-100 p-3">
                      <div className="grid gap-2 md:grid-cols-[1fr_1fr_160px]">
                        <input
                          required
                          value={editingMaterial.title}
                          onChange={(e) => setEditingMaterial({ ...editingMaterial, title: e.target.value })}
                          placeholder="Material title"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <input
                          value={editingMaterial.description || ''}
                          onChange={(e) => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                          placeholder="Description"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <select
                          value={editingMaterial.type}
                          onChange={(e) => setEditingMaterial({ ...editingMaterial, type: e.target.value })}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        >
                          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          required
                          type="url"
                          value={editingMaterial.file_url || ''}
                          onChange={(e) => setEditingMaterial({ ...editingMaterial, file_url: e.target.value })}
                          placeholder="File URL or paste an internet link"
                          className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50">
                          <MdUpload /> {busy ? 'Uploading…' : 'Upload new file'}
                          <input type="file" className="hidden" onChange={handleReplaceMaterialFile} disabled={busy} />
                        </label>
                        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <MdDescription className="flex-shrink-0 text-lg text-slate-400" />
                        <div className="min-w-0">
                          <a href={resolveFileUrl(material.file_url)} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">
                            {material.title}
                          </a>
                          {fileSource(material.file_url) === 'upload' && (
                            <span className="block text-xs text-slate-400 truncate max-w-xs">{fileNameFromUrl(material.file_url)}</span>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">{material.type}</span>
                            {fileSource(material.file_url) === 'upload' ? (
                              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">Uploaded file</span>
                            ) : (
                              <span className="rounded-full bg-sky-50 text-sky-700 px-2 py-0.5">External link</span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 ${STATUS_BADGE[material.status] || ''}`}>{material.status}</span>
                            {material.description && <span className="truncate max-w-xs">{material.description}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveMaterial(index, -1)}
                          disabled={index === 0 || busy}
                          className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          aria-label="Move material up"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveMaterial(index, 1)}
                          disabled={index === materials.length - 1 || busy}
                          className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          aria-label="Move material down"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <a
                          href={resolveFileUrl(material.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                        >
                          <MdLink /> Preview
                        </a>
                        <button
                          onClick={() => setEditingMaterial(material)}
                          className="rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        {material.status === 'inactive' ? (
                          <button
                            onClick={() => setMaterialStatus(material, 'active')}
                            disabled={busy}
                            className="rounded-lg px-2.5 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            onClick={() => setMaterialStatus(material, 'inactive')}
                            disabled={busy}
                            className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => deleteMaterial(material)}
                          className="rounded-lg px-2.5 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddMaterial} className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_170px]">
              <input required placeholder="Material title" value={materialForm.title} onChange={(e) => setMaterialForm((f) => ({ ...f, title: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input placeholder="Description" value={materialForm.description} onChange={(e) => setMaterialForm((f) => ({ ...f, description: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <select value={materialForm.type} onChange={(e) => setMaterialForm((f) => ({ ...f, type: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {MATERIAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            {/* Source toggle */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setMaterialSource('upload'); setMaterialFile(null); }}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${materialSource === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <MdUpload className="text-lg" /> Upload file
              </button>
              <button
                type="button"
                onClick={() => { setMaterialSource('link'); setMaterialFile(null); }}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${materialSource === 'link' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <MdLink className="text-lg" /> Link from internet
              </button>
            </div>

            {materialSource === 'upload' ? (
              <div>
                <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-white px-4 py-3 text-sm text-slate-600 transition ${fileUploading ? 'border-slate-300 opacity-60' : 'border-slate-300 hover:border-indigo-400 hover:text-indigo-600'}`}>
                  <MdUpload className="text-lg" />
                  {fileUploading
                    ? `Uploading… ${fileProgress}%`
                    : materialForm.file_url
                      ? `File ready: ${fileNameFromUrl(materialForm.file_url)} — click to choose another`
                      : 'Choose a file (PDF, PowerPoint, Word, Excel, images, audio, video…) — max 100 MB'}
                  <input type="file" className="hidden" onChange={handleMaterialFileSelect} disabled={fileUploading} />
                </label>
                {fileUploading && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${fileProgress}%` }} />
                  </div>
                )}
              </div>
            ) : (
              <input
                required
                type="url"
                placeholder="Paste a public link — Google Drive, Dropbox, OneDrive, any website…"
                value={materialForm.file_url}
                onChange={(e) => setMaterialForm((f) => ({ ...f, file_url: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Upload a file from your computer, or paste a link to a document hosted anywhere on the internet.
              </p>
              <button
                disabled={!materialForm.title || !materialForm.file_url || fileUploading}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Material
              </button>
            </div>
          </form>
        </section>

        {/* ---- Videos ---- */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Videos</h2>

          {videos.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No videos have been added.</p>
          ) : (
            <ul className="mb-5 space-y-2">
              {videos.map((video) => {
                const embedUrl = toEmbedUrl(video.video_url);
                return (
                  <li key={video.id} className="rounded-xl border border-slate-200 p-3">
                    {editingVideo?.id === video.id ? (
                      <form onSubmit={handleUpdateVideo} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                        <input
                          required
                          value={editingVideo.title}
                          onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                          placeholder="Title"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <input
                          required
                          type="url"
                          value={editingVideo.video_url}
                          onChange={(e) => setEditingVideo({ ...editingVideo, video_url: e.target.value })}
                          placeholder="YouTube / Vimeo / video URL"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save</button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {embedUrl ? (
                          <iframe src={embedUrl} title={video.title} className="aspect-video w-full max-w-xs rounded-xl bg-slate-100" allowFullScreen />
                        ) : (
                          <div className="flex h-24 w-full max-w-xs items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
                            <MdPlayArrow className="text-2xl" /> Video preview
                          </div>
                        )}
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="font-medium text-slate-800">{video.title}</h4>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[video.status] || ''}`}>{video.status}</span>
                          </div>
                          {video.description && <p className="mt-1 text-xs text-slate-500">{video.description}</p>}
                          <a href={video.video_url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-xs text-indigo-600 hover:underline">{video.video_url}</a>
                          <div className="mt-2 flex items-center gap-1">
                            <button onClick={() => setEditingVideo(video)} className="rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Edit</button>
                            {video.status === 'inactive' ? (
                              <button onClick={() => setVideoStatus(video, 'active')} disabled={busy} className="rounded-lg px-2.5 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">Activate</button>
                            ) : (
                              <button onClick={() => setVideoStatus(video, 'inactive')} disabled={busy} className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50">Deactivate</button>
                            )}
                            <button onClick={() => deleteVideo(video)} className="rounded-lg px-2.5 py-1.5 text-sm text-rose-600 hover:bg-rose-50">Delete</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleAddVideo} className="space-y-2 rounded-2xl bg-slate-50 p-4">
            <div className="grid gap-2 md:grid-cols-[1fr_2fr]">
              <input required placeholder="Video title" value={videoForm.title} onChange={(e) => updateVideoForm('title', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input required type="url" placeholder="YouTube / Vimeo / direct video URL" value={videoForm.video_url} onChange={(e) => updateVideoForm('video_url', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Description (optional)" rows={2} value={videoForm.description} onChange={(e) => updateVideoForm('description', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            {videoPreviewUrl && (
              <div className="flex gap-3 items-center">
                {toEmbedUrl(videoPreviewUrl) ? (
                  <iframe src={toEmbedUrl(videoPreviewUrl)} title="Video preview" className="aspect-video w-full max-w-xs rounded-xl bg-slate-100" allowFullScreen />
                ) : (
                  <p className="text-xs text-slate-500">Preview will appear once the URL is a valid YouTube or Vimeo link.</p>
                )}
              </div>
            )}
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Add Video</button>
          </form>
        </section>

        {/* ---- Quizzes ---- */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Quizzes</h2>

          {quizzes.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No quizzes have been created.</p>
          ) : (
            <ul className="mb-5 space-y-2">
              {quizzes.map((q) => (
                <li key={q.id}>
                  <Link to={`/instructor/quizzes/${q.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm hover:shadow-md">
                    <div>
                      <span className="font-medium text-slate-700">{q.title}</span>
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[q.status] || ''}`}>{q.status || 'active'}</span>
                      {q.instructions && <span className="block mt-0.5 text-xs text-slate-500">{q.instructions}</span>}
                    </div>
                    <span className="text-indigo-600">Manage questions →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddQuiz} className="space-y-2 rounded-2xl bg-slate-50 p-4">
            <input required placeholder="Quiz title" value={quizForm.title} onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder="Description (optional)" value={quizForm.description} onChange={(e) => setQuizForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Add Quiz</button>
          </form>
        </section>

        {/* ---- Activities ---- */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Activities</h2>

          {activities.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No activities have been created.</p>
          ) : (
            <ul className="mb-5 space-y-2">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link to={`/instructor/activities/${a.id}/submissions`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm hover:shadow-md">
                    <div className="flex items-center gap-2">
                      <MdDescription className="text-slate-400" />
                      <span className="font-medium text-slate-700">{a.title}</span>
                      <span className="text-xs text-slate-400">({a.activity_type.replace(/_/g, ' ')})</span>
                    </div>
                    <span className="text-indigo-600">Review submissions →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddActivity} className="space-y-2 rounded-2xl bg-slate-50 p-4">
            <input required placeholder="Activity title" value={activityForm.title} onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <select value={activityForm.activity_type} onChange={(e) => setActivityForm((f) => ({ ...f, activity_type: e.target.value }))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
              <select required value={activityForm.age_group_id} onChange={(e) => setActivityForm((f) => ({ ...f, age_group_id: e.target.value }))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Age group</option>
                {ageGroups.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
              </select>
            </div>
            <textarea required placeholder="Instructions" rows={2} value={activityForm.instructions} onChange={(e) => setActivityForm((f) => ({ ...f, instructions: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={activityForm.requires_upload} onChange={(e) => setActivityForm((f) => ({ ...f, requires_upload: e.target.checked }))} />
              Requires a file/photo upload
            </label>
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Add Activity</button>
          </form>
        </section>

        <div className="text-right">
          <Link to={courseLessonPath} className="text-sm text-slate-400 hover:text-slate-600">Permanent link to this lesson →</Link>
        </div>
      </div>
    </InstructorLayout>
  );
}