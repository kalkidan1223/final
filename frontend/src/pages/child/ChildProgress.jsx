import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildProgress() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/child/progress');
      setProgress(response.data.course_progress || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 80) return 'from-green-400 to-green-600';
    if (percent >= 50) return 'from-yellow-400 to-orange-500';
    if (percent >= 20) return 'from-blue-400 to-purple-500';
    return 'from-gray-400 to-gray-500';
  };

  const getEmoji = (percent) => {
    if (percent >= 90) return '🌟';
    if (percent >= 70) return '🎉';
    if (percent >= 50) return '👍';
    if (percent >= 20) return '📖';
    return '🌱';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading your progress... 📊</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <p className="text-red-700 font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </p>
        </div>
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 text-white text-center">
          <h1 className="text-4xl font-bold mb-2">Your Learning Progress 📊</h1>
          <p className="text-xl opacity-90">Start learning to see your progress here!</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <span className="text-6xl block mb-4">📚</span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Progress Yet</h2>
          <p className="text-gray-600 text-lg mb-6">You haven't started any courses yet.</p>
          <Link to="/child/courses" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition">
            <span>📚</span> Explore Courses
          </Link>
        </div>
      </div>
    );
  }

  // Calculate overall stats
  const totalLessons = progress.reduce((sum, c) => sum + (c.total_lessons || 0), 0);
  const totalActivities = progress.reduce((sum, c) => sum + (c.total_activities || 0), 0);
  const totalQuizzes = progress.reduce((sum, c) => sum + (c.total_quizzes || 0), 0);
  const completedActivities = progress.reduce((sum, c) => sum + (c.completed_activities || 0), 0);
  const completedQuizzes = progress.reduce((sum, c) => sum + (c.completed_quizzes || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-3xl p-8 shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-2">Your Learning Progress 📊</h1>
        <p className="text-xl text-white/90">See how far you've come!</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Lessons"
          value={totalLessons}
          icon="📖"
          gradient="from-blue-400 to-blue-600"
        />
        <StatCard
          label="Activities Done"
          value={completedActivities}
          icon="✏️"
          gradient="from-green-400 to-green-600"
          subLabel={`of ${totalActivities}`}
        />
        <StatCard
          label="Quizzes Done"
          value={completedQuizzes}
          icon="📝"
          gradient="from-purple-400 to-purple-600"
          subLabel={`of ${totalQuizzes}`}
        />
        <StatCard
          label="Courses Started"
          value={progress.filter(c => (c.completed_activities || 0) > 0 || (c.completed_quizzes || 0) > 0).length}
          icon="📚"
          gradient="from-pink-400 to-pink-600"
          subLabel={`of ${progress.length}`}
        />
      </div>

      {/* Course Progress Cards */}
      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📚</span> Course Progress
        </h2>
        <div className="space-y-4">
          {progress.map((course) => {
            const totalItems = (course.total_activities || 0) + (course.total_quizzes || 0);
            const completedItems = (course.completed_activities || 0) + (course.completed_quizzes || 0);
            const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
            const color = getProgressColor(percent);
            const emoji = getEmoji(percent);

            return (
              <Link
                key={course.id}
                to={`/child/courses/${course.id}`}
                className="group block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200"
              >
                <div className="md:flex">
                  {/* Course Image */}
                  <div className="md:w-1/4 relative h-48 md:h-auto">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-5xl opacity-50">📚</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${color.replace('from-', 'bg-').replace(' to-', ' text-').replace('green-400 to-green-600', 'green-100 text-green-700').replace('yellow-400 to-orange-500', 'yellow-100 text-yellow-700').replace('blue-400 to-purple-500', 'blue-100 text-blue-700').replace('gray-400 to-gray-500', 'gray-100 text-gray-700')}`}>
                        {percent}% {emoji}
                      </span>
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="md:w-3/4 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition">
                        {course.title}
                      </h3>
                      <span className="text-3xl">{emoji}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-bold text-gray-800">{percent}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${percent}%` }}
                        >
                          <div className={`h-full ${color} rounded-full`} />
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-gray-800">{course.completed_activities || 0}</div>
                        <div className="text-gray-600">Activities</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-gray-800">{course.completed_quizzes || 0}</div>
                        <div className="text-gray-600">Quizzes</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-gray-800">{course.total_lessons || 0}</div>
                        <div className="text-gray-600">Lessons</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <span className="w-full block text-center px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition group-hover:scale-105">
                        Continue Learning →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Overall Progress Summary */}
      <section aria-labelledby="overall-heading" className="mt-8">
        <h2 id="overall-heading" className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📈</span> Overall Summary
        </h2>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-4xl font-bold text-blue-600 mb-2">{totalLessons}</div>
              <div className="text-gray-600">Total Lessons Available</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-4xl font-bold text-green-600 mb-2">{completedActivities + completedQuizzes}</div>
              <div className="text-gray-600">Total Completed</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {totalActivities + totalQuizzes > 0 ? Math.round(((completedActivities + completedQuizzes) / (totalActivities + totalQuizzes)) * 100) : 0}%
              </div>
              <div className="text-gray-600">Completion Rate</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, gradient, subLabel }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 border border-gray-100`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-xl ${gradient}`}>
          <span className="text-2xl" aria-hidden="true">{icon}</span>
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
      {subLabel && <div className="text-xs text-gray-400 mt-1">{subLabel}</div>}
    </div>
  );
}