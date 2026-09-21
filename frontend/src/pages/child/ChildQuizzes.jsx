import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildQuizzes() {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/child/quizzes');
      setQuizzes(response.data.quizzes || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading quizzes... 📝</p>
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

  const grouped = quizzes.reduce((acc, q) => {
    const key = q.course_title || 'Quizzes';
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 rounded-3xl p-8 shadow-xl text-white space-y-1">
        <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
          <span>🇪🇹</span> የህፃናት የፈተና ማዕከል / Brana Quiz Center
        </div>
        <h1 className="text-3xl sm:text-4xl font-black">ፈተናዎች / Quizzes 📝</h1>
        <p className="text-base sm:text-lg text-white/90">የተማርከውን/ሽውን ዕውቀት ፈትሽ! / Show what you have learned!</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-12 text-center space-y-3">
          <span className="text-6xl block mb-2">📝</span>
          <h2 className="text-2xl font-black text-slate-800">ምንም ፈተና አልተገኘም / No Quizzes Yet</h2>
          <p className="text-slate-500 text-sm">አስተማሪህ/ሽ በቅርቡ ፈተናዎችን ያዘጋጃል! / Your instructor will add quizzes soon!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([course, items]) => (
          <div key={course} className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
              <span>{course}</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((q) => {
                const attCount = q.attempts || q.attempt_count || 0;
                const hasPassed = q.is_passed;

                return (
                  <Link
                    key={q.id}
                    to={`/child/quizzes/${q.id}`}
                    className="group block bg-white rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-purple-100 hover:border-purple-300 transform hover:-translate-y-1"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm group-hover:scale-105 transition">
                        🧠
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-800 group-hover:text-purple-600 transition truncate text-base">
                          {q.title}
                        </h3>
                        <p className="text-xs text-purple-700 font-bold truncate mt-0.5">
                          📚 {q.lesson_title}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-extrabold">
                      {attCount > 0 ? (
                        <span className={`px-2.5 py-1 rounded-full ${hasPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {hasPassed ? '✓ አልፈሃል/ሻል' : '🔄 ተሞክሯል'} ({attCount}{q.attempt_limit ? `/${q.attempt_limit}` : ''})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
                          ▶ ፈተና ውሰድ / Take Quiz
                        </span>
                      )}

                      {q.best_score != null && (
                        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-full">
                          ⭐ ከፍተኛ: {Number(q.best_score)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}