import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdSchool, MdPeople, MdMenuBook, MdLibraryBooks, MdPending,
  MdArrowForward, MdOpenInNew, MdInfoOutline, MdAdd,
  MdAutoStories, MdExtension, MdQuiz, MdGrading, MdTrendingUp,
  MdCheckCircle, MdCancel, MdChildCare, MdUpload
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

function StatCard({ icon: Icon, label, value, color, to, badge }) {
  const colorMap = {
    indigo:  { bg: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' },
    amber:   { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
    rose:    { bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50' },
    sky:     { bg: 'bg-sky-600', text: 'text-sky-600', light: 'bg-sky-50' },
    violet:  { bg: 'bg-violet-600', text: 'text-violet-600', light: 'bg-violet-50' },
    purple:  { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
  };
  const theme = colorMap[color] || colorMap.indigo;

  const content = (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-3xl font-extrabold text-slate-800">{value ?? 0}</span>
            {badge && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 animate-pulse">
                {badge}
              </span>
            )}
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl ${theme.light} ${theme.text} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
          <Icon />
        </div>
      </div>
      {to && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-indigo-600 group-hover:text-indigo-800">
          <span>Manage</span>
          <MdArrowForward className="ml-1 text-sm group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );

  return to ? <Link to={to} className="block">{content}</Link> : content;
}

function CourseCard({ course }) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      {/* Top gradient stripe */}
      <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors">
              {course.course_title}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold border border-indigo-100/80">
                {course.age_group_name}
              </span>
              {course.grade && (
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                  Grade {course.grade}
                </span>
              )}
              {course.section && (
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                  Sec {course.section}
                </span>
              )}
            </div>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            course.course_status === 'published' || course.course_status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {course.course_status || 'active'}
          </span>
        </div>

        {course.course_description && (
          <p className="mt-3 text-xs text-slate-500 line-clamp-2">
            {course.course_description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2 text-center pt-3 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-2">
            <span className="text-base font-bold text-slate-800">{course.student_count ?? 0}</span>
            <p className="text-[10px] text-slate-500 font-medium">Students</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <span className="text-base font-bold text-slate-800">{course.lesson_count ?? 0}</span>
            <p className="text-[10px] text-slate-500 font-medium">Lessons</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <span className="text-base font-bold text-slate-800">{course.activity_count ?? 0}</span>
            <p className="text-[10px] text-slate-500 font-medium">Activities</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <span className={`text-base font-bold ${course.pending_count > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {course.pending_count ?? 0}
            </span>
            <p className="text-[10px] text-slate-500 font-medium">Pending</p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">{course.academic_year || 'Academic Year'}</span>
          <div className="flex items-center gap-2">
            <Link
              to={`/instructor/courses/${course.course_id}`}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              Open <MdArrowForward />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosClient.get('/instructor/dashboard');
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load dashboard statistics');
    } finally {
      setLoading(false);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const summary = data?.summary || {};
  const recentSubs = data?.recent_submissions || [];
  const recentQuizzes = data?.recent_quiz_results || [];
  const prog = data?.progress_overview || {};

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Hero Welcome Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-900 p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold backdrop-blur-md mb-2">
                <span>Ethiopian Primary Curriculum Hub</span> • <span>Ages 5–9</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {greeting}, {user?.full_name || 'Instructor'}! 👋
              </h1>
              <p className="mt-2 text-indigo-100 text-sm max-w-xl leading-relaxed">
                Welcome to your teaching hub. Manage course curricula, create interactive Fidel character exercises, grade child submissions, and follow your students' progress.
              </p>
            </div>

            {/* Quick action buttons on banner */}
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link
                to="/instructor/courses"
                className="bg-white text-indigo-800 hover:bg-indigo-50 font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md flex items-center gap-2"
              >
                <MdMenuBook className="text-lg" /> My Courses
              </Link>
              <Link
                to="/instructor/submissions"
                className="bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition backdrop-blur-sm border border-white/20 flex items-center gap-2"
              >
                <MdGrading className="text-lg" />
                <span>Grade Work</span>
                {summary.pending_submissions > 0 && (
                  <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {summary.pending_submissions}
                  </span>
                )}
              </Link>
              <Link
                to="/instructor/child-home"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition backdrop-blur-sm border border-white/10 flex items-center gap-2"
                title="Preview child learning space"
              >
                <MdChildCare className="text-lg" /> Child Space
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <span>⚡ Quick Actions:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/instructor/lessons"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold transition"
            >
              <MdAutoStories className="text-base" /> Browse Lessons
            </Link>
            <Link
              to="/instructor/materials"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold transition"
            >
              <MdLibraryBooks className="text-base" /> Learning Materials
            </Link>
            <Link
              to="/instructor/activities"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold transition"
            >
              <MdExtension className="text-base" /> Activities
            </Link>
            <Link
              to="/instructor/quizzes"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold transition"
            >
              <MdQuiz className="text-base" /> Quizzes
            </Link>
            <Link
              to="/instructor/progress"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
            >
              <MdTrendingUp className="text-base" /> Student Progress Matrix
            </Link>
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <span className="flex-1">{error}</span>
            <button onClick={loadDashboard} className="font-bold underline text-xs">Retry</button>
          </div>
        )}

        {/* Key Metrics Overview */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200/70 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
            <StatCard icon={MdSchool} label="Courses" value={summary.courses} color="indigo" to="/instructor/courses" />
            <StatCard icon={MdPeople} label="Students" value={summary.students} color="emerald" to="/instructor/students" />
            <StatCard icon={MdAutoStories} label="Lessons" value={summary.lessons} color="violet" to="/instructor/lessons" />
            <StatCard icon={MdLibraryBooks} label="Materials" value={summary.materials} color="sky" to="/instructor/materials" />
            <StatCard icon={MdExtension} label="Activities" value={summary.activities} color="purple" to="/instructor/activities" />
            <StatCard icon={MdQuiz} label="Quizzes" value={summary.quizzes} color="amber" to="/instructor/quizzes" />
            <StatCard
              icon={MdGrading}
              label="Pending"
              value={summary.pending_submissions}
              color="rose"
              to="/instructor/submissions"
              badge={summary.pending_submissions > 0 ? `${summary.pending_submissions} need review` : null}
            />
            <StatCard
              icon={MdTrendingUp}
              label="Avg Progress"
              value={`${summary.avg_score || 0}%`}
              color="emerald"
              to="/instructor/progress"
            />
          </div>
        )}

        {/* Main 2-column layout: Courses on left (or full), Submissions & Activity feed on right */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Teaching Courses (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MdMenuBook className="text-indigo-600" /> Assigned Teaching Courses
                </h2>
                <p className="text-xs text-slate-500">Curricula assigned by school administration</p>
              </div>
              <Link to="/instructor/courses" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View All <MdArrowForward />
              </Link>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2].map(i => <div key={i} className="h-64 bg-slate-200/70 rounded-2xl animate-pulse" />)}
              </div>
            ) : data?.courses?.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {data.courses.map(c => <CourseCard key={c.course_id} course={c} />)}
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 border-dashed p-8 text-center">
                <div className="text-4xl mb-2">📚</div>
                <h3 className="font-bold text-slate-800">No Courses Assigned Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your instructor profile is active, but you do not have any assigned courses yet. Contact the administrator to assign classes.
                </p>
              </div>
            )}

            {/* Overall Student Progress Widget */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MdTrendingUp className="text-emerald-600 text-lg" /> Classroom Progress Snapshot
                </h3>
                <Link to="/instructor/progress" className="text-xs font-semibold text-indigo-600 hover:underline">
                  Full Progress Matrix →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-2xl font-extrabold text-slate-800">{prog.active_students || 0}</p>
                  <p className="text-xs text-slate-500 font-medium">Active Learners</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-2xl font-extrabold text-emerald-700">{prog.completed_students || 0}</p>
                  <p className="text-xs text-emerald-600 font-medium">Completed Lessons</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <p className="text-2xl font-extrabold text-indigo-700">{prog.avg_progress || 0}%</p>
                  <p className="text-xs text-indigo-600 font-medium">Class Average Completion</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Classwide Mastery Rate</span>
                  <span>{prog.avg_progress || 0}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, prog.avg_progress || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pending Grading Queue & Recent Quiz Results */}
          <div className="space-y-6">
            {/* Pending Grading Queue */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MdGrading className="text-rose-500 text-lg" /> Submissions To Grade
                </h3>
                <Link to="/instructor/submissions" className="text-xs font-semibold text-indigo-600 hover:underline">
                  All ({summary.pending_submissions || 0})
                </Link>
              </div>

              {recentSubs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <MdCheckCircle className="text-3xl text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">All submissions graded!</p>
                  <p className="text-slate-400 mt-0.5">No pending student work waiting for review.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 -mx-2">
                  {recentSubs.map((sub) => (
                    <div key={sub.id} className="p-2.5 hover:bg-slate-50 rounded-xl transition flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">{sub.student_name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            sub.status === 'pending' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">{sub.activity_title}</p>
                        <p className="text-[10px] text-slate-400">{sub.course_title}</p>
                      </div>

                      <Link
                        to="/instructor/submissions"
                        className="shrink-0 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition"
                      >
                        {sub.status === 'pending' ? 'Grade' : 'View'}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Quiz Performance */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MdQuiz className="text-amber-500 text-lg" /> Recent Quiz Results
                </h3>
                <Link to="/instructor/results" className="text-xs font-semibold text-indigo-600 hover:underline">
                  View Analytics →
                </Link>
              </div>

              {recentQuizzes.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <p>No quiz attempts recorded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 -mx-2">
                  {recentQuizzes.map((q) => (
                    <div key={q.id} className="p-2.5 hover:bg-slate-50 rounded-xl transition flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">{q.student_name}</p>
                        <p className="text-xs text-slate-500 truncate">{q.quiz_title}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                          q.is_passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {q.percentage}% {q.is_passed ? '✓' : '✗'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {q.score}/{q.total_points} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}