import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildCourseDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourseDetail();
  }, [id]);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/courses/${id}`);
      setCourse(response.data.course);
      setLessons(response.data.lessons || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load course details. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl animate-bounce">📖</div>
        <p className="text-lg font-black text-purple-700 animate-pulse">Loading course lessons... ✨</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-lg mx-auto my-12">
        <Link to="/child/courses" className="inline-flex items-center text-purple-600 hover:text-purple-700 font-bold">
          <span>←</span> Back to Courses
        </Link>
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl text-center">
          <span className="text-4xl block mb-2">⚠️</span>
          <p className="text-rose-700 font-bold text-sm mb-4">{error}</p>
          <button
            onClick={fetchCourseDetail}
            className="px-6 py-2 bg-purple-600 text-white font-bold rounded-2xl shadow hover:bg-purple-700 transition"
          >
            Try Again 🔄
          </button>
        </div>
      </div>
    );
  }

  const overallProgress = course?.overall_progress || 0;
  const completedCount = course?.completed_lessons || 0;
  const totalLessons = course?.total_lessons || lessons.length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Back Link */}
      <div>
        <Link
          to="/child/courses"
          className="inline-flex items-center gap-1.5 text-purple-700 hover:text-purple-800 font-bold text-sm bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-purple-100 transition hover:scale-105"
        >
          <span>←</span> Back to My Courses
        </Link>
      </div>

      {/* Course Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl text-white shadow-xl p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {course?.age_group_name || 'Age Group'}
              </span>
              {(course?.assigned_grade || course?.grade) && (
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black">
                  Grade {course.assigned_grade || course.grade}
                </span>
              )}
              {(course?.assigned_section || course?.section) && (
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black">
                  Section {course.assigned_section || course.section}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{course?.title}</h1>
            <p className="text-sm sm:text-base text-purple-100 font-medium">
              Instructor: <strong className="text-white">{course?.instructor_name || 'Sara'}</strong>
            </p>
            {course?.description && (
              <p className="text-xs sm:text-sm text-purple-100 line-clamp-2 pt-1">{course.description}</p>
            )}
          </div>

          {/* Progress Circular / Ring Stat */}
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-5 text-center min-w-[200px] flex flex-col items-center gap-2 shadow-lg">
            <div className="text-xs font-black uppercase tracking-wider text-purple-200">Course Progress</div>
            <div className="text-3xl sm:text-4xl font-black text-white">{overallProgress}%</div>
            <div className="text-xs font-semibold text-purple-100">
              {completedCount} of {totalLessons} Lessons Done
            </div>
            <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-amber-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sequential Lessons List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">Course Lessons</h2>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-purple-100">
            {lessons.length} Total Lessons
          </span>
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-purple-100 shadow-sm max-w-lg mx-auto">
            <span className="text-5xl block mb-3">🌱</span>
            <h3 className="text-lg font-black text-slate-800 mb-1">No lessons added yet</h3>
            <p className="text-sm text-slate-500">Your instructor is preparing fun lessons for this course!</p>
          </div>
        ) : (
          <div className="space-y-4" role="list" aria-label="Course lessons list">
            {lessons.map((lesson, idx) => {
              const isCompleted = lesson.access_state === 'completed';
              const isInProgress = lesson.access_state === 'in-progress';
              const isLocked = lesson.access_state === 'locked';

              return (
                <div
                  key={lesson.id}
                  className={`bg-white rounded-3xl p-5 border transition-all duration-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isLocked
                      ? 'border-gray-200 opacity-60 bg-gray-50'
                      : isCompleted
                      ? 'border-emerald-200 hover:shadow-md hover:border-emerald-300'
                      : isInProgress
                      ? 'border-blue-300 hover:shadow-md hover:border-blue-400 bg-blue-50/20'
                      : 'border-purple-100 hover:shadow-md hover:border-purple-300'
                  }`}
                >
                  {/* Lesson Meta */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Number Badge */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-inner ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isInProgress
                          ? 'bg-blue-100 text-blue-700 animate-pulse'
                          : isLocked
                          ? 'bg-gray-200 text-gray-500'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {isCompleted ? '✓' : isLocked ? '🔒' : lesson.order_index || idx + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                          Lesson {lesson.order_index || idx + 1}
                        </span>

                        {/* Status Badge */}
                        {isCompleted && (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <span>✓</span> Completed
                          </span>
                        )}
                        {isInProgress && (
                          <span className="bg-blue-100 text-blue-800 text-[11px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                            <span>▶</span> In Progress
                          </span>
                        )}
                        {isLocked && (
                          <span className="bg-gray-200 text-gray-700 text-[11px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <span>🔒</span> Complete previous lesson to unlock
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-slate-800 truncate">
                        {lesson.title}
                      </h3>

                      {lesson.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{lesson.description}</p>
                      )}

                      {/* Content Pill Count */}
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400 pt-1">
                        {lesson.material_count > 0 && <span>📄 {lesson.material_count} Materials</span>}
                        {lesson.video_count > 0 && <span>🎬 {lesson.video_count} Videos</span>}
                        {lesson.activity_count > 0 && <span>🎯 {lesson.activity_count} Activities</span>}
                        {lesson.quiz_count > 0 && <span>📝 {lesson.quiz_count} Quizzes</span>}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="w-full sm:w-auto flex-shrink-0">
                    {isLocked ? (
                      <button
                        disabled
                        className="w-full sm:w-auto px-5 py-2.5 bg-gray-200 text-gray-500 font-bold rounded-2xl text-xs sm:text-sm cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <span>🔒</span> Locked
                      </button>
                    ) : (
                      <Link
                        to={`/child/lessons/${lesson.id}`}
                        className={`w-full sm:w-auto px-6 py-2.5 font-black rounded-2xl text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 ${
                          isCompleted
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : isInProgress
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                        }`}
                      >
                        <span>{isCompleted ? 'Review Lesson' : isInProgress ? 'Continue' : 'Start Lesson'}</span>
                        <span>➔</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}