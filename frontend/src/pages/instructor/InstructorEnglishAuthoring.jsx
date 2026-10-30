import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import InstructorLayout from '../../components/InstructorLayout';

export default function InstructorEnglishAuthoring() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdParam || '');
  const [letters, setLetters] = useState([]);
  const [selectedLetterIds, setSelectedLetterIds] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cRes = await axiosClient.get('/instructor/courses');
        setCourses(cRes.data.courses || []);
        if (!selectedCourseId && cRes.data.courses?.length) {
          const eng = cRes.data.courses.find((c) => /english/i.test(c.course_title));
          setSelectedCourseId(eng ? eng.course_id : cRes.data.courses[0].course_id);
        }
        const lRes = await axiosClient.get('/english-letters');
        setLetters(lRes.data.letters || []);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleLetter = (id) => {
    setSelectedLetterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedLetterIds(letters.map((l) => l.id));
  const clearAll = () => setSelectedLetterIds([]);

  const handleSave = async () => {
    if (!selectedCourseId) { setError('Select a course'); return; }
    if (!title.trim()) { setError('Title is required'); return; }
    if (selectedLetterIds.length === 0) { setError('Select at least one letter'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await axiosClient.post(`/instructor/courses/${selectedCourseId}/english-lessons`, {
        title: title.trim(),
        description: description.trim() || null,
        letter_ids: selectedLetterIds,
        publish_now: publishNow,
      });
      setSuccess('English letter lesson created! Redirecting...');
      setTimeout(() => navigate('/instructor/fidel-lessons'), 1200);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create lesson');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <InstructorLayout><div className="p-8 text-center">Loading...</div></InstructorLayout>;

  return (
    <InstructorLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create English Letter Lesson</h1>
          <p className="text-slate-600 mt-1">Author an interactive English alphabet lesson. Select the letters, order is by selection.</p>
        </div>

        {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">{success}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
            <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
              <option value="">Select course...</option>
              {courses.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lesson Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Letter A" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
            Publish immediately
          </label>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Select Letters ({selectedLetterIds.length}/{letters.length})</h3>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs px-3 py-1 bg-slate-100 rounded-lg hover:bg-slate-200">Select All</button>
              <button onClick={clearAll} className="text-xs px-3 py-1 bg-slate-100 rounded-lg hover:bg-slate-200">Clear</button>
            </div>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-13 gap-2">
            {letters.map((l) => (
              <button
                key={l.id}
                onClick={() => toggleLetter(l.id)}
                className={`aspect-square rounded-xl border-2 text-xl font-black transition ${
                  selectedLetterIds.includes(l.id)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {l.letter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create English Letter Lesson'}
          </button>
        </div>
      </div>
    </InstructorLayout>
  );
}