import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildResults() {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [activityResults, setActivityResults] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Fetch summary
      const summaryRes = await axiosClient.get('/child/results/summary');
      setSummary(summaryRes.data);

      // Fetch activity results
      const activityRes = await axiosClient.get('/child/results/activities');
      setActivityResults(activityRes.data.activity_results || []);

      // Fetch quiz results
      const quizRes = await axiosClient.get('/child/results/quizzes');
      setQuizResults(quizRes.data.quiz_results || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-7xl animate-bounce">🏆</div>
        <p className="text-xl font-black text-green-700 animate-pulse">Loading your results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center max-w-lg mx-auto my-12">
        <span className="text-4xl block mb-2">😔</span>
        <p className="text-rose-700 font-bold mb-4">{error}</p>
        <button
          onClick={fetchResults}
          className="px-6 py-2 bg-green-600 text-white font-bold rounded-2xl shadow hover:bg-green-700 transition"
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-3xl p-8 text-white shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-black mb-2">🏆 My Results</h1>
        <p className="text-lg font-medium text-green-100">See how well you're doing!</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-green-100 text-center">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-3xl font-black text-green-600">{summary.quiz_count}</div>
            <div className="text-sm font-bold text-gray-500">Quizzes</div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-green-100 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-3xl font-black text-green-600">{summary.activity_count}</div>
            <div className="text-sm font-bold text-gray-500">Activities</div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-green-100 text-center">
            <div className="text-4xl mb-2">⭐</div>
            <div className="text-3xl font-black text-green-600">{summary.average_score}%</div>
            <div className="text-sm font-bold text-gray-500">Avg Score</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 rounded-2xl font-bold transition ${
            activeTab === 'all'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-green-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-6 py-3 rounded-2xl font-bold transition ${
            activeTab === 'activities'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-green-50'
          }`}
        >
          🎯 Activities
        </button>
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`px-6 py-3 rounded-2xl font-bold transition ${
            activeTab === 'quizzes'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-green-50'
          }`}
        >
          📝 Quizzes
        </button>
      </div>

      {/* Activity Results */}
      {(activeTab === 'all' || activeTab === 'activities') && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <span>🎯</span> Activity Results
          </h2>
          {activityResults.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-green-100">
              <span className="text-6xl block mb-4">🎯</span>
              <p className="text-gray-600 font-medium">No activity results yet. Complete activities to see your results here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activityResults.map((result) => (
                <div key={result.submission_id} className="bg-white rounded-3xl p-6 shadow-md border-2 border-green-100 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-gray-800 mb-1">{result.activity_title}</h3>
                      <p className="text-sm text-gray-500">Course: {result.course_title}</p>
                      <p className="text-sm text-gray-500">Lesson: {result.lesson_title}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      result.status === 'graded' ? 'bg-green-100 text-green-700' :
                      result.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  {result.score !== null && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-black text-green-600">{result.score}</span>
                      <span className="text-gray-500">/ {result.max_score}</span>
                      {result.percentage && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                          {result.percentage}%
                        </span>
                      )}
                    </div>
                  )}
                  {result.feedback && (
                    <div className="bg-green-50 rounded-xl p-3 mb-3">
                      <p className="text-sm text-green-800 font-medium">"{result.feedback}"</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(result.submitted_at).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/child/results/activities/${result.submission_id}`}
                      className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quiz Results */}
      {(activeTab === 'all' || activeTab === 'quizzes') && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <span>📝</span> Quiz Results
          </h2>
          {quizResults.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-green-100">
              <span className="text-6xl block mb-4">📝</span>
              <p className="text-gray-600 font-medium">No quiz results yet. Take quizzes to see your results here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizResults.map((result) => (
                <div key={result.result_id} className="bg-white rounded-3xl p-6 shadow-md border-2 border-green-100 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-gray-800 mb-1">{result.quiz_title}</h3>
                      <p className="text-sm text-gray-500">Course: {result.course_title}</p>
                      <p className="text-sm text-gray-500">Lesson: {result.lesson_title}</p>
                    </div>
                    {result.is_passed !== null && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        result.is_passed ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {result.is_passed ? '✓ Passed' : '✗ Failed'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-black text-green-600">{result.score}</span>
                    <span className="text-gray-500">/ {result.total_points}</span>
                    {result.percentage && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                        {result.percentage}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Attempt {result.attempt_number} • {new Date(result.submitted_at).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/child/results/quizzes/${result.result_id}`}
                      className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm"
                    >
                      View Result
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
