import { useState, useEffect } from 'react';

const LEVELS = [
  { level: 1, name: 'Explorer', minXP: 0, icon: '🌱' },
  { level: 2, name: 'Learner', minXP: 100, icon: '🌿' },
  { level: 3, name: 'Student', minXP: 300, icon: '📚' },
  { level: 4, name: 'Scholar', minXP: 600, icon: '🎓' },
  { level: 5, name: 'Master', minXP: 1000, icon: '🏆' },
  { level: 6, name: 'Champion', minXP: 1500, icon: '👑' },
  { level: 7, name: 'Legend', minXP: 2500, icon: '⭐' },
  { level: 8, name: 'Superstar', minXP: 4000, icon: '🌟' },
];

const XP_REWARDS = {
  lesson_complete: 50,
  activity_complete: 20,
  quiz_perfect: 100,
  quiz_good: 50,
  streak_day: 30,
  achievement: 75,
};

export default function GamificationPanel({ currentXP = 0 }) {
  const [xp, setXP] = useState(currentXP);

  useEffect(() => {
    setXP(currentXP);
  }, [currentXP]);

  const currentLevel = LEVELS.filter(l => xp >= l.minXP).pop() || LEVELS[0];
  const nextLevel = LEVELS[currentLevel.level] || null;
  const progressToNext = nextLevel
    ? Math.min(100, Math.max(0, ((xp - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100))
    : 100;

  return (
    <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-bounce">{currentLevel.icon}</div>
            <div>
              <div className="text-xs font-black uppercase tracking-wide opacity-90">Level {currentLevel.level}</div>
              <div className="text-lg font-black">{currentLevel.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">{xp} XP</div>
            <div className="text-xs opacity-90">Total Points</div>
          </div>
        </div>

        {/* Progress Bar */}
        {nextLevel && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Progress to {nextLevel.name}</span>
              <span>{Math.round(progressToNext)}%</span>
            </div>
            <div className="h-4 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 progress-bar-animated"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <div className="text-xs font-bold text-center opacity-90">
              {nextLevel.minXP - xp} XP to next level
            </div>
          </div>
        )}

        {/* XP Rewards Info */}
        <div className="mt-4 pt-4 border-t border-white/30">
          <div className="text-xs font-black uppercase tracking-wide mb-2 opacity-90">Ways to Earn XP</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <span>📖</span>
              <span>Complete Lesson: +{XP_REWARDS.lesson_complete}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <span>✏️</span>
              <span>Finish Activity: +{XP_REWARDS.activity_complete}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <span>🧠</span>
              <span>Perfect Quiz: +{XP_REWARDS.quiz_perfect}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <span>🔥</span>
              <span>Daily Streak: +{XP_REWARDS.streak_day}</span>
            </div>
          </div>
        </div>
      </div>
  );
}
