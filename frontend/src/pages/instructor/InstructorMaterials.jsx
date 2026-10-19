import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdLibraryBooks, MdAdd, MdSearch, MdFilterList,
  MdAudiotrack, MdPictureAsPdf, MdImage, MdVideocam,
  MdLink, MdDelete, MdDownload, MdVisibility, MdClose,
  MdUpload, MdCheckCircle
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const TYPE_ICONS = {
  audio: MdAudiotrack,
  pdf: MdPictureAsPdf,
  document: MdPictureAsPdf,
  image: MdImage,
  video: MdVideocam,
  link: MdLink,
};

const TYPE_COLORS = {
  audio: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pdf: 'bg-rose-50 text-rose-700 border-rose-200',
  document: 'bg-blue-50 text-blue-700 border-blue-200',
  image: 'bg-purple-50 text-purple-700 border-purple-200',
  video: 'bg-sky-50 text-sky-700 border-sky-200',
  link: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function InstructorMaterials() {
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Upload modal state
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    course_id: '',
    lesson_id: '',
    title: '',
    description: '',
    material_type: 'audio',
    file_url: '',
    content: '',
    is_downloadable: true,
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [courseFilter, typeFilter]);

  useEffect(() => {
    if (modalForm.course_id) {
      axiosClient
        .get(`/instructor/lessons?course_id=${modalForm.course_id}`)
        .then(({ data }) => setLessons(data.lessons || []))
        .catch(() => setLessons([]));
    } else {
      setLessons([]);
    }
  }, [modalForm.course_id]);

  async function loadCourses() {
    try {
      const { data } = await axiosClient.get('/instructor/courses');
      setCourses(data.courses || []);
      if (data.courses?.length > 0 && !modalForm.course_id) {
        setModalForm((f) => ({ ...f, course_id: data.courses[0].course_id }));
      }
    } catch {
      // ignore
    }
  }

  async function loadMaterials() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (courseFilter) params.course_id = courseFilter;
      if (typeFilter) params.material_type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const { data } = await axiosClient.get('/instructor/materials', { params });
      setMaterials(data.materials || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadMaterials();
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this educational material?')) return;
    try {
      await axiosClient.delete(`/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete material');
    }
  }

  async function handleModalSubmit(e) {
    e.preventDefault();
    setModalError('');
    if (!modalForm.lesson_id) {
      setModalError('Please select a lesson for this material');
      return;
    }
    if (!modalForm.title.trim()) {
      setModalError('Material title is required');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = modalForm.file_url;

      // Handle file upload if present
      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const { data: uploadRes } = await axiosClient.post('/uploads/file', formData);
        fileUrl = uploadRes.url;
      }

      await axiosClient.post(`/lessons/${modalForm.lesson_id}/materials`, {
        title: modalForm.title.trim(),
        description: modalForm.description.trim() || null,
        // The API reads `type` (the material_type enum); a generic external
        // "link" is stored as an "other" material.
        type: modalForm.material_type === 'link' ? 'other' : modalForm.material_type,
        file_url: fileUrl || null,
        content: modalForm.content.trim() || null,
        is_downloadable: modalForm.is_downloadable,
      });

      setShowModal(false);
      setUploadFile(null);
      setModalForm({
        course_id: courses[0]?.course_id || '',
        lesson_id: '',
        title: '',
        description: '',
        material_type: 'audio',
        file_url: '',
        content: '',
        is_downloadable: true,
      });
      loadMaterials();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to upload/create material');
    } finally {
      setUploading(false);
    }
  }

  const filtered = materials.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.title?.toLowerCase().includes(q) ||
      m.course_title?.toLowerCase().includes(q) ||
      m.lesson_title?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  });

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <MdLibraryBooks />
              </span>
              Learning Materials Repository
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Audio recordings, worksheets, picture cards, and educational resources for young learners.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto text-sm"
          >
            <MdUpload className="text-lg" /> + Add Material
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3.5 top-3 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search materials by title, keyword, audio, picture..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium text-slate-700 min-w-[170px]"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium text-slate-700"
              >
                <option value="">All Types</option>
                <option value="audio">🎙️ Audio Recordings</option>
                <option value="image">🎨 Pictures & Cards</option>
                <option value="pdf">📄 PDF Documents</option>
                <option value="video">🎬 Videos</option>
                <option value="link">🔗 Links / Web</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={loadMaterials} className="font-bold underline text-xs">Retry</button>
          </div>
        )}

        {/* Materials Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 bg-slate-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="text-5xl mb-3">📁</div>
            <h3 className="text-lg font-bold text-slate-800">No Learning Materials Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Upload phonetic audio recordings, Ge'ez character pictures, or worksheet PDFs to help children learn.
            </p>
            <div className="mt-5">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm shadow hover:bg-emerald-700 transition"
              >
                <MdUpload /> Upload New Material
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((mat) => {
              const Icon = TYPE_ICONS[mat.material_type] || MdLibraryBooks;
              const typeColor = TYPE_COLORS[mat.material_type] || 'bg-slate-50 text-slate-700 border-slate-200';
              const isAudio = mat.material_type === 'audio';
              const isImage = mat.material_type === 'image';

              return (
                <div
                  key={mat.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${typeColor}`}>
                        <Icon className="text-sm" />
                        <span className="capitalize">{mat.material_type}</span>
                      </span>

                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                        title="Delete material"
                      >
                        <MdDelete className="text-lg" />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                      {mat.course_title} • {mat.lesson_title}
                    </p>

                    {mat.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {mat.description}
                      </p>
                    )}

                    {/* Preview embed: Audio player or Image thumbnail */}
                    {isAudio && mat.file_url && (
                      <div className="mt-3 p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                        <audio src={mat.file_url} controls className="w-full h-8" />
                      </div>
                    )}

                    {isImage && mat.file_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 max-h-36 bg-slate-50">
                        <img
                          src={mat.file_url}
                          alt={mat.title}
                          className="w-full h-32 object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {new Date(mat.created_at).toLocaleDateString()}
                    </span>

                    {mat.file_url && (
                      <a
                        href={mat.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <MdDownload className="text-sm" /> View / Download
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MdUpload className="text-emerald-600" /> Upload Learning Material
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <MdClose className="text-xl" />
                </button>
              </div>

              {modalError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
                {/* Course Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={modalForm.course_id}
                    onChange={(e) => setModalForm((f) => ({ ...f, course_id: e.target.value, lesson_id: '' }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Lesson <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={modalForm.lesson_id}
                    onChange={(e) => setModalForm((f) => ({ ...f, lesson_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="">-- Choose a lesson --</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} (Lesson #{l.order_index})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Material Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={modalForm.title}
                    onChange={(e) => setModalForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. ሀ ፊደል ድምፅ መመሪያ (Letter Ha Audio Guide)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Material Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Material Type
                  </label>
                  <select
                    value={modalForm.material_type}
                    onChange={(e) => setModalForm((f) => ({ ...f, material_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="audio">🎙️ Audio Recording</option>
                    <option value="image">🎨 Picture / Flashcard</option>
                    <option value="pdf">📄 PDF Document</option>
                    <option value="video">🎬 Video</option>
                    <option value="link">🔗 External Link</option>
                  </select>
                </div>

                {/* File Upload Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Upload File (Audio, PDF, Image, etc.)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Or provide a URL below if already hosted.</p>
                </div>

                {/* File URL Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    File URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={modalForm.file_url}
                    onChange={(e) => setModalForm((f) => ({ ...f, file_url: e.target.value }))}
                    placeholder="https://... or /uploads/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description & Instructions for Children
                  </label>
                  <textarea
                    rows={2}
                    value={modalForm.description}
                    onChange={(e) => setModalForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Explanation or guide for this material..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-5 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition disabled:opacity-50"
                  >
                    {uploading ? 'Saving Material...' : 'Save Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
