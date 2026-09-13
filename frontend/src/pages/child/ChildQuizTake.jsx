import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildQuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (quiz?.time_limit_seconds && timeLeft !== null) {
      setTimeLeft(quiz.time_limit_seconds);
      const t = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(t);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimer(t);
      return () => clearInterval(t);
    }
  }, [quiz, timeLeft]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/quizzes/${id}`);
      setQuiz(response.data.quiz);
      setQuestions(response.data.questions || []);
      
      if (response.data.previous_result) {
        // Already taken, show results
        setResult({
          ...response.data.previous_result,
          percentage: response.data.previous_result.total_points > 0 
            ? Math.round((response.data.previous_result.score / response.data.previous_result.total_points) * 100)
            : 0,
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (!result && questions.length > 0) {
      await submitQuiz(true);
    }
  };

  const handleAnswer = (questionId, value) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitQuiz = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = questions.filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        setError(`Please answer all questions! ${unanswered.length} question${unanswered.length > 1 ? 's' : ''} unanswered.`);
        return;
      }
      setShowConfirm(true);
      return;
    }
    // Auto-submit (time up)
    doSubmit();
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    await doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axiosClient.post(`/child/quizzes/${id}/submit`, { answers });
      setResult({
        ...data.result,
        percentage: data.total_points > 0 ? Math.round((data.score / data.total_points) * 100) : 0,
        message: data.message,
      });
      if (timer) clearInterval(timer);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit the quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestion(Math.max(0, Math.min(questions.length - 1, index)));
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getProgressColor = (percent) => {
    if (percent < 30) return 'bg-red-500';
    if (percent < 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading quiz... 📝</p>
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
          <span className="mr-2">←</span> Back to Lesson
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <p className="text-red-700 font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </p>
        </div>
      </div>
    );
  }

  // Show Results
  if (result) {
    const pct = result.percentage;
    const isPass = pct >= 70;
    const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 70 ? '⭐⭐' : pct >= 50 ? '⭐' : '';

    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        {/* Result Header */}
        <div className={`bg-white rounded-2xl shadow-xl p-8 text-center ${isPass ? 'border-4 border-green-400' : 'border-4 border-orange-400'}`}>
          <div className="text-6xl mb-4">{isPass ? '🎉' : '💪'}</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isPass ? 'Great Job!' : 'Good Effort!'}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            You scored <span className="font-bold text-3xl">{result.score} / {result.total_points}</span>
          </p>
          <div className="text-4xl font-bold mb-4">
            {pct}% {stars}
          </div>
          <p className="text-lg text-gray-600">
            {isPass 
              ? 'Excellent work! You really know your stuff! 🌟' 
              : "Don't worry! Keep practicing and you'll get there! 💪"}
          </p>
          <p className="mt-2 text-gray-500">{result.message || ''}</p>
        </div>

        {/* Detailed Results */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
            <h2 className="text-2xl font-bold text-white">📊 Question Review</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {questions.map((q, index) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer && userAnswer.toString().toLowerCase() === q.correct_answer.toString().toLowerCase();
              return (
                <div key={q.id} className={`p-4 rounded-xl border-2 ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-gray-800 flex-1">
                      Question {index + 1}: {q.question_text}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className={`flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      <span className="font-medium">Your answer:</span>
                      <span>{userAnswer || 'Not answered'}</span>
                    </p>
                    <p className="text-green-700 flex items-center gap-2">
                      <span className="font-medium">Correct answer:</span>
                      <span>{q.correct_answer}</span>
                    </p>
                    {q.explanation && (
                      <p className="text-blue-700 flex items-center gap-2">
                        <span className="font-medium">💡 Hint:</span>
                        <span>{q.explanation}</span>
                      </p>
                    )}
                    {q.points && (
                      <p className="text-gray-500">Points: {isCorrect ? q.points : 0} / {q.points}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            Back to Lesson
          </button>
          <button
            onClick={() => navigate(`/child/quizzes/${id}/results`)}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition"
          >
            View Details →
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
          {quiz.time_limit_seconds && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg ${timeLeft !== null && timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-purple-100 text-purple-700'}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          )}
        </div>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">📝</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{quiz.title}</h1>
            <p className="text-gray-600">{quiz.description || 'Test your knowledge!'}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-700">
              {currentQuestion + 1}
            </div>
            <div>
              <p className="text-sm text-gray-500">Question</p>
              <p className="font-bold text-gray-800">{currentQuestion + 1} of {questions.length}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Progress</p>
            <p className="font-bold text-purple-600">{Math.round(progressPercent)}%</p>
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          >
            <div className={`h-full ${getProgressColor(progressPercent)} rounded-full`} />
          </div>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mt-2">
          <span>{answeredCount} answered</span>
          <span>{questions.length - answeredCount} remaining</span>
        </div>
      </div>

      {/* Question */}
      {currentQ && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
                {currentQ.question_type.replace(/_/g, ' ')}
              </span>
              {currentQ.points && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                  ⭐ {currentQ.points} point{currentQ.points > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-800 leading-relaxed">
              {currentQuestion + 1}. {currentQ.question_text}
            </h3>
          </div>

          {/* Question Image/Audio */}
          {currentQ.question_config?.media_url && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              {currentQ.question_type === 'picture' ? (
                <img src={resolveFileUrl(currentQ.question_config.media_url)} alt="Question image" className="max-w-full h-auto rounded-lg" />
              ) : currentQ.question_type === 'audio' ? (
                <audio src={resolveFileUrl(currentQ.question_config.media_url)} controls className="w-full" />
              ) : null}
            </div>
          )}

          {/* Options */}
          <form className="space-y-4">
            {currentQ.question_type === 'mcq' && currentQ.options && (
              <div className="space-y-3" role="radiogroup" aria-label="Answer options">
                {currentQ.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAnswer(currentQ.id, option)}
                    className={`w-full p-5 rounded-xl border-2 text-left text-lg transition-all ${
                      answers[currentQ.id] === option
                        ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        answers[currentQ.id] === option ? 'bg-purple-500' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 text-left text-lg">{option}</span>
                      {answers[currentQ.id] === option && (
                        <svg className="w-6 h-6 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQ.question_type === 'true_false' && (
              <div className="flex gap-4" role="radiogroup">
                {['True', 'False'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleAnswer(currentQ.id, opt)}
                    className={`flex-1 p-6 rounded-xl border-2 text-center font-bold text-2xl transition-all ${
                      answers[currentQ.id] === opt
                        ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200 text-purple-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-300 text-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {(currentQ.question_type === 'short_answer' || currentQ.question_type === 'fill_in_the_blank') && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Your Answer
                </label>
                <input
                  type="text"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                  className="w-full px-4 py-4 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-lg"
                  placeholder="Type your answer here..."
                  autoFocus
                />
              </div>
            )}

            {currentQ.question_type === 'matching' && currentQ.options && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">Match the items:</p>
                {currentQ.options.map((pair, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <span className="flex-1 font-medium text-gray-800">{pair.left}</span>
                    <span className="text-gray-400">→</span>
                    <select
                      value={answers[`${currentQ.id}_${index}`] || ''}
                      onChange={(e) => handleAnswer(`${currentQ.id}_${index}`, e.target.value)}
                      className="flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="">Select match...</option>
                      {currentQ.options.map((_, optIndex) => (
                        <option key={optIndex} value={currentQ.options[optIndex].right}>
                          {currentQ.options[optIndex].right}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Answer Feedback */}
          {answers[currentQ.id] && (
            <div className="mt-6 p-4 bg-green-50 rounded-xl flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              <span className="font-medium">Answer selected: {answers[currentQ.id]}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
            <button
              onClick={() => goToQuestion(currentQuestion - 1)}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToQuestion(index)}
                  className={`w-10 h-10 rounded-xl font-bold transition-all ${
                    index === currentQuestion
                      ? 'bg-purple-500 text-white ring-2 ring-purple-200'
                      : answers[questions[index]?.id]
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToQuestion(currentQuestion + 1)}
              disabled={currentQuestion === questions.length - 1}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Question Navigator */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="font-bold text-gray-800 mb-4">Question Navigator</h3>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToQuestion(index)}
              className={`w-12 h-12 rounded-xl font-bold transition-all ${
                index === currentQuestion
                  ? 'bg-purple-500 text-white ring-2 ring-purple-200'
                  : answers[questions[index]?.id]
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 rounded"></span> Not answered</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Answered</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded"></span> Current</span>
        </div>
      </div>

      {/* Submit Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📤</span> Ready to Submit?
        </h2>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-4">
            <p className="text-red-700 font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </p>
          </div>
        )}

        <div className="bg-purple-50 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-purple-800 mb-2">✨ Check Your Work!</h3>
          <p className="text-gray-700 mb-2">You've answered <strong>{answeredCount} out of {questions.length}</strong> questions.</p>
          <p className="text-gray-600 text-sm">Make sure you're happy with all your answers before submitting.</p>
        </div>

        <button
          onClick={() => handleSubmit()}
          disabled={submitting || answeredCount < questions.length}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Submit Quiz</span>
            </>
          )}
        </button>

        {answeredCount < questions.length && (
          <p className="mt-3 text-center text-sm text-gray-500">
            Please answer all {questions.length - answeredCount} remaining question{questions.length - answeredCount > 1 ? 's' : ''} first.
          </p>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Submit Quiz?</h3>
            <p className="text-gray-600 mb-6 text-center">
              You've answered all {questions.length} questions. Your teacher will see your results immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Review Answers
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}