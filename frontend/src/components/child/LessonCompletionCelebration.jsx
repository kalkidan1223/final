import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

export default function LessonCompletionCelebration({ lesson, progress, onContinue }) {
  const [achievements, setAchievements] = useState([]);
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    fetchNewAchievements();
    
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const fetchNewAchievements = async () => {
    try {
      const response = await axiosClient.get('/child/learning/achievements');
      // Get recent achievements (last hour)
      const recent = response.data.achievements?.filter(a => {
        const earnedTime = new Date(a.earned_at);
        const now = new Date();
        return (now - earnedTime) < 3600000; // 1 hour
      }) || [];
      setAchievements(recent);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 relative overflow-hidden">
      {/* Confetti Effect */}
      {confetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                background: ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#F38181'][Math.floor(Math.random() * 5)],
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>
      )}

      {/* Celebration Card */}
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-12 relative z-10 animate-scale-in">
        {/* Main Celebration */}
        <div className="text-center space-y-6">
          <div className="text-8xl sm:text-9xl animate-bounce-slow">🎉</div>
          
          <div>
            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-3">
              GREAT JOB!
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-gray-700">
              You completed:
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mt-2">
              "{lesson?.title}"
            </h2>
          </div>

          {/* Progress Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-purple-200">
            <h3 className="text-sm font-black text-purple-700 uppercase mb-4">Lesson Summary</h3>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white rounded-xl p-4 border border-purple-100">
                <div className="text-3xl font-black text-green-600">✓</div>
                <div className="text-2xl font-black text-gray-800 mt-1">
                  {progress?.required_resources_completed || 0}
                </div>
                <div className="text-xs font-bold text-gray-600">Steps Completed</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-purple-100">
                <div className="text-3xl font-black text-purple-600">⏱️</div>
                <div className="text-2xl font-black text-gray-800 mt-1">
                  {formatTime(progress?.time_spent_seconds || 0)}
                </div>
                <div className="text-xs font-bold text-gray-600">Learning Time</div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200">
              <h3 className="text-lg font-black text-orange-700 mb-4 flex items-center justify-center gap-2">
                <span>🏆</span> New Achievements Unlocked! <span>🏆</span>
              </h3>
              
              <div className="space-y-3">
                {achievements.map((achievement, idx) => (
                  <div 
                    key={idx}
                    className="bg-white rounded-xl p-4 border-2 border-yellow-300 flex items-center gap-3 animate-slide-in"
                    style={{ animationDelay: `${idx * 0.2}s` }}
                  >
                    <div className="text-4xl">{achievement.icon || '⭐'}</div>
                    <div className="text-left">
                      <div className="font-black text-gray-800">{achievement.title}</div>
                      <div className="text-sm text-gray-600">{achievement.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivational Message */}
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-6 text-white">
            <p className="text-xl font-black mb-2">Excellent! You finished this lesson! 🌟</p>
            <p className="text-lg font-medium">Keep learning and growing!</p>
          </div>

          {/* Continue Button */}
          <button
            onClick={onContinue}
            className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-2xl rounded-2xl shadow-2xl transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <span>Continue Learning</span>
            <span className="text-3xl">→</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes slide-in {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-fall {
          animation: fall linear infinite;
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.5s ease-out backwards;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
