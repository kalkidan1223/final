import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import EthiopianChildHome from '../../components/child/EthiopianChildHome';
import GamificationPanel from '../../components/child/GamificationPanel';

/** Play interactive sound effects */
function playClickSound() {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not supported
  }
}

function playSuccessSound() {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 523.25;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio not supported
  }
}

export default function ChildDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axiosClient.get('/child/dashboard');
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please log in to continue');
      } else {
        setError(err.response?.data?.error || 'Oops! We could not load your learning space. Please try again!');
      }
    } finally {
      setLoading(false);
    }
  };

  const child = data?.child || {};
  const stats = data?.stats || {};
  const continueLearning = data?.continue_learning;
  const courses = data?.courses || [];
  const todaysActivities = data?.todays_activities || [];
  const streakDays = data?.learning_streak || 0;
  const achievements = data?.achievements || [];
  const homePins = data?.home_pins || [];

  // Age group check: 5-9 = Early Learner, 10-12 = Independent Student
  const isEarlyLearner = child.is_early_learner !== undefined
    ? child.is_early_learner
    : child.age
      ? child.age <= 9
      : true;

  // The early learner screen owns its own loading, error and voice handling,
  // so it is mounted before either of those guard clauses below.
  if (isEarlyLearner) {
    return <EthiopianChildHome data={data} loading={loading} error={error} onRetry={fetchDashboard} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl animate-bounce">🎨</div>
        <div className="text-xl font-extrabold text-purple-700 animate-pulse">
          Opening your fun learning world... ✨
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error === 'Please log in to continue';
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center max-w-lg mx-auto my-12 shadow-sm">
        <span className="text-4xl block mb-2">{isAuthError ? '🔐' : '🎈'}</span>
        <h3 className="text-lg font-black text-rose-800 mb-2">{isAuthError ? 'Please Log In' : 'Oops! Something went wrong'}</h3>
        <p className="text-sm text-rose-600 mb-4">{error}</p>
        {isAuthError ? (
          <Link
            to="/login"
            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl shadow-md hover:scale-105 transition active:scale-95 inline-block"
          >
            Go to Login →
          </Link>
        ) : (
          <button
            onClick={fetchDashboard}
            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl shadow-md hover:scale-105 transition active:scale-95"
          >
            Try Again 🔄
          </button>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: INDEPENDENT STUDENT DASHBOARD (AGES 10 - 12)
  // Full student dashboard with course cards, progress bars, and metrics
  // =========================================================================
  const totalXP = data?.total_xp ?? (
    ((stats.completed_activities || 0) * 20) +
    ((stats.completed_quizzes || 0) * 50) +
    ((stats.watched_videos || 0) * 15) +
    ((streakDays || 0) * 30) +
    (achievements.length * 75)
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. Welcome Section with Learning Streak - Like Reference */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">
              {child.full_name || 'Student'}! 👋
            </h1>
            <p className="text-sm sm:text-base font-semibold text-white/90 mt-1">
              Welcome back to your learning adventure!
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
            <span className="text-2xl animate-pulse">🔥</span>
            <div>
              <div className="text-xs font-bold uppercase">Learning Streak</div>
              <div className="text-xl font-black">{streakDays} Days</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Continue Learning - Simpler Card Like Reference */}
      {continueLearning && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-800">{continueLearning.course_title}</h2>
              <p className="text-sm font-bold text-slate-500">
                Lesson {continueLearning.order_index}: {continueLearning.title}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-purple-600">{Math.round(continueLearning.lesson_progress || 0)}%</div>
              <div className="text-xs font-bold text-slate-500">Complete</div>
            </div>
          </div>
          <div className="w-full bg-purple-100 h-3 rounded-full overflow-hidden mb-4">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(continueLearning.lesson_progress || 10, 15)}%` }}
            />
          </div>
          <Link
            to={`/child/lessons/${continueLearning.id}`}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-xl text-center shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <span>Continue Learning</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* 3. Quick Stats Grid - Like Reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-purple-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
            📚
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.total_courses || 0}</div>
            <div className="text-xs font-bold text-slate-500">My Courses</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-pink-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center text-2xl">
            🎯
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.completed_activities || 0}</div>
            <div className="text-xs font-bold text-slate-500">Activities Done</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-cyan-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-2xl">
            📝
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.completed_quizzes || 0}</div>
            <div className="text-xs font-bold text-slate-500">Quizzes Taken</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-amber-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
            🎬
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.watched_videos || 0}</div>
            <div className="text-xs font-bold text-slate-500">Videos Watched</div>
          </div>
        </div>
      </div>

      {/* Gamification Panel - Like Reference with Level & XP */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg">
              ⭐
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">LEVEL 2 Learner</div>
              <div className="text-sm font-bold text-purple-600">{totalXP} XP Total Points</div>
            </div>
          </div>
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
              <span>Progress to Level 3</span>
              <span>75%</span>
            </div>
            <div className="w-full bg-purple-100 h-3 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
        </div>

        <div className="border-t-2 border-purple-100 pt-4">
          <h3 className="text-lg font-black text-slate-800 mb-3">WAYS TO EARN XP</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-purple-50 rounded-xl p-3 text-center border-2 border-purple-200">
              <div className="text-2xl mb-1">📚</div>
              <div className="text-sm font-bold text-slate-800">Complete Lesson</div>
              <div className="text-xs font-black text-purple-600">+50 XP</div>
            </div>
            <div className="bg-pink-50 rounded-xl p-3 text-center border-2 border-pink-200">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-sm font-bold text-slate-800">Finish Activity</div>
              <div className="text-xs font-black text-pink-600">+20 XP</div>
            </div>
            <div className="bg-cyan-50 rounded-xl p-3 text-center border-2 border-cyan-200">
              <div className="text-2xl mb-1">📝</div>
              <div className="text-sm font-bold text-slate-800">Pass Quiz</div>
              <div className="text-xs font-black text-cyan-600">+30 XP</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center border-2 border-amber-200">
              <div className="text-2xl mb-1">🎬</div>
              <div className="text-sm font-bold text-slate-800">Watch Video</div>
              <div className="text-xs font-black text-amber-600">+15 XP</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. My Courses - Simpler Cards Like Reference */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800">My Courses</h2>
          <Link
            to="/child/courses"
            className="text-sm font-bold text-purple-600 hover:underline"
          >
            See All →
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border-2 border-purple-100 shadow-md">
            <span className="text-5xl block mb-2">📚</span>
            <h3 className="text-lg font-black text-slate-800 mb-1">No courses assigned yet</h3>
            <p className="text-sm text-slate-500">Your teachers will assign your courses soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-md border-2 border-purple-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">📚</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-black text-slate-800 line-clamp-1">{course.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {course.instructor_name || 'Teacher'}
                  </p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>Progress</span>
                      <span>{course.overall_progress || 0}%</span>
                    </div>
                    <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full"
                        style={{ width: `${course.overall_progress || 0}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    to={`/child/courses/${course.id}`}
                    className="w-full mt-4 py-2 bg-purple-600 text-white font-black rounded-lg text-center text-sm hover:bg-purple-700 transition cursor-pointer block"
                  >
                    {course.overall_progress > 0 ? 'Continue Learning' : 'Start Course'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Today's Activities - Simpler Like Reference */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800">Today's Activities</h2>
          <Link
            to="/child/activities"
            className="text-sm font-bold text-purple-600 hover:underline"
          >
            View All →
          </Link>
        </div>

        {todaysActivities.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border-2 border-purple-100 shadow-md">
            <span className="text-4xl">🎉</span>
            <p className="text-sm font-bold text-slate-700 mt-2">
              Awesome work! You've finished your activities for now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysActivities.map((act) => (
              <div
                key={act.id}
                className="bg-white rounded-xl p-4 border-2 border-purple-100 shadow-md flex items-center justify-between gap-3 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-xl">
                    {act.activity_type === 'writing' ? '✏️' :
                     act.activity_type === 'matching' ? '🔗' :
                     act.activity_type === 'reading' ? '📖' :
                     act.activity_type === 'listening' ? '🎧' : '📝'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-800 truncate">{act.title}</h4>
                    <p className="text-xs text-purple-600 font-semibold truncate">{act.course_title}</p>
                  </div>
                </div>
                <Link
                  to={`/child/activities/${act.id}`}
                  className="px-3 py-2 bg-purple-600 text-white font-black rounded-lg text-xs hover:bg-purple-700 transition"
                >
                  Start →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Achievements - Simple Badge Row Like Reference */}
      {achievements.length > 0 && (
        <section className="bg-white rounded-xl shadow-md border-2 border-purple-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-slate-800">Recent Achievements</h2>
            <Link
              to="/child/achievements"
              className="text-sm font-bold text-purple-600 hover:underline"
            >
              See All →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {achievements.slice(0, 4).map((ach) => (
              <div
                key={ach.id}
                className="flex-shrink-0 bg-purple-50 rounded-xl p-3 text-center border-2 border-purple-200 min-w-[100px]"
              >
                <div className="text-3xl mb-1">{ach.icon}</div>
                <div className="text-xs font-black text-slate-800">{ach.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
