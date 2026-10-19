import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdAutoStories, MdAdd, MdSearch, MdFilterList,
  MdCheckCircle, MdEdit, MdOpenInNew, MdPictureAsPdf,
  MdVideocam, MdAssignment, MdQuiz, MdToggleOn, MdToggleOff
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const DIFFICULTY_COLORS = {
  beginner: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  intermediate: 'bg-amber-100 text-amber-800 border-amber-200',
  advanced: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function InstructorLessons() {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadLessons();
  }, [selectedCourse, statusFilter]);

  async function loadCourses() {
    try {
      const { data } = await axiosClient.get('/instructor/courses');
      setCourses(data.courses || []);
    } catch {
      // ignore
    }
  }

  async function loadLessons() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedCourse) params.course_id = selectedCourse;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const { data } = await axiosClient.get('/instructor/lessons', { params });
      setLessons(data.lessons || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadLessons();
  }

  async function toggleStatus(lesson) {
    const newStatus = lesson.status === 'active' ? 'inactive' : 'active';
    setBusyId(lesson.id);
    try {
      await axiosClient.patch(`/lessons/${lesson.id}/status`, { status: newStatus });
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update lesson status');
    } finally {
      setBusyId(null);
    }
  }

  const filteredLessons = lessons.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.title?.toLowerCase().includes(q) ||
      l.course_title?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    );
  });

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <MdAutoStories />
              </span>
              Lesson Planning & Curriculum
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Organize and sequence lessons across your assigned teaching courses.
            </p>
          </div>

          <Link
            to="/instructor/courses"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto text-sm"
          >
            <MdAdd className="text-lg" /> + New Lesson
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3.5 top-3 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search lessons by title, concept, or curriculum..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Course filter */}
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium text-slate-700 min-w-[180px]"
              >
                <option value="">All Assigned Courses</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="active">Active / Published</option>
                <option value="inactive">Inactive / Draft</option>
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

        {/* Error message */}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={loadLessons} className="font-bold underline text-xs">Retry</button>
          </div>
        )}

        {/* Lessons List / Grid */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="text-5xl mb-3">📖</div>
            <h3 className="text-lg font-bold text-slate-800">No Lessons Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {search || selectedCourse || statusFilter
                ? 'No lessons matched your filter criteria. Try resetting filters.'
                : 'You have not created any lessons in your assigned courses yet.'}
            </p>
            <div className="mt-5">
              <Link
                to="/instructor/courses"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-sm shadow hover:bg-indigo-700 transition"
              >
                <MdAdd /> Create Your First Lesson
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLessons.map((lesson) => {
              const isActive = lesson.status === 'active';
              return (
                <div
                  key={lesson.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {lesson.course_title}
                      </span>
                      <span className="text-xs text-slate-400">
                        Lesson #{lesson.order_index ?? 1}
                      </span>
                      {lesson.difficulty_level && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[lesson.difficulty_level] || 'bg-slate-100 text-slate-700'}`}>
                          {lesson.difficulty_level}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isActive ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {lesson.title}
                    </h3>

                    {lesson.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {lesson.description}
                      </p>
                    )}

                    {/* Content counters */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600 font-medium">
                      <span className="flex items-center gap-1.5" title="Learning Materials">
                        <MdPictureAsPdf className="text-indigo-500 text-sm" />
                        <span>{lesson.material_count || 0} Materials</span>
                      </span>
                      <span className="flex items-center gap-1.5" title="Interactive Activities">
                        <MdAssignment className="text-purple-500 text-sm" />
                        <span>{lesson.activity_count || 0} Activities</span>
                      </span>
                      <span className="flex items-center gap-1.5" title="Quizzes">
                        <MdQuiz className="text-amber-500 text-sm" />
                        <span>{lesson.quiz_count || 0} Quizzes</span>
                      </span>
                      <span className="flex items-center gap-1.5" title="Videos">
                        <MdVideocam className="text-sky-500 text-sm" />
                        <span>{lesson.video_count || 0} Videos</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      onClick={() => toggleStatus(lesson)}
                      disabled={busyId === lesson.id}
                      className={`p-2 rounded-xl border text-sm font-semibold transition flex items-center gap-1 ${
                        isActive
                          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title={isActive ? 'Click to deactivate' : 'Click to publish'}
                    >
                      {isActive ? <MdToggleOn className="text-2xl text-emerald-600" /> : <MdToggleOff className="text-2xl text-slate-400" />}
                      <span className="hidden sm:inline">{isActive ? 'Active' : 'Draft'}</span>
                    </button>

                    <Link
                      to={`/instructor/lessons/${lesson.id}/edit`}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm transition"
                      title="Edit lesson details"
                    >
                      <MdEdit className="text-lg" />
                    </Link>

                    <Link
                      to={`/instructor/courses/${lesson.course_id}/lessons/${lesson.id}`}
                      className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-xl text-xs transition"
                    >
                      Manage Content <MdOpenInNew className="text-sm" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
