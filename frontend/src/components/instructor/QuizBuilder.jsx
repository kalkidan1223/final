import { useEffect, useRef, useState } from 'react';
import { MdAdd, MdDelete, MdUpload, MdLink, MdVisibility } from 'react-icons/md';
import Modal from '../Modal';
import axiosClient from '../../api/axiosClient';

const QUESTION_TYPES = ['mcq', 'true_false', 'fill_in_the_blank', 'matching', 'short_answer', 'picture', 'audio'];
const MEDIA_TYPES = ['picture', 'audio'];
const OPTION_TYPES = ['mcq', 'matching'];

const EMPTY_SETTINGS = {
  title: '',
  description: '',
  instructions: '',
  time_limit_seconds: '',
  passing_score: '',
  max_score: '',
  attempt_limit: '1',
  shuffle_questions: false,
  show_result_immediately: true,
  status: 'active',
};

const EMPTY_QUESTION = {
  question_text: '',
  question_type: 'mcq',
  options: '',
  correct_answer: '',
  points: '1',
  explanation: '',
  media_url: '',
};

function optionsList(q) {
  if (q.options && typeof q.options === 'string') {
    return q.options.split('\n').map((o) => o.trim()).filter(Boolean);
  }
  return Array.isArray(q.options) ? q.options : [];
}

// Normalise a question (either from the server or the local draft list)
// into the shape the backend expects.
function toApiQuestion(q) {
  return {
    question_text: q.question_text,
    question_type: q.question_type,
    correct_answer: q.correct_answer,
    points: Number(q.points) || 1,
    explanation: q.explanation || null,
    options: OPTION_TYPES.includes(q.question_type) ? optionsList(q) : undefined,
    question_config: MEDIA_TYPES.includes(q.question_type) && q.question_config?.media_url
      ? { media_url: q.question_config.media_url }
      : (q.question_config && Object.keys(q.question_config).length ? q.question_config : null),
  };
}

export default function QuizBuilder({ open, onClose, lessonId, quiz, onSaved }) {
  const [settings, setSettings] = useState({ ...EMPTY_SETTINGS });
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState({ ...EMPTY_QUESTION });
  const [mode, setMode] = useState('create');
  const [activeId, setActiveId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const seqRef = useRef(0);
  const contentRef = useRef(null);

  const isEdit = mode === 'edit';
  const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const labelCls = 'mb-1 block text-xs font-medium text-slate-500';

  function set(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function fetchQuestions(quizId) {
    const { data } = await axiosClient.get(`/quizzes/${quizId}`);
    setQuestions(data.questions || []);
  }

  useEffect(() => {
    if (!open) return;
    setPreview(false);
    setError('');
    setNotice('');
    setBusy(false);
    setUploading(false);
    setQuestionForm({ ...EMPTY_QUESTION });
    contentRef.current?.scrollTo({ top: 0 });
    if (quiz) {
      setMode('edit');
      setActiveId(quiz.id);
      setSettings({
        title: quiz.title || '',
        description: quiz.description || '',
        instructions: quiz.instructions || '',
        time_limit_seconds: quiz.time_limit_seconds || '',
        passing_score: quiz.passing_score || '',
        max_score: quiz.max_score || '',
        attempt_limit: quiz.attempt_limit ?? '1',
        shuffle_questions: Boolean(quiz.shuffle_questions),
        show_result_immediately: quiz.show_result_immediately !== false,
        status: quiz.status || 'active',
      });
      fetchQuestions(quiz.id).catch((err) => setError(err.response?.data?.error || 'Could not load quiz questions'));
    } else {
      setMode('create');
      setActiveId(null);
      setSettings({ ...EMPTY_SETTINGS });
      setQuestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quiz]);

  // Create the quiz (status active or inactive) and save every draft question
  // that was written in the modal in one step.
  async function createQuiz(status) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { data } = await axiosClient.post(`/lessons/${lessonId}/quizzes`, { ...settings, status });
      const createdId = data.quiz.id;
      if (questions.length > 0) {
        try {
          await axiosClient.put(`/quizzes/${createdId}/questions`, {
            questions: questions.map(toApiQuestion),
          });
        } catch (questionErr) {
          setError(questionErr.response?.data?.error || 'The quiz was created but some questions could not be saved.');
          setMode('edit');
          setActiveId(createdId);
          await fetchQuestions(createdId);
          onSaved();
          return;
        }
      }
      setMode('edit');
      setActiveId(createdId);
      await fetchQuestions(createdId);
      contentRef.current?.scrollTo({ top: 0 });
      setNotice(`${status === 'active' ? 'Quiz created' : 'Draft saved'} with ${questions.length} question(s). Keep editing or close.`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the quiz');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveQuiz(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const payload = {
        title: settings.title,
        description: settings.description || null,
        instructions: settings.instructions || null,
        time_limit_seconds: settings.time_limit_seconds ? Number(settings.time_limit_seconds) : null,
        passing_score: settings.passing_score ? Number(settings.passing_score) : null,
        max_score: settings.max_score ? Number(settings.max_score) : null,
        attempt_limit: Number(settings.attempt_limit) || 1,
        shuffle_questions: settings.shuffle_questions,
        show_result_immediately: settings.show_result_immediately,
        status: settings.status,
      };
      await axiosClient.put(`/quizzes/${activeId}`, payload);
      setNotice('Quiz settings saved.');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the quiz');
    } finally {
      setBusy(false);
    }
  }

  // From the question form (edit mode persists immediately; create mode
  // keeps the question locally until the quiz is created).
  function handleQuestionSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = toApiQuestion(questionForm);
    if (OPTION_TYPES.includes(payload.question_type) && (!payload.options || payload.options.length < 2)) {
      setError('A multiple-choice/matching question needs at least two options.');
      return;
    }
    if (MEDIA_TYPES.includes(payload.question_type) && !payload.question_config?.media_url) {
      setError('A picture/audio question needs a media file or URL.');
      return;
    }
    if (isEdit) {
      setBusy(true);
      axiosClient.post(`/quizzes/${activeId}/questions`, payload)
        .then(() => fetchQuestions(activeId))
        .catch((err) => setError(err.response?.data?.error || 'Could not add the question'))
        .finally(() => setBusy(false));
    } else {
      seqRef.current += 1;
      setQuestions((qs) => [...qs, { id: `local-${seqRef.current}`, ...payload }]);
    }
    setQuestionForm({ ...EMPTY_QUESTION });
  }

  function handleQuestionDelete(q) {
    if (!confirm('Delete this question?')) return;
    setError('');
    if (isEdit) {
      if (String(q.id).startsWith('local-')) {
        setQuestions((qs) => qs.filter((x) => x.id !== q.id));
        return;
      }
      setBusy(true);
      axiosClient.delete(`/quiz-questions/${q.id}`)
        .then(() => fetchQuestions(activeId))
        .catch((err) => setError(err.response?.data?.error || 'Could not delete the question'))
        .finally(() => setBusy(false));
    } else {
      setQuestions((qs) => qs.filter((x) => x.id !== q.id));
    }
  }

  async function handleMediaUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await axiosClient.post('/uploads/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setQuestionForm((f) => ({ ...f, media_url: data.url }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload the media file');
    } finally {
      setUploading(false);
    }
  }

  function renderPreview() {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">{settings.title || 'Untitled quiz'} — preview</h3>
        {questions.length === 0 ? (
          <p className="text-sm text-slate-500">No questions yet — preview will appear once there is at least one question.</p>
        ) : (
          questions.map((q, index) => (
            <div key={q.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-800">{index + 1}. {q.question_text}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{q.question_type.replace(/_/g, ' ')}</span>
              </div>
              {optionsList(q).length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {optionsList(q).map((opt) => (
                    <li key={opt} className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{opt}</li>
                  ))}
                </ul>
              )}
              {q.question_config?.media_url && <p className="mt-2 text-xs text-indigo-600">Media: {q.question_config.media_url}</p>}
              <p className="mt-2 text-xs text-emerald-600">
                Correct answer: {q.correct_answer} · {q.points} pt(s){q.explanation ? ` · Hint: ${q.explanation}` : ''}
              </p>
            </div>
          ))
        )}
        <button type="button" onClick={() => setPreview(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          Close preview
        </button>
      </div>
    );
  }

  function questionOptionsField() {
    if (!OPTION_TYPES.includes(questionForm.question_type)) return null;
    return (
      <div className="sm:col-span-2">
        <label className={labelCls}>Options (one per line){questionForm.question_type === 'mcq' ? ' — include the correct answer' : ''}</label>
        <textarea
          rows={4}
          value={questionForm.options}
          onChange={(e) => setQuestionForm((f) => ({ ...f, options: e.target.value }))}
          placeholder={'A\nB\nC'}
          className={inputCls}
        />
      </div>
    );
  }

  function questionMediaField() {
    if (!MEDIA_TYPES.includes(questionForm.question_type)) return null;
    return (
      <div className="sm:col-span-2">
        <label className={labelCls}>Media (image or audio)</label>
        <div className="flex items-center gap-2">
          <input
            value={questionForm.media_url}
            onChange={(e) => setQuestionForm((f) => ({ ...f, media_url: e.target.value }))}
            placeholder="/uploads/… or https://…"
            className={inputCls}
          />
          <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50">
            {uploading ? 'Uploading…' : <><MdUpload /> <span className="hidden sm:inline">Upload</span></>}
            <input type="file" accept={questionForm.question_type === 'audio' ? 'audio/*' : 'image/*'} className="hidden" onChange={handleMediaUpload} disabled={uploading} />
          </label>
          {questionForm.media_url && (
            <a href={questionForm.media_url} className="text-sm text-indigo-600 hover:underline" target="_blank" rel="noreferrer"><MdLink /></a>
          )}
        </div>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      contentRef={contentRef}
      title={isEdit ? `Edit quiz${settings.title ? ` — ${settings.title}` : ''}` : 'Create quiz'}
      subtitle="Write the questions and answers here — they are saved together with the quiz."
      size="xl"
    >
      {error && <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{notice}</div>}

      {preview ? (
        renderPreview()
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={isEdit ? handleSaveQuiz : (e) => { e.preventDefault(); createQuiz(settings.status); }}
            className="space-y-4 rounded-2xl border border-slate-200 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Quiz title *</label>
                <input required value={settings.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Letter A — phonics quiz" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Description</label>
                <input value={settings.description} onChange={(e) => set('description', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Instructions for students</label>
                <textarea rows={2} value={settings.instructions} onChange={(e) => set('instructions', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Time limit (seconds)</label>
                <input type="number" min="1" value={settings.time_limit_seconds} onChange={(e) => set('time_limit_seconds', e.target.value)} placeholder="e.g. 300" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Attempts allowed</label>
                <input type="number" min="1" value={settings.attempt_limit} onChange={(e) => set('attempt_limit', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Passing score</label>
                <input type="number" min="0" value={settings.passing_score} onChange={(e) => set('passing_score', e.target.value)} placeholder="e.g. 70" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Max score</label>
                <input type="number" min="0" value={settings.max_score} onChange={(e) => set('max_score', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={settings.shuffle_questions} onChange={(e) => set('shuffle_questions', e.target.checked)} />
                Shuffle questions
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={settings.show_result_immediately} onChange={(e) => set('show_result_immediately', e.target.checked)} />
                Show result immediately
              </label>
              <div>
                <label className={labelCls}>Status</label>
                <select value={settings.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              {!isEdit && (
                <button
                  type="button"
                  disabled={busy || !settings.title}
                  onClick={() => createQuiz('inactive')}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Save draft
                </button>
              )}
              <button
                type="submit"
                disabled={busy || !settings.title}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isEdit ? 'Save quiz' : 'Create quiz'}
              </button>
            </div>
          </form>

          {/* Question list */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Questions ({questions.length}){!isEdit && <span className="ml-2 text-xs font-normal text-slate-400">added below, saved with the quiz</span>}
              </h3>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
              >
                <MdVisibility /> Preview
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No questions yet — write the first one below.</p>
            ) : (
              <ul className="mb-4 space-y-2">
                {questions.map((q, index) => (
                  <li key={q.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{index + 1}. {q.question_text}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {q.question_type.replace(/_/g, ' ')} · answer: {q.correct_answer} · {q.points} pt(s)
                      </p>
                      {q.question_config?.media_url && <p className="mt-0.5 truncate text-xs text-indigo-600">{q.question_config.media_url}</p>}
                    </div>
                    <button
                      onClick={() => handleQuestionDelete(q)}
                      disabled={busy}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                      aria-label="Delete question"
                    >
                      <MdDelete />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Question writer — always visible */}
          <form onSubmit={handleQuestionSubmit} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">Write a question & answer</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Question text *</label>
                <input
                  required
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm((f) => ({ ...f, question_text: e.target.value }))}
                  placeholder="e.g. Which letter makes the /a/ sound?"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={questionForm.question_type} onChange={(e) => setQuestionForm((f) => ({ ...f, question_type: e.target.value }))} className={inputCls}>
                  {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Points *</label>
                <input type="number" min="1" required value={questionForm.points} onChange={(e) => setQuestionForm((f) => ({ ...f, points: e.target.value }))} className={inputCls} />
              </div>
              {questionOptionsField()}
              {questionMediaField()}
              <div className="sm:col-span-2">
                <label className={labelCls}>Correct answer *</label>
                {questionForm.question_type === 'true_false' ? (
                  <select
                    required
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, correct_answer: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select…</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    required
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm((f) => ({ ...f, correct_answer: e.target.value }))}
                    placeholder="The answer students must give"
                    className={inputCls}
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Explanation / hint (optional, shown after answering)</label>
                <input value={questionForm.explanation} onChange={(e) => setQuestionForm((f) => ({ ...f, explanation: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                disabled={busy || !questionForm.question_text || !questionForm.correct_answer}
                className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
              >
                <MdAdd /> Add question
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}