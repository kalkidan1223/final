import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  MdTrendingUp,
  MdSchool,
  MdCheckCircle,
  MdQuiz,
  MdAssignment,
  MdLocalFireDepartment,
  MdEmojiEvents,
  MdArrowForward,
} from 'react-icons/md';

export default function ParentProgress() {
  const { selectedChildId, childrenList } = useOutletContext() || {};
  const [currentChildId, setCurrentChildId] = useState(selectedChildId || (childrenList?.[0]?.id?.toString() || ''));
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    if (selectedChildId) {
      setCurrentChildId(selectedChildId);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (currentChildId) {
      fetchProgress(currentChildId);
    } else if (childrenList?.length > 0) {
      setCurrentChildId(childrenList[0].id.toString());
      fetchProgress(childrenList[0].id.toString());
    } else {
      setLoading(false);
    }
  }, [currentChildId, childrenList]);

  async function fetchProgress(childId) {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/parent/children/${childId}/progress`);
      setProgressData(res.data?.progress || {});
    } catch (err) {
      console.error('Failed to load child progress:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedChild = childrenList?.find((c) => c.id.toString() === currentChildId?.toString());
  const overall = progressData?.overall || {};
  const courses = progressData?.courses || [];
  const activities = progressData?.activities || {};
  const quizzes = progressData?.quizzes || {};
  const streak = progressData?.learning_streak || 0;
  const recentActivity = progressData?.recent_activity || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header & Child Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdTrendingUp className="text-blue-600 text-3xl" />
            <span>Learning Progress</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor course completion, activity submissions, and learning milestones.
          </p>
        </div>

        {childrenList?.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Child:</span>
            <select
              value={currentChildId}
              onChange={(e) => setCurrentChildId(e.target.value)}
              className="bg-transparent text-sm font-extrabold text-slate-800 focus:outline-none"
            >
              {childrenList.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading learning progress...</span>
        </div>
      ) : !selectedChild ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
          No children registered yet. Please add a child from the "My Children" page.
        </div>
      ) : (
        <>
          {/* ── Key Metrics Overview ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Overall Progress */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Completion</div>
              <div className="text-3xl font-black text-purple-700">{overall.avg_completion || 0}%</div>
              <div className="text-[11px] text-slate-400">Across enrolled courses</div>
            </div>

            {/* Lessons Completed */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lessons Done</div>
              <div className="text-3xl font-black text-emerald-600">{overall.completed_lessons || 0}</div>
              <div className="text-[11px] text-slate-400">Completed lessons</div>
            </div>

            {/* Activities Score */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activities Avg</div>
              <div className="text-3xl font-black text-blue-600">
                {activities.avg_score ? `${activities.avg_score}%` : '—'}
              </div>
              <div className="text-[11px] text-slate-400">{activities.total_submitted || 0} submitted</div>
            </div>

            {/* Learning Streak */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Learning Streak</div>
              <div className="text-3xl font-black text-amber-500 flex items-center gap-1">
                <MdLocalFireDepartment />
                <span>{streak} Days</span>
              </div>
              <div className="text-[11px] text-slate-400">Consistent learning</div>
            </div>
          </div>

          {/* ── Course-by-Course Progress ── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-900">Course Progress Breakdown</h3>
                <p className="text-xs text-slate-500">Progress across all subjects assigned to {selectedChild.full_name}</p>
              </div>
              <Link
                to={`/parent/children/${selectedChild.id}`}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View Full Details</span>
                <MdArrowForward />
              </Link>
            </div>

            {courses.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No assigned courses found for this age group.</p>
            ) : (
              <div className="space-y-4">
                {courses.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <span className="font-extrabold text-base text-slate-900">{c.title}</span>
                        <span className="text-xs text-slate-400 ml-2">Instructor: {c.instructor_name}</span>
                      </div>
                      <div className="text-xs font-extrabold text-blue-600">
                        {c.completion_percentage || 0}% Complete • {c.completed_lessons || 0} of {c.total_lessons || 0} Lessons
                      </div>
                    </div>

                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${c.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Recent Activity Feed ── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">Recent Learning Sessions</h3>
              <p className="text-xs text-slate-500">Timeline of lessons accessed by {selectedChild.full_name}</p>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No recent lesson sessions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-800">{act.title}</div>
                      <div className="text-xs text-slate-500">{act.course_title}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-600 block">
                        {act.progress || 0}% Progress
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {act.activity_date ? new Date(act.activity_date).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
