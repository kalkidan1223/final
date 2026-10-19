import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const MAX_QUESTION_LENGTH = 500;

/**
 * AskTeacherModal
 *
 * Child-friendly "Ask My Teacher" dialog. The course and lesson are identified
 * automatically whenever the dialog is opened from a lesson page; otherwise the
 * child picks a course with big buttons. The two-question limit is enforced by
 * the backend — this dialog only surfaces the result.
 */
export default function AskTeacherModal({
  open,
  onClose,
  courseId = null,
  courseTitle = '',
  lessonId = null,
  lessonTitle = '',
  resourceType = null,
  resourceId = null,
  onSubmitted,
}) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [counts, setCounts] = useState({ pending_count: 0, limit: 2, can_ask: true });
  const [courses, setCourses] = useState([]);
  const [pickedCourse, setPickedCourse] = useState(courseId || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const needsCoursePicker = !courseId && !lessonId;

  useEffect(() => {
    if (!open) return;
    setText('');
    setError('');
    setSuccess('');
    setPickedCourse(courseId || '');
    loadContext();
    return () => stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadContext() {
    setLoading(true);
    try {
      const countRes = await axiosClient.get('/child/questions/pending-count');
      setCounts(countRes.data);
      if (needsCoursePicker) {
        const res = await axiosClient.get('/child/courses');
        setCourses(res.data.courses || []);
      }
    } catch {
      // Non-fatal: the limit is still enforced on submit.
    } finally {
      setLoading(false);
    }
  }

  function startListening() {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setError('Voice is not available on this device. Please type your question.');
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'am-ET';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const spoken = Array.from(event.results).map((r) => r[0].transcript).join(' ');
        setText((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, MAX_QUESTION_LENGTH));
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  const trimmed = text.trim();
  const remaining = MAX_QUESTION_LENGTH - text.length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return; // guard against double-clicks
    setError('');
    setSuccess('');

    if (!trimmed) {
      setError('Write your question here. What do you need help understanding?');
      return;
    }
    const finalCourse = courseId || pickedCourse;
    if (!finalCourse && !lessonId) {
      setError('Choose a course first, then write your question.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { question_text: trimmed };
      if (lessonId) payload.lesson_id = lessonId;
      if (finalCourse) payload.course_id = finalCourse;
      if (resourceType && resourceId) {
        payload.resource_type = resourceType;
        payload.resource_id = resourceId;
      }

      const res = await axiosClient.post('/child/questions', payload);
      setSuccess(res.data.message || 'Your question has been sent to your teacher!');
      if (res.data.pending_count !== undefined) {
        setCounts((prev) => ({ ...prev, pending_count: res.data.pending_count, can_ask: res.data.pending_count < (res.data.limit || 2) }));
      }
      if (typeof onSubmitted === 'function') onSubmitted(res.data.question);
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data?.error || 'You already have two questions waiting for your teacher.');
      } else {
        setError(err.response?.data?.error || 'We could not send your question. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg bg-white rounded-[2rem] border-4 border-purple-200 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-6 text-white relative sticky top-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/25 hover:bg-white/40 font-black text-lg transition"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">🙋</span>
            <div>
              <h2 className="text-2xl font-black drop-shadow">Ask My Teacher</h2>
              <p className="text-sm font-bold text-white/90">What do you need help with?</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Context chips */}
          <div className="flex flex-wrap gap-2">
            {(courseTitle || pickedCourse) && (
              <span className="px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 font-bold text-xs border-2 border-purple-200">
                📚 {courseTitle || courses.find((c) => String(c.id) === String(pickedCourse))?.title || 'Course'}
              </span>
            )}
            {lessonTitle && (
              <span className="px-3 py-1.5 rounded-full bg-pink-100 text-pink-800 font-bold text-xs border-2 border-pink-200">
                📖 {lessonTitle}
              </span>
            )}
          </div>

          {/* Course picker (only when opened without lesson context) */}
          {needsCoursePicker && loading && (
            <div className="h-12 bg-purple-50 rounded-xl animate-pulse" />
          )}
          {needsCoursePicker && !loading && (
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">Which course? 📚</label>
              <select
                value={pickedCourse}
                onChange={(e) => setPickedCourse(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 font-bold text-slate-800 focus:outline-none focus:border-purple-500"
              >
                <option value="">Choose a course…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Question text */}
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">Write your question here ✏️</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
              rows={4}
              placeholder="Write your question here. What do you need help understanding?"
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 font-medium text-slate-800 focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`text-xs font-black px-3 py-1.5 rounded-full border-2 transition ${listening ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
              >
                {listening ? '⏹ Stop talking' : '🎤 Talk your question'}
              </button>
              <span className={`text-xs font-bold ${remaining < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{remaining} left</span>
            </div>
          </div>

          {/* Waiting counter */}
          <div className="rounded-xl bg-amber-50 border-2 border-amber-200 px-4 py-2 text-sm font-black text-amber-800">
            ⏳ My Questions: {counts.pending_count} of {counts.limit} waiting for answers
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 space-y-2">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => { onClose(); navigate('/child/questions'); }}
                className="underline font-black"
              >
                See My Questions →
              </button>
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700 space-y-2">
              <p>✅ {success}</p>
              <button
                type="button"
                onClick={() => { onClose(); navigate('/child/questions'); }}
                className="underline font-black"
              >
                See My Questions →
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!success}
              className={`flex-1 py-3.5 rounded-2xl font-black text-white shadow-lg transition transform ${
                submitting || success
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {submitting ? 'Sending…' : 'Submit Question 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
