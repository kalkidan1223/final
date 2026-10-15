import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function QuizResultDetail() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuizResultDetail();
  }, [resultId]);

  const fetchQuizResultDetail = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/results/quizzes/${resultId}`);
      setResult(response.data.quiz_result);
      setQuestions(response.data.questions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quiz result');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center max-w-lg mx-auto my-12">
        <span className="text-4xl block mb-2">😔</span>
        <p className="text-rose-700 font-bold mb-4">{error}</p>
        <button
          onClick={fetchQuizResultDetail}
          className="px-6 py-2 bg-green-600 text-white font-bold rounded-2xl shadow hover:bg-green-700 transition"
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  if (!result) return null;

  const answers = result.answers ? JSON.parse(result.answers) : {};

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-green-600 hover:text-green-700 font-bold">
          <span className="mr-2">←</span> Back to Results
        </button>
      </div>

      {/* Result Card */}
      <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-green-100">
        <div className="border-b-2 border-green-100 pb-6 mb-6">
          <h1 className="text-2xl font-black text-gray-800 mb-2">📝 Quiz Result</h1>
          <div className="flex items-center gap-2">
            {result.is_passed !== null && (
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                result.is_passed ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {result.is_passed ? '✓ PASSED' : '✗ FAILED'}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-500">Quiz</p>
            <p className="text-lg font-black text-gray-800">{result.quiz_title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">Course</p>
              <p className="text-gray-800">{result.course_title}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Lesson</p>
              <p className="text-gray-800">{result.lesson_title}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4">
            <div>
              <p className="text-sm font-bold text-gray-500">Score</p>
              <p className="text-2xl font-black text-green-600">{result.score} / {result.total_points}</p>
            </div>
            {result.percentage && (
              <div>
                <p className="text-sm font-bold text-gray-500">Percentage</p>
                <p className="text-2xl font-black text-green-600">{result.percentage}%</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-gray-500">Attempt</p>
              <p className="text-gray-800">{result.attempt_number}</p>
            </div>
            <div>
              <p className="font-bold text-gray-500">Date</p>
              <p className="text-gray-800">{new Date(result.submitted_at).toLocaleString()}</p>
            </div>
          </div>

          {result.passing_score && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-bold text-blue-800">Passing Score: {result.passing_score}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Question Details */}
      <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-green-100">
        <h2 className="text-xl font-black text-gray-800 mb-6">Question Details</h2>
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_answer;

            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border-2 ${
                  isCorrect ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 mb-2">{q.question_text}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="font-bold text-gray-500">Your Answer:</span>
                        <span className="ml-2 font-medium text-gray-800">{userAnswer || 'Not answered'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Correct Answer:</span>
                        <span className="ml-2 font-medium text-gray-800">{q.correct_answer}</span>
                      </div>
                      <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                        isCorrect ? 'bg-green-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
