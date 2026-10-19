import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdQuiz, MdAdd, MdSearch, MdFilterList,
  MdEdit, MdDelete, MdOpenInNew, MdClose,
  MdCheckCircle, MdCancel, MdGrade, MdHelpOutline
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';
import QuizBuilder from '../../components/instructor/QuizBuilder';

export default function InstructorQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');

  // Builder Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [targetLessonId, setTargetLessonId] = useState('');
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [pickerCourseId, setPickerCourseId] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [courseFilter]);

  useEffect(() => {
    if (pickerCourseId) {
      axiosClient
        .get(`/instructor/lessons?course_id=${pickerCourseId}`)
        .then(({ data }) => setLessons(data.lessons || []))
        .catch(() => setLessons([]));
    } else {
      setLessons([]);
    }
  }, [pickerCourseId]);

  async function loadCourses() {
    try {
      const { data } = await axiosClient.get('/instructor/courses');
      setCourses(data.courses || []);
      if (data.courses?.length > 0 && !pickerCourseId) {
        setPickerCourseId(data.courses[0].course_id);
      }
    } catch {
      // ignore
    }
  }

  async function loadQuizzes() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (courseFilter) params.course_id = courseFilter;
      if (search.trim()) params.search = search.trim();

      const { data } = await axiosClient.get('/instructor/quizzes', { params });
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadQuizzes();
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await axiosClient.delete(`/quizzes/${id}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete quiz');
    }
  }

  function startCreate() {
    setShowLessonPicker(true);
  }

  function proceedWithLesson(lessonId) {
    setTargetLessonId(lessonId);
    setShowLessonPicker(false);
    setEditingQuiz(null);
    setBuilderOpen(true);
  }

  function startEdit(q) {
    setEditingQuiz(q);
    setTargetLessonId(q.lesson_id);
    setBuilderOpen(true);
  }

  const filtered = quizzes.filter((q) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      q.title?.toLowerCase().includes(term) ||
      q.course_title?.toLowerCase().includes(term) ||
      q.lesson_title?.toLowerCase().includes(term) ||
      q.description?.toLowerCase().includes(term)
    );
  });

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <MdQuiz />
              </span>
              Quizzes & Formative Assessments
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create engaging, child-friendly assessments with questions, audio prompts, and passing score gates.
            </p>
          </div>

          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto text-sm"
          >
            <MdAdd className="text-lg" /> + Create Quiz
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3.5 top-3 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search quizzes by title, curriculum, or lesson..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-amber-500 bg-white font-medium text-slate-700 min-w-[170px]"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title}
                  </option>
                ))}
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
            <button onClick={loadQuizzes} className="font-bold underline text-xs">Retry</button>
          </div>
        )}

        {/* Quizzes List */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-slate-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="text-5xl mb-3">📝</div>
            <h3 className="text-lg font-bold text-slate-800">No Quizzes Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Assess learning milestones and comprehension with interactive questions and automatic grading.
            </p>
            <div className="mt-5">
              <button
                onClick={startCreate}
                className="inline-flex items-center gap-2 bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-sm shadow hover:bg-amber-700 transition"
              >
                <MdAdd /> Create Your First Quiz
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((q) => {
              const passScore = q.passing_score ?? 70;
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <MdQuiz /> Quiz #{q.order_index ?? 1}
                        </span>
                        {q.is_required && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            Required to Pass
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                        title="Delete quiz"
                      >
                        <MdDelete className="text-lg" />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
                      {q.title}
                    </h3>
                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                      {q.course_title} • {q.lesson_title}
                    </p>

                    {q.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {q.description}
                      </p>
                    )}

                    {/* Performance metrics */}
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-xl p-2">
                        <span className="text-sm font-bold text-slate-800">{q.question_count || 0}</span>
                        <p className="text-[10px] text-slate-500 font-medium">Questions</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <span className="text-sm font-bold text-slate-800">{passScore}%</span>
                        <p className="text-[10px] text-slate-500 font-medium">Pass Goal</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <span className="text-sm font-bold text-slate-800">{q.attempt_count || 0}</span>
                        <p className="text-[10px] text-slate-500 font-medium">Attempts</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-2 text-emerald-700">
                        <span className="text-sm font-bold">{q.avg_percentage || 0}%</span>
                        <p className="text-[10px] text-emerald-600 font-medium">Avg Score</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      {q.passed_count || 0} Passed
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(q)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm transition"
                        title="Edit Quiz Settings"
                      >
                        <MdEdit />
                      </button>

                      <Link
                        to={`/instructor/quizzes/${q.id}`}
                        className="inline-flex items-center gap-1 font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg transition"
                      >
                        <span>Questions & Stats</span>
                        <MdOpenInNew className="text-xs" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: Lesson Picker for new quiz */}
        {showLessonPicker && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Select Lesson for New Quiz</h3>
                <button onClick={() => setShowLessonPicker(false)} className="text-slate-400 hover:text-slate-600">
                  <MdClose className="text-xl" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Course</label>
                <select
                  value={pickerCourseId}
                  onChange={(e) => setPickerCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Target Lesson</label>
                {lessons.length === 0 ? (
                  <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded-xl">
                    No lessons found in this course. Create a lesson first.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {lessons.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => proceedWithLesson(l.id)}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition flex items-center justify-between text-xs font-semibold text-slate-800"
                      >
                        <span className="truncate">{l.title} (Lesson #{l.order_index})</span>
                        <span className="text-amber-600 font-bold shrink-0 ml-2">Choose →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quiz Builder Modal */}
        {builderOpen && (
          <QuizBuilder
            open={builderOpen}
            onClose={() => setBuilderOpen(false)}
            lessonId={targetLessonId}
            quiz={editingQuiz}
            onSaved={() => {
              setBuilderOpen(false);
              loadQuizzes();
            }}
          />
        )}
      </div>
    </InstructorLayout>
  );
}
