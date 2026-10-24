import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdTrendingUp, MdSearch, MdFilterList,
  MdCheckCircle, MdSchedule, MdCancel,
  MdPerson, MdSchool, MdAssignment, MdQuiz
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

export default function InstructorProgress() {
  const [progressList, setProgressList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadProgress();
  }, [selectedCourse, gradeFilter, sectionFilter]);

  async function loadCourses() {
    try {
      const { data } = await axiosClient.get('/instructor/courses');
      setCourses(data.courses || []);
    } catch {
      // ignore
    }
  }

  async function loadProgress() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedCourse) params.course_id = selectedCourse;
      if (gradeFilter) params.grade = gradeFilter;
      if (sectionFilter) params.section = sectionFilter;
      if (search.trim()) params.search = search.trim();

      const { data } = await axiosClient.get('/instructor/progress', { params });
      setProgressList(data.progress || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load student progress');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadProgress();
  }

  const filtered = progressList.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.student_name?.toLowerCase().includes(term) ||
      p.course_title?.toLowerCase().includes(term)
    );
  });

  // Calculate summary metrics
  const totalStudents = filtered.length;
  const completedCount = filtered.filter(
    (p) => p.progress_status === 'completed' || Number(p.completion_percentage) >= 100
  ).length;
  const inProgressCount = filtered.filter(
    (p) => Number(p.completion_percentage) > 0 && Number(p.completion_percentage) < 100
  ).length;
  const avgProgress = totalStudents > 0
    ? Math.round(filtered.reduce((acc, p) => acc + Number(p.completion_percentage || 0), 0) / totalStudents)
    : 0;

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <MdTrendingUp />
              </span>
              Student Learning Progress Matrix
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track real-time lesson completion, interactive activities, and quiz scores for all children.
            </p>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalStudents}</p>
            <p className="text-xs text-slate-400 mt-1">Students in assigned classes</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Course Completed</span>
            <p className="text-3xl font-extrabold text-emerald-700 mt-1">{completedCount}</p>
            <p className="text-xs text-emerald-600 mt-1">{totalStudents ? Math.round((completedCount / totalStudents) * 100) : 0}% completion rate</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Currently Learning</span>
            <p className="text-3xl font-extrabold text-indigo-700 mt-1">{inProgressCount}</p>
            <p className="text-xs text-slate-400 mt-1">Active in curriculum</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Average Progress</span>
            <p className="text-3xl font-extrabold text-purple-700 mt-1">{avgProgress}%</p>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <MdSearch className="absolute left-3.5 top-3 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search by student name or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium text-slate-700 min-w-[170px]"
              >
                <option value="">All Assigned Courses</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_title}
                  </option>
                ))}
              </select>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium text-slate-700"
              >
                <option value="">All Grades</option>
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 bg-white font-medium text-slate-700"
              >
                <option value="">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
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
            <button onClick={loadProgress} className="font-bold underline text-xs">Retry</button>
          </div>
        )}

        {/* Progress Table */}
        {loading ? (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="text-5xl mb-3">🌱</div>
            <h3 className="text-lg font-bold text-slate-800">No Student Progress Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Students will appear here as they engage with your lessons and complete activities.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-5">Student</th>
                    <th className="py-4 px-5">Class / Grade</th>
                    <th className="py-4 px-5">Course</th>
                    <th className="py-4 px-5 w-48">Overall Progress</th>
                    <th className="py-4 px-5 text-center">Activities</th>
                    <th className="py-4 px-5 text-center">Quizzes</th>
                    <th className="py-4 px-5 text-center">Avg Scores</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((item) => {
                    const pct = Math.round(Number(item.completion_percentage || 0));
                    const isCompleted = item.progress_status === 'completed' || pct >= 100;
                    const isStarted = pct > 0;

                    return (
                      <tr key={`${item.student_id}-${item.course_id}`} className="hover:bg-slate-50/70 transition">
                        {/* Student Name */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {item.student_name?.charAt(0) || 'S'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{item.student_name}</p>
                              <p className="text-[11px] text-slate-400 capitalize">{item.gender || 'student'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Class */}
                        <td className="py-3.5 px-5 text-xs text-slate-600 font-medium whitespace-nowrap">
                          {item.grade ? `Grade ${item.grade}` : '—'}
                          {item.section ? ` • Sec ${item.section}` : ''}
                        </td>

                        {/* Course */}
                        <td className="py-3.5 px-5">
                          <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {item.course_title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.grade_level_name}
                          </span>
                        </td>

                        {/* Progress Bar & Status */}
                        <td className="py-3.5 px-5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700">{pct}%</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isStarted
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-100 text-slate-600'
                              }`}>
                                {isCompleted ? 'Completed' : isStarted ? 'In Progress' : 'Not Started'}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Activities Done */}
                        <td className="py-3.5 px-5 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 text-xs">
                            <MdAssignment className="text-purple-600" />
                            {item.activities_completed || 0}
                          </span>
                        </td>

                        {/* Quizzes Passed */}
                        <td className="py-3.5 px-5 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 text-xs">
                            <MdQuiz className="text-amber-500" />
                            {item.quizzes_passed || 0}
                          </span>
                        </td>

                        {/* Avg Scores */}
                        <td className="py-3.5 px-5 text-center text-xs">
                          <div className="font-bold text-emerald-600">
                            {item.avg_quiz_score ? `${item.avg_quiz_score}% (Quiz)` : '—'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {item.avg_activity_score ? `${item.avg_activity_score}% (Act)` : ''}
                          </div>
                        </td>

                        {/* Action: Profile */}
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            to={`/instructor/students/${item.student_id}`}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1"
                          >
                            <MdPerson /> Profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
