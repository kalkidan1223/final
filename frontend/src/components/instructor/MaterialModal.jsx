import { useEffect, useState } from 'react';
import { MdUpload, MdLink } from 'react-icons/md';
import Modal from '../Modal';
import axiosClient from '../../api/axiosClient';
import { fileNameFromUrl, typeFromFileName } from '../../utils/fileUrl';

const MATERIAL_TYPES = ['pdf', 'document', 'presentation', 'image', 'audio', 'video', 'other'];

export default function MaterialModal({ open, onClose, lessonId, material, onSaved }) {
  const isEdit = Boolean(material);

  const [form, setForm] = useState({ title: '', description: '', type: 'pdf', file_url: '', thumbnail_url: '' });
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
    if (material) {
      setForm({
        title: material.title || '',
        description: material.description || '',
        type: material.type || 'pdf',
        file_url: material.file_url || '',
        thumbnail_url: material.thumbnail_url || '',
      });
      setSource(material.file_url?.startsWith('/uploads/') ? 'upload' : 'link');
    } else {
      setForm({ title: '', description: '', type: 'pdf', file_url: '', thumbnail_url: '' });
      setSource('link');
    }
    setFile(null);
  }, [open, material]);

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
      setForm((f) => ({ ...f, file_url: data.url, type: typeFromFileName(selected.name) }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload the file');
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
        type: form.type,
        file_url: form.file_url,
        thumbnail_url: form.thumbnail_url || null,
      };
      if (isEdit) {
        await axiosClient.patch(`/materials/${material.id}`, payload);
      } else {
        await axiosClient.post(`/lessons/${lessonId}/materials`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the material');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit material' : 'Add material'}
      subtitle={isEdit ? 'Update the file, title or description.' : 'Attach files or links for this lesson.'}
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
              placeholder="e.g. Alphabet tracing worksheet"
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this material for?"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
              {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Thumbnail URL (optional)</label>
            <input
              placeholder="https://… or /uploads/…"
              value={form.thumbnail_url}
              onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setSource('upload'); setFile(null); }}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${source === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <MdUpload className="text-lg" /> Upload file
          </button>
          <button
            type="button"
            onClick={() => { setSource('link'); setFile(null); }}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${source === 'link' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            <MdLink className="text-lg" /> Link from internet
          </button>
        </div>

        {source === 'upload' ? (
          <div>
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-slate-50 px-4 py-3 text-sm text-slate-600 transition ${uploading ? 'border-slate-300 opacity-60' : 'border-slate-300 hover:border-indigo-400 hover:text-indigo-600'}`}>
              <MdUpload className="text-lg" />
              {uploading
                ? `Uploading… ${progress}%`
                : form.file_url?.startsWith('/uploads/')
                  ? `File ready: ${fileNameFromUrl(form.file_url)} — click to choose another`
                  : 'Choose a file (PDF, PowerPoint, Word, images, audio, video…) — max 100 MB'}
              <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            </label>
            {uploading && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">File URL *</label>
            <input
              required
              type="url"
              placeholder="Paste a public link — Google Drive, Dropbox, OneDrive, any website…"
              value={form.file_url}
              onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
              className={inputCls}
            />
          </div>
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
            disabled={uploading || busy || !form.title || !form.file_url}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isEdit ? 'Save changes' : 'Add material'}
          </button>
        </div>
      </form>
    </Modal>
  );
}