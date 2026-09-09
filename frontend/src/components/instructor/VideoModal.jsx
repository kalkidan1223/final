import { useEffect, useState } from 'react';
import { MdUpload, MdPlayCircle } from 'react-icons/md';
import Modal from '../Modal';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl, fileNameFromUrl } from '../../utils/fileUrl';

function toEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function VideoModal({ open, onClose, lessonId, video, onSaved }) {
  const isEdit = Boolean(video);

  const [form, setForm] = useState({
    title: '', description: '', video_url: '', thumbnail_url: '', duration_seconds: '',
  });
  const [source, setSource] = useState('link');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusy(false);
    setUploading(false);
    setProgress(0);
    if (video) {
      setForm({
        title: video.title || '',
        description: video.description || '',
        video_url: video.video_url || '',
        thumbnail_url: video.thumbnail_url || '',
        duration_seconds: video.duration_seconds || '',
      });
      setSource(video.source_type === 'upload' || video.video_url?.startsWith('/uploads/') ? 'upload' : 'link');
    } else {
      setForm({ title: '', description: '', video_url: '', thumbnail_url: '', duration_seconds: '' });
      setSource('link');
    }
    setFile(null);
  }, [open, video]);

  async function handleFileSelect(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    const fd = new FormData();
    fd.append('file', selected);
    setUploading(true);
    setProgress(0);
    try {
      const { data } = await axiosClient.post('/uploads/file', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });
      setForm((f) => ({ ...f, video_url: data.url }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload the video file');
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url || null,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
        source_type: source === 'upload' ? 'upload' : 'youtube',
      };
      if (isEdit) {
        await axiosClient.patch(`/videos/${video.id}`, payload);
      } else {
        await axiosClient.post(`/lessons/${lessonId}/videos`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the video');
    } finally {
      setBusy(false);
    }
  }

  const isUpload = source === 'upload';
  const embedUrl = isUpload ? null : toEmbedUrl(form.video_url);
  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit video' : 'Add video'}
      subtitle="Link a YouTube/Vimeo video or upload a video file from your computer."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. The letter A — phonics song"
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description for students"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSource('link')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${source === 'link' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <MdPlayCircle className="text-lg" /> YouTube / Vimeo link
          </button>
          <button
            type="button"
            onClick={() => setSource('upload')}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${source === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <MdUpload className="text-lg" /> Upload file
          </button>
        </div>

        {isUpload ? (
          <div>
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-slate-50 px-4 py-3 text-sm text-slate-600 transition ${uploading ? 'border-slate-300 opacity-60' : 'border-slate-300 hover:border-indigo-400 hover:text-indigo-600'}`}>
              <MdUpload className="text-lg" />
              {uploading
                ? `Uploading… ${progress}%`
                : form.video_url?.startsWith('/uploads/')
                  ? `Video ready: ${fileNameFromUrl(form.video_url)} — click to choose another`
                  : 'Choose a video file (mp4, webm, mov…) — max 100 MB'}
              <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} accept="video/*" />
            </label>
            {uploading && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            {form.video_url?.startsWith('/uploads/') && (
              <video src={resolveFileUrl(form.video_url)} controls className="mt-3 aspect-video w-full max-w-sm rounded-xl bg-slate-100" />
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Video URL *</label>
              <input
                required
                type="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={form.video_url}
                onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Thumbnail URL (optional)</label>
              <input
                placeholder="https://…"
                value={form.thumbnail_url}
                onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Duration (seconds, optional)</label>
              <input
                type="number"
                min="1"
                value={form.duration_seconds}
                onChange={(e) => setForm((f) => ({ ...f, duration_seconds: e.target.value }))}
                placeholder="e.g. 180"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {!isUpload && embedUrl && (
          <iframe
            src={embedUrl}
            title="Video preview"
            className="aspect-video w-full max-w-md rounded-xl bg-slate-100"
            allowFullScreen
          />
        )}
        {!isUpload && form.video_url && !embedUrl && (
          <p className="text-xs text-slate-500">Preview will appear once the URL is a valid YouTube or Vimeo link.</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            disabled={uploading || busy || !form.title || !form.video_url}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isEdit ? 'Save changes' : 'Add video'}
          </button>
        </div>
      </form>
    </Modal>
  );
}