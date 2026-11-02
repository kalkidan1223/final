import { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import axiosClient, { setActiveChildId } from '../../api/axiosClient';
import {
  MdFamilyRestroom,
  MdSchool,
  MdCheckCircle,
  MdAssignment,
  MdPendingActions,
  MdQuiz,
  MdTrendingUp,
  MdPlayCircleFilled,
  MdArrowForward,
  MdFeedback,
  MdEmojiEvents,
  MdLocalFireDepartment,
  MdAdd,
  MdInfo,
  MdLightbulb,
  MdCampaign,
} from 'react-icons/md';

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError('');
      const res = await axiosClient.get('/parent/dashboard-stats');
      setStatsData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('Could not load dashboard information. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }

  const handleLaunchChildPortal = (childId) => {
    setActiveChildId(childId);
    navigate('/child');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 font-semibold text-sm">Loading your family learning overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-lg mx-auto my-8">
        <span className="text-3xl block mb-2">⚠️</span>
        <h3 className="font-bold text-rose-800 text-base mb-1">Something went wrong</h3>
        <p className="text-rose-600 text-xs mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition"
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  const stats = statsData?.stats || {};
  const children = statsData?.children_summary || [];
  const recentFeedback = statsData?.recent_feedback || [];
  const announcements = statsData?.announcements || [];

  const totalChildren = stats.children?.total_children || children.length;
  const parentManagedCount = stats.children?.parent_managed || 0;
  const pendingActivities = stats.activities?.pending_activities || 0;
  const completedLessons = stats.progress?.completed_lessons || 0;
  const avgProgress = stats.progress?.avg_progress || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ── Pending Approvals Banner ── */}
      {stats.children?.pending_approvals > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-sm">
              ⏳
            </div>
            <div>
              <h4 className="font-black text-amber-950 text-sm">
                Child Registration Awaiting Approval
              </h4>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                {stats.children.pending_approvals} child registration request{stats.children.pending_approvals > 1 ? 's are' : ' is'} currently being reviewed by school administration.
              </p>
            </div>
          </div>
          <Link
            to="/parent/children"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition whitespace-nowrap"
          >
            View Children
          </Link>
        </div>
      )}

      {/* ── Top Hero Card ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
              <span>👨‍👧‍👦</span> Family Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Welcome to Your Parent Portal
            </h1>
            <p className="text-sm sm:text-base text-blue-100 max-w-xl font-medium">
              Monitor learning progress, review activities and quiz scores, and support your children's educational journey.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/parent/children"
              className="px-4 py-2.5 bg-white text-blue-700 font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:bg-blue-50 transition flex items-center gap-1.5"
            >
              <MdAdd className="text-lg" />
              <span>Add Child</span>
            </Link>
            {children.length > 0 && (
              <button
                onClick={() => handleLaunchChildPortal(children[0].id)}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <MdPlayCircleFilled className="text-lg text-slate-900" />
                <span>Learn with Child</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── School Announcements ── */}
      {announcements.length > 0 && (
        <section aria-label="School Announcements" className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-lg">
              <MdCampaign />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                School Announcements
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official notices from school administration</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                  ann.priority === 'urgent'
                    ? 'border-rose-200 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/20'
                    : ann.priority === 'important'
                    ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        ann.priority === 'urgent'
                          ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200'
                          : ann.priority === 'important'
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {ann.priority === 'urgent' ? 'Urgent Notice' : ann.priority === 'important' ? 'Important' : 'Announcement'}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-400 font-medium">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {ann.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {ann.message || ann.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── KPI Summary Cards (Interactive with Hover Lift) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Children Card */}
        <Link
          to="/parent/children"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center gap-4 cursor-pointer group"
          title="Click to view all children"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
            <MdFamilyRestroom />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {totalChildren}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">My Children</div>
          </div>
        </Link>

        {/* Lessons Completed */}
        <Link
          to="/parent/progress"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center gap-4 cursor-pointer group"
          title="Click to view progress records"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
            <MdCheckCircle />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {completedLessons}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Lessons Done</div>
          </div>
        </Link>

        {/* Pending Activities */}
        <Link
          to="/parent/activities"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center gap-4 cursor-pointer group"
          title="Click to view activities awaiting review"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
            <MdPendingActions />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {pendingActivities}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Pending Review</div>
          </div>
        </Link>

        {/* Overall Progress */}
        <Link
          to="/parent/progress"
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center gap-4 cursor-pointer group"
          title="Click to view detailed curriculum progress"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
            <MdTrendingUp />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {avgProgress}%
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Overall Progress</div>
          </div>
        </Link>

        {/* Parent-Managed Guidance */}
        <Link
          to="/parent/children"
          className="col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/60 hover:border-purple-400 dark:hover:border-purple-600 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center gap-3 cursor-pointer group"
          title="Click to manage children"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
            <MdLightbulb />
          </div>
          <div>
            <div className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wide">
              Parent-Managed
            </div>
            <div className="text-xs text-purple-800 dark:text-purple-300 font-medium">
              {parentManagedCount} {parentManagedCount === 1 ? 'child' : 'children'} under 10
            </div>
          </div>
        </Link>
      </div>

      {/* ── MY CHILDREN (Section 5, 12, 13) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>MY CHILDREN</span>
              <span className="text-xs px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-bold">
                {children.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Manage your children's profiles and launch their learning portal
            </p>
          </div>

          <Link
            to="/parent/children"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition"
          >
            <span>View All Children</span>
            <MdArrowForward />
          </Link>
        </div>

        {children.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-sm space-y-4">
            <div className="text-5xl">🧒</div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">You haven't added a child yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Add your child to enroll them in age-appropriate courses, interactive lessons, worksheets, and quizzes.
            </p>
            <Link
              to="/parent/children"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition"
            >
              <MdAdd className="text-lg" />
              <span>+ Add Child</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => {
              const age = calculateAge(child.date_of_birth);
              const isParentManaged = !child.user_id;
              const isPending = child.account_status === 'pending';
              const isRejected = child.account_status === 'rejected';

              return (
                <div
                  key={child.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between space-y-5 group"
                >
                  {/* Card Header: Avatar & Info */}
                  <div>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                        {child.profile_picture ? (
                          <img
                            src={child.profile_picture}
                            alt={child.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{child.full_name?.charAt(0) || 'C'}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {child.full_name}
                          </h3>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Age: <strong className="text-slate-700 dark:text-slate-200">{age ?? '—'}</strong> •{' '}
                          <span className="text-slate-600 dark:text-slate-300">{child.grade_level_name || 'Primary'}</span>
                        </div>

                        {/* Account Type & Status Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {isParentManaged ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                              <span>🧸</span> Parent Managed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              <span>🎓</span> Independent Student
                            </span>
                          )}

                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                              ⏳ Pending Admin Review
                            </span>
                          )}

                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                              ❌ Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-300">Learning Progress</span>
                        <span className="font-black text-blue-600 dark:text-blue-400">{child.avg_progress || 0}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${child.avg_progress || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats Grid (Interactive Links) */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      <Link
                        to="/parent/progress"
                        className="bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-transparent hover:border-blue-200 dark:hover:border-slate-700 transition cursor-pointer"
                        title="View enrolled courses and topics"
                      >
                        <div className="text-base font-black text-slate-800 dark:text-white">
                          {child.courses_count || 0}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Courses</div>
                      </Link>
                      <Link
                        to="/parent/progress"
                        className="bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-transparent hover:border-emerald-200 dark:hover:border-slate-700 transition cursor-pointer"
                        title="View completed lessons"
                      >
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          {child.completed_lessons || 0}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Lessons Done</div>
                      </Link>
                    </div>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="space-y-2 pt-2">
                    {isPending ? (
                      <div className="w-full py-2.5 px-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 text-center select-none">
                        <span className="animate-pulse">⏳</span>
                        <span>Waiting for Admin Approval</span>
                      </div>
                    ) : (
                      <>
                        {age !== null && age <= 9 ? (
                          <button
                            type="button"
                            onClick={() => handleLaunchChildPortal(child.id)}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
                          >
                            <MdPlayCircleFilled className="text-base text-slate-900" />
                            <span>Learn with Child (Ages 5–9)</span>
                          </button>
                        ) : (
                          <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
                            <span className="text-base">🎓</span>
                            <div>
                              <strong className="block font-bold">Independent Student (Age 10–12)</strong>
                              <span className="text-slate-600 dark:text-slate-300">Learns independently using their own student credentials.</span>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => navigate(`/parent/children/${child.id}`)}
                          className="w-full py-2 px-3 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-800 dark:text-slate-100 dark:hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span>View Detailed Records</span>
                          <MdArrowForward className="text-sm opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Bottom 2 Columns: Recent Instructor Feedback & Support Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Instructor Feedback */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <MdFeedback className="text-blue-600 dark:text-blue-400 text-xl" />
              <span>Recent Instructor Feedback</span>
            </h2>
            <Link to="/parent/feedback" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              View All ➔
            </Link>
          </div>

          {recentFeedback.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              <span className="text-3xl block mb-1">📝</span>
              No instructor feedback received yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentFeedback.map((fb, idx) => (
                <Link
                  key={idx}
                  to="/parent/feedback"
                  className="block p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2 hover:bg-blue-50/50 dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-700 transition cursor-pointer"
                  title="Click to view feedback details"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-slate-800 dark:text-white">
                      {fb.child_name} • <span className="text-blue-600 dark:text-blue-400">{fb.activity_title}</span>
                    </div>
                    {fb.score !== null && fb.score !== undefined && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-full font-black text-xs">
                        Score: {fb.score}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{fb.feedback}"</p>
                  <div className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center justify-between">
                    <span>Teacher: {fb.instructor_name || 'Instructor'}</span>
                    <span>{fb.date ? new Date(fb.date).toLocaleDateString() : ''}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Parent Guidance & Quick Support Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-indigo-800/40 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-indigo-300">
              <MdInfo className="text-sm" />
              <span>Parent Support Guide</span>
            </div>

            <h3 className="text-xl font-black">Supporting Younger Children (Ages 5–9)</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Young children learn best through interactive guidance. Use the <strong>"Learn with Child"</strong> button to open their visual portal together, listen to pronunciation audio, trace letters, and complete fun matching exercises.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-xs text-indigo-300">
              Need help or have questions?
            </div>
            <Link
              to="/parent/help"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Help & Support Guide ➔
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
