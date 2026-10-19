import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdGrading, MdSearch, MdFilterList,
  MdCheckCircle, MdPending, MdRateReview,
  MdClose, MdPerson, MdAssignment, MdSave,
  MdOpenInNew, MdImage, MdAudiotrack, MdPictureAsPdf
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

export default function InstructorSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [search, setSearch] = useState('');

  // Grading modal state
  const [selectedSub, setSelectedSub] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [gradeError, setGradeError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter, selectedCourse]);

  async function loadCourses() {
    try {
      const { data } = await axiosClient.get('/instructor/courses');
      setCourses(data.courses || []);
    } catch {
      // ignore
    }
  }

  async function loadSubmissions() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (selectedCourse) params.course_id = selectedCourse;
      if (search.trim()) params.search = search.trim();

      const { data } = await axiosClient.get('/instructor/submissions', { params });
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadSubmissions();
  }

  function openGradeModal(sub) {
    setSelectedSub(sub);
    setGradeScore(sub.score ?? '');
    setGradeFeedback(sub.feedback || '');
    setGradeError('');
  }

  function closeGradeModal() {
    setSelectedSub(null);
    setGradeScore('');
    setGradeFeedback('');
    setGradeError('');
  }

  async function handleGradeSubmit(e) {
    e.preventDefault();
    if (!selectedSub) return;
    setGradeError('');

    const max = Number(selectedSub.max_score || 100);
    const scoreNum = Number(gradeScore);

    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > max) {
      setGradeError(`Score must be a number between 0 and ${max}`);
      return;
    }

    setSubmittingGrade(true);
    try {
      await axiosClient.put(`/submissions/${selectedSub.id}/review`, {
        status: 'graded',
        score: scoreNum,
        feedback: gradeFeedback.trim() || 'Great work! Keep learning.',
      });

      // Update locally
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSub.id
            ? {
                ...s,
                status: 'reviewed',
                score: scoreNum,
                percentage: Math.round((scoreNum / max) * 100),
                feedback: gradeFeedback.trim() || 'Great work!',
                graded_at: new Date().toISOString(),
              }
            : s
        )
      );

      closeGradeModal();
    } catch (err) {
      setGradeError(err.response?.data?.error || 'Could not save grade');
    } finally {
      setSubmittingGrade(false);
    }
  }

  const filtered = submissions.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.student_name?.toLowerCase().includes(term) ||
      s.activity_title?.toLowerCase().includes(term) ||
      s.course_title?.toLowerCase().includes(term)
    );
  });

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <MdGrading />
              </span>
              Submissions & Grading Queue
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review young learners' completed exercises, assess drawings/tracings, and return scores & feedback.
            </p>
          </div>

          {/* Quick status counter pill */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs ${
              pendingCount > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
            }`}>
              <MdPending /> {pendingCount} Pending Reviews
            </span>
          </div>
        </div>

        {/* Filter Bar with Status Tabs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
          {/* Status Tabs */}
          <div className="flex border-b border-slate-100 pb-3 gap-2">
            {[
              { id: 'pending', label: 'Needs Grading' },
              { id: 'reviewed', label: 'Graded & Reviewed' },
              { id: 'all', label: 'All Submissions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3.5 top-3 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search by student name or activity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium text-slate-700 min-w-[170px]"
              >
                <option value="">All Assigned Courses</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={loadSubmissions} className="font-bold underline text-xs">Retry</button>
          </div>
        )}

        {/* Submissions Table / Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="text-5xl mb-3">
              {statusFilter === 'pending' ? '🎉' : '📋'}
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {statusFilter === 'pending' ? 'All caught up! No submissions need grading.' : 'No Submissions Found'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {statusFilter === 'pending'
                ? 'Check back later when students submit their homework, drawings, and activities.'
                : 'No student work matches the current filter selection.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => {
              const isPending = sub.status === 'pending';
              const max = sub.max_score || 100;
              const hasFile = Boolean(sub.submission_url);

              return (
                <div
                  key={sub.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPending
                      ? 'border-rose-200 hover:border-rose-300 hover:shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-bold text-slate-900 text-sm">{sub.student_name}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {sub.student_grade ? `Grade ${sub.student_grade}` : ''}
                        {sub.student_section ? ` • Sec ${sub.student_section}` : ''}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPending ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isPending ? 'Needs Grading' : 'Graded'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-700 text-sm">{sub.activity_title}</span>
                      <span className="text-xs text-slate-500">• {sub.course_title}</span>
                    </div>

                    {/* Submission text snippet */}
                    {sub.submission_text && (
                      <p className="text-xs text-slate-600 mt-1.5 p-2 bg-slate-50 rounded-xl line-clamp-2 border border-slate-100">
                        "{sub.submission_text}"
                      </p>
                    )}

                    {/* Attachment pill */}
                    {hasFile && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={sub.submission_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                        >
                          <MdOpenInNew /> View Attachment / File
                        </a>
                      </div>
                    )}

                    {/* Feedback preview if already graded */}
                    {!isPending && sub.feedback && (
                      <div className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1.5">
                        <span className="text-emerald-600">💬 Feedback:</span>
                        <span>"{sub.feedback}"</span>
                      </div>
                    )}
                  </div>

                  {/* Score & Grading action */}
                  <div className="flex items-center gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {!isPending && (
                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-700">
                          {sub.score ?? 0} / {max}
                        </span>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {sub.percentage ?? 0}%
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => openGradeModal(sub)}
                      className={`inline-flex items-center gap-1.5 font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition ${
                        isPending
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      <MdRateReview className="text-base" />
                      <span>{isPending ? 'Grade Submission' : 'Edit Grade'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Review & Grading Modal */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Grade Student Submission</h3>
                  <p className="text-xs text-slate-500">
                    {selectedSub.student_name} • {selectedSub.activity_title}
                  </p>
                </div>
                <button onClick={closeGradeModal} className="text-slate-400 hover:text-slate-600">
                  <MdClose className="text-xl" />
                </button>
              </div>

              {gradeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                  {gradeError}
                </div>
              )}

              {/* Student Submission Content Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Submitted Work
                </span>

                {selectedSub.submission_text ? (
                  <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap">
                    {selectedSub.submission_text}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No text provided.</p>
                )}

                {selectedSub.submission_url && (
                  <div className="mt-3 pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-500 font-medium block mb-1.5">Attached File / Drawing:</span>
                    <a
                      href={selectedSub.submission_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-slate-50 shadow-sm"
                    >
                      <MdOpenInNew /> Open File in New Tab
                    </a>
                  </div>
                )}
              </div>

              {/* Grading Form */}
              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Score (out of {selectedSub.max_score || 100}) <span className="text-rose-500">*</span>
                    </label>
                    {gradeScore !== '' && !isNaN(Number(gradeScore)) && (
                      <span className="text-xs font-bold text-emerald-600">
                        {Math.min(100, Math.round((Number(gradeScore) / (selectedSub.max_score || 100)) * 100))}%
                      </span>
                    )}
                  </div>
                  <input
                    required
                    type="number"
                    min="0"
                    max={selectedSub.max_score || 100}
                    step="0.5"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    placeholder={`e.g. ${Math.round((selectedSub.max_score || 100) * 0.9)}`}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Constructive Feedback & Praise for Child
                  </label>
                  <textarea
                    rows={3}
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    placeholder="e.g. ጎበዝ! በጣም ጥሩ ሥራ ነው። (Well done! Great writing effort.)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      'ጎበዝ! በጣም ጥሩ ሥራ ነው።',
                      'ጥሩ ሙከራ! ቀጥልበት።',
                      'ፊደላቱን በጥንቃቄ ጽፈሃል!',
                      'Great job! Excellent effort.',
                    ].map((phrase) => (
                      <button
                        key={phrase}
                        type="button"
                        onClick={() => setGradeFeedback(phrase)}
                        className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded-lg transition"
                      >
                        + {phrase}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeGradeModal}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGrade}
                    className="px-5 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <MdSave />
                    <span>{submittingGrade ? 'Submitting Grade...' : 'Save & Return Grade'}</span>
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
