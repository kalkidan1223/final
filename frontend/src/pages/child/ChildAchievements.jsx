import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

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

function playAchievementSound() {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880; // A5
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    // Audio not supported
  }
}

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
      setAchievements(res.data.badges || res.data.achievements || []);
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
        {achievements.map((a, index) => (
          <div
            key={a.id}
            className={`rounded-2xl p-6 border transition-all duration-300 ${
              a.earned
                ? `bg-gradient-to-br ${a.color} text-white shadow-xl border-transparent hover:scale-105 hover:shadow-2xl animate-slide-up`
                : 'bg-white border-gray-200 opacity-70 hover:opacity-100 hover:scale-105 animate-slide-up'
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
            onMouseEnter={() => a.earned && playAchievementSound()}
          >
            <div className="flex items-start gap-4">
              <span className={`text-4xl ${a.earned ? 'animate-pop' : 'grayscale'}`} aria-hidden="true">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">{a.name}</h3>
                <p className={`text-sm ${a.earned ? 'text-white/90' : 'text-gray-500'}`}>{a.description}</p>
              </div>
            </div>
            {a.earned ? (
              <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-bold badge-shine">
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