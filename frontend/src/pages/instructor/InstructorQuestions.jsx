import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MdQuestionAnswer, MdSend, MdRefresh, MdClose,
  MdCheckCircle, MdSchedule, MdToday, MdDoneAll, MdEdit, MdPerson,
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const STATUS_META = {
  WAITING_FOR_ANSWER: { label: 'Waiting for Answer', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  ANSWERED: { label: 'Answered', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CLOSED: { label: 'Closed', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
};

function fmt(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch { return ''; }
}

export default function InstructorQuestions() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ total_unanswered: 0, received_today: 0, answered: 0, awaiting_response: 0 });
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [statusFilter, setStatusFilter] = useState('waiting');
  const [courseFilter, setCourseFilter] = useState('');
  const [lessonFilter, setLessonFilter] = useState('');
  const [lessons, setLessons] = useState([]);
  const [dateFilter, setDateFilter] = useState('');

  // Detail / answer modal
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [answerSuccess, setAnswerSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    axiosClient.get('/instructor/courses')
      .then(({ data }) => setCourses(data.courses || []))
      .catch(() => setCourses([]));
  }, []);

  // Deep link: /instructor/questions?open=<id> opens that question's detail.
  useEffect(() => {
    const open = searchParams.get('open');
    if (open) openDetail(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    loadQuestions();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, courseFilter, lessonFilter, dateFilter]);

  // Lesson options follow the selected course.
  useEffect(() => {
    if (!courseFilter) {
      setLessons([]);
      setLessonFilter('');
      return;
    }
    axiosClient.get('/instructor/lessons', { params: { course_id: courseFilter } })
      .then(({ data }) => setLessons(data.lessons || []))
      .catch(() => setLessons([]));
  }, [courseFilter]);

  async function loadSummary() {
    try {
      const { data } = await axiosClient.get('/instructor/questions/summary');
      setSummary(data.summary || {});
    } catch {
      /* ignore */
    }
  }

  async function loadQuestions() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (courseFilter) params.course_id = courseFilter;
      if (lessonFilter) params.lesson_id = lessonFilter;
      if (dateFilter) params.date = dateFilter;
      const { data } = await axiosClient.get('/instructor/questions', { params });
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load student questions');
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id) {
    setDetail(null);
    setDetailLoading(true);
    setAnswerText('');
    setAnswerError('');
    setAnswerSuccess('');
    setEditing(false);
    try {
      const { data } = await axiosClient.get(`/instructor/questions/${id}`);
      setDetail(data);
      setAnswerText(data.question?.answer_text || '');
    } catch (err) {
      setAnswerError(err.response?.data?.error || 'Could not open this question');
    } finally {
      setDetailLoading(false);
    }
  }

  const question = detail?.question;

  async function submitAnswer(e) {
    e.preventDefault();
    if (!question) return;
    if (answering) return;
    const trimmed = answerText.trim();
    if (!trimmed) {
      setAnswerError('Please write an answer before submitting.');
      return;
    }
    setAnswerError('');
    setAnswerSuccess('');
    setAnswering(true);
    try {
      const url = `/instructor/questions/${question.id}/answer`;
      const { data } = editing
        ? await axiosClient.patch(url, { answer_text: trimmed })
        : await axiosClient.post(url, { answer_text: trimmed });
      setAnswerSuccess(editing ? 'Answer updated!' : 'Answer sent to the child!');
      setEditing(false);
      setDetail((prev) => ({ ...prev, question: data.question }));
      setAnswerText(data.answer?.answer_text || trimmed);
      loadQuestions();
      loadSummary();
    } catch (err) {
      if (err.response?.status === 409) {
        setAnswerError(err.response.data?.error || 'This question has already been answered. Refreshing…');
        loadQuestions();
      } else {
        setAnswerError(err.response?.data?.error || 'Could not save the answer. Please try again.');
      }
    } finally {
      setAnswering(false);
    }
  }

  const tabs = [
    { id: 'waiting', label: 'Waiting for Answer' },
    { id: 'answered', label: 'Answered' },
    { id: 'all', label: 'All' },
  ];

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MdQuestionAnswer /></span>
              Student Questions
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Children can ask up to two questions at a time. Answering one frees a new slot for the child.
            </p>
          </div>
          <button
            onClick={() => { loadQuestions(); loadSummary(); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
          >
            <MdRefresh /> Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Unanswered', value: summary.total_unanswered, icon: <MdSchedule />, tint: 'bg-amber-50 text-amber-600' },
            { label: 'Received Today', value: summary.received_today, icon: <MdToday />, tint: 'bg-blue-50 text-blue-600' },
            { label: 'Answered', value: summary.answered, icon: <MdCheckCircle />, tint: 'bg-emerald-50 text-emerald-600' },
            { label: 'Awaiting Response', value: summary.awaiting_response, icon: <MdDoneAll />, tint: 'bg-rose-50 text-rose-600' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.tint}`}>{c.icon}</div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">{c.value ?? 0}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>{c.course_title}</option>
              ))}
            </select>
            <select
              value={lessonFilter}
              onChange={(e) => setLessonFilter(e.target.value)}
              disabled={!courseFilter}
              className={`px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 ${!courseFilter ? 'bg-slate-50 text-slate-400' : ''}`}
            >
              <option value="">{courseFilter ? 'All lessons' : 'Pick a course first'}</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
            {(courseFilter || lessonFilter || dateFilter) && (
              <button
                onClick={() => { setCourseFilter(''); setLessonFilter(''); setDateFilter(''); }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadQuestions} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold">Retry</button>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          )}

          {!loading && questions.length === 0 && (
            <div className="py-16 text-center">
              <MdQuestionAnswer className="text-5xl text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-semibold">No questions here yet</p>
              <p className="text-xs text-slate-400 mt-1">When a child asks for help it will appear in this list.</p>
            </div>
          )}

          {!loading && questions.map((q, i) => {
            const meta = STATUS_META[q.status] || STATUS_META.WAITING_FOR_ANSWER;
            return (
              <div
                key={q.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4 ${i !== questions.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/60 transition`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${meta.cls}`}>{meta.label}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <MdPerson className="text-sm" /> {q.student_name}
                    </span>
                    {q.course_title && <span className="text-xs text-slate-400">📚 {q.course_title}</span>}
                    {q.lesson_title && <span className="text-xs text-slate-400">📖 {q.lesson_title}</span>}
                  </div>
                  <p className="text-sm text-slate-800 font-medium line-clamp-2">{q.question_text}</p>
                  <p className="text-xs text-slate-400 mt-1">{fmt(q.created_at)}</p>
                </div>
                <button
                  onClick={() => openDetail(q.id)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition"
                >
                  <MdEdit /> {q.status === 'WAITING_FOR_ANSWER' ? 'View & Answer' : 'View'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail + Answer modal */}
      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <MdQuestionAnswer className="text-indigo-600" /> Question Details
              </h2>
              <button onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <MdClose />
              </button>
            </div>

            {detailLoading && (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            )}

            {!detailLoading && question && (
              <form onSubmit={submitAnswer} className="p-5 space-y-4">
                {/* Child + context */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                    <MdPerson /> {question.student_name}
                  </span>
                  {question.course_title && <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">📚 {question.course_title}</span>}
                  {question.lesson_title && <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">📖 {question.lesson_title}</span>}
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${(STATUS_META[question.status] || STATUS_META.WAITING_FOR_ANSWER).cls}`}>
                    {(STATUS_META[question.status] || STATUS_META.WAITING_FOR_ANSWER).label}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">The child asked</p>
                  <p className="text-slate-800 font-medium whitespace-pre-wrap">{question.question_text}</p>
                  <p className="text-xs text-slate-400 mt-2">Submitted {fmt(question.created_at)}</p>
                </div>

                {detail.lesson_context?.description && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Lesson context</p>
                    <p className="text-sm text-blue-900">{detail.lesson_context.description}</p>
                  </div>
                )}

                {/* Previous answer (if already answered) */}
                {question.status === 'ANSWERED' && question.answer_text && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">
                      Previous answer · {question.answered_by_name || question.instructor_name || 'Instructor'}
                    </p>
                    <p className="text-emerald-900 whitespace-pre-wrap">{question.answer_text}</p>
                    <p className="text-xs text-emerald-600 mt-2">
                      Answered {fmt(question.answer_created_at || question.answered_at)}
                      {question.answer_updated_at && question.answer_updated_at !== question.answer_created_at ? ` · edited ${fmt(question.answer_updated_at)}` : ''}
                    </p>
                  </div>
                )}

                {/* Answer editor */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {question.status === 'ANSWERED' ? (editing ? 'Edit your answer' : 'Your answer') : 'Write your answer'}
                  </label>
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value.slice(0, 2000))}
                    rows={4}
                    disabled={question.status === 'ANSWERED' && !editing}
                    placeholder="Explain clearly and kindly, and point the child to the right learning material."
                    className={`w-full px-4 py-3 rounded-xl border-2 text-slate-800 focus:outline-none resize-none ${
                      question.status === 'ANSWERED' && !editing ? 'bg-slate-50 border-slate-200' : 'border-indigo-200 focus:border-indigo-500'
                    }`}
                  />
                </div>

                {answerError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">{answerError}</div>
                )}
                {answerSuccess && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700">✅ {answerSuccess}</div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Close
                  </button>

                  {question.status === 'ANSWERED' && !editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                    >
                      <MdEdit /> Edit Answer
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={answering}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-white transition ${
                        answering ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      <MdSend /> {answering ? 'Saving…' : question.status === 'WAITING_FOR_ANSWER' ? 'Submit Answer' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </InstructorLayout>
  );
}
