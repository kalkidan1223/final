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
      <div className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-3xl p-8 shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-2">Quizzes 📝</h1>
        <p className="text-xl text-white/90">Show what you know!</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <span className="text-6xl block mb-4">📝</span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Quizzes Yet</h2>
          <p className="text-gray-600 text-lg">Your teacher will add quizzes soon!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([course, items]) => (
          <div key={course}>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{course}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((q) => (
                <Link
                  key={q.id}
                  to={`/child/quizzes/${q.id}`}
                  className="group block bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 border border-gray-100 hover:border-purple-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🧠</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 group-hover:text-purple-600 transition truncate">{q.title}</h3>
                      <p className="text-sm text-gray-500 mb-2 truncate">📚 {q.lesson_title}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                    {q.attempts > 0 ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                        ✅ Attempted {q.attempts}/{q.attempt_limit || 1}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">▶ Take Quiz</span>
                    )}
                    {q.best_score != null && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-bold">
                        ⭐ Best: {Number(q.best_score)}%
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}