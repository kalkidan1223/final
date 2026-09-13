import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const ACHIEVEMENTS = [
  { id: 'first_lesson', name: 'First Lesson', icon: '🌟', description: 'Complete your first lesson', color: 'from-yellow-400 to-orange-400' },
  { id: 'five_activities', name: 'Activity Star', icon: '✨', description: 'Complete 5 activities', color: 'from-green-400 to-teal-400' },
  { id: 'ten_activities', name: 'Super Learner', icon: '🚀', description: 'Complete 10 activities', color: 'from-blue-400 to-indigo-400' },
  { id: 'quiz_master', name: 'Quiz Master', icon: '🧠', description: 'Score 90%+ on a quiz', color: 'from-purple-400 to-fuchsia-400' },
  { id: 'perfect_score', name: 'Perfect Score', icon: '💯', description: 'Get 100% on a quiz', color: 'from-pink-400 to-rose-400' },
  { id: 'course_explorer', name: 'Course Explorer', icon: '🗺️', description: 'Start 3 different courses', color: 'from-cyan-400 to-sky-400' },
  { id: 'quiz_three', name: 'Quiz Enthusiast', icon: '📝', description: 'Take 3 quizzes', color: 'from-amber-400 to-yellow-500' },
];

export default function ChildAchievements() {
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/child/achievements');
      setAchievements(res.data.achievements || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading achievements... 🏆</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
        <p className="text-red-700 font-medium flex items-center gap-2">
          <span>⚠️</span> {error}
        </p>
      </div>
    );
  }

  const earned = achievements.filter(a => a.earned);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 rounded-3xl p-8 shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-2">My Achievements 🏆</h1>
        <p className="text-xl text-white/90">
          You've earned {earned.length} of {achievements.length} badges!
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`rounded-2xl p-6 border transition ${
              a.earned
                ? `bg-gradient-to-br ${a.color} text-white shadow-xl border-transparent`
                : 'bg-white border-gray-200 opacity-70'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className={`text-4xl ${a.earned ? '' : 'grayscale'}`} aria-hidden="true">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">{a.name}</h3>
                <p className={`text-sm ${a.earned ? 'text-white/90' : 'text-gray-500'}`}>{a.description}</p>
              </div>
            </div>
            {a.earned ? (
              <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                <span>✅</span> Earned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500">
                <span>🔒</span> Locked
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Keep going!</h2>
        <p className="text-gray-600 mb-6">Every activity and quiz you complete earns you a badge.</p>
        <Link to="/child/activities" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-teal-600 transition">
          <span>🎯</span> Try an Activity
        </Link>
      </div>
    </div>
  );
}