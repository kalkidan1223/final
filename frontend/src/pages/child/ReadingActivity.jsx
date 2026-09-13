import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function ReadingActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/activities/${id}`);
      setActivity(response.data.activity);
      setIsGraded(response.data.activity.submission_status === 'graded');
      
      if (response.data.activity.submission_data) {
        try {
          const saved = JSON.parse(response.data.activity.submission_data);
          setAnswers(saved.answers || {});
          setCurrentQuestion(saved.currentQuestion || 0);
        } catch (e) {
          // Ignore
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const handleReadAloud = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAnswer = (questionId, answer) => {
    if (isGraded) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    const questions = activity?.activity_config?.questions || [];
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`Please answer all questions! ${unanswered.length} question${unanswered.length > 1 ? 's' : ''} unanswered.`);
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      await axiosClient.post(`/child/activities/${id}/submit`, {
        submission_text: 'Reading activity completed',
        submitted_content: JSON.stringify({ answers, currentQuestion }),
      });
      setSuccessMessage('Excellent reading! Your answers have been submitted! 📖');
      await fetchActivity();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit activity');
    } finally {
      setSubmitting(false);
    }
  };

  const questions = activity?.activity_config?.questions || [];
  const currentQ = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading activity... 📖</p>
        </div>
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
          <span className="mr-2">←</span> Back
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <p className="text-red-700 font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">📖</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{activity.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Lesson: {activity.lesson_title}</span>
              <span>•</span>
              <span>Course: {activity.course_title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isGraded && <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-1">✅ Graded</span>}
            {!isGraded && <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">📖 Read & Answer</span>}
          </div>
        </div>

        {activity.description && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-2">📋 Instructions</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{activity.description}</p>
          </div>
        )}
      </div>

      {/* Reading Passage */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>📖</span> Reading Passage
            </h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                {answeredCount}/{questions.length} Answered
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Passage Content */}
          {activity.activity_config?.passage && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6 border-l-4 border-blue-400">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-blue-800">📖 Read the Passage</h3>
                <button
                  type="button"
                  onClick={() => handleReadAloud(activity.activity_config.passage)}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>🔊</span> Listen to Story
                </button>
              </div>
              <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed">
                {activity.activity_config.passage.split('\n').map((para, i) => (
                  <p key={i} className="mb-4">{para}</p>
                ))}
              </div>
              {activity.activity_config?.passage_audio && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <audio src={resolveFileUrl(activity.activity_config.passage_audio)} controls className="w-full max-w-md" />
                  <p className="text-sm text-gray-500 mt-2">🎧 Listen to the passage</p>
                </div>
              )}
            </div>
          )}

          {activity.activity_config?.passage_images && activity.activity_config.passage_images.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-purple-800 mb-3">🖼️ Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activity.activity_config.passage_images.map((img, i) => (
                  <img
                    key={i}
                    src={resolveFileUrl(img)}
                    alt={`Reading image ${i + 1}`}
                    className="w-full h-auto rounded-xl shadow-md"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800 text-xl mb-4 flex items-center gap-2">
                <span>❓</span> Questions
              </h3>
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                    index === currentQuestion
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-gray-800 text-lg">
                      Question {index + 1}: {question.text}
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentQuestion(Math.max(0, index - 1))}
                        disabled={index === 0}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() => setCurrentQuestion(Math.min(questions.length - 1, index + 1))}
                        disabled={index === questions.length - 1}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Next →
                      </button>
                    </div>
                  </div>

                  {/* Question Type Rendering */}
                  {question.type === 'multiple_choice' && question.options && (
                    <div className="space-y-3" role="radiogroup">
                      {question.options.map((option, optIndex) => (
                        <button
                          key={optIndex}
                          onClick={() => handleAnswer(question.id, option)}
                          disabled={isGraded}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            answers[question.id] === option
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200'
                              : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                          } ${isGraded ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                              answers[question.id] === option ? 'bg-blue-500' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}
                            </div>
                            <span className="flex-1 text-left text-lg">{option}</span>
                            {answers[question.id] === option && (
                              <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {question.type === 'true_false' && (
                    <div className="flex gap-4" role="radiogroup">
                      {['True', 'False'].map((opt, optIndex) => (
                        <button
                          key={opt}
                          onClick={() => handleAnswer(question.id, opt)}
                          disabled={isGraded}
                          className={`flex-1 p-4 rounded-xl border-2 text-center font-bold text-lg transition-all ${
                            answers[question.id] === opt
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700'
                          } ${isGraded ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {question.type === 'short_answer' && (
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      disabled={isGraded}
                      rows={4}
                      className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Type your answer here..."
                    />
                  )}

                  {question.type === 'fill_in_the_blank' && question.options && (
                    <div className="space-y-3">
                      {question.options.map((blank, blankIndex) => (
                        <div key={blankIndex} className="flex items-center gap-3">
                          <span className="text-gray-700">{blank.before}</span>
                          <input
                            value={answers[`${question.id}_${blankIndex}`] || ''}
                            onChange={(e) => handleAnswer(`${question.id}_${blankIndex}`, e.target.value)}
                            disabled={isGraded}
                            className="flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                            placeholder="Fill in the blank"
                          />
                          <span className="text-gray-700">{blank.after}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {answers[question.id] && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-green-700">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      <span className="font-medium">Answered</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        {questions.length > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Question</span>
              <span className="font-bold text-blue-600">{currentQuestion + 1}</span>
              <span>of</span>
              <span className="font-bold">{questions.length}</span>
            </div>
            <button
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
              disabled={currentQuestion === questions.length - 1}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isGraded && questions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Your Progress</h3>
            <span className="text-sm text-gray-500">{answeredCount}/{questions.length} answered</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-gray-500">
            {answeredCount === questions.length ? '🎉 All questions answered! Ready to submit.' : `Answer ${questions.length - answeredCount} more question${questions.length - answeredCount > 1 ? 's' : ''} to continue.`}
          </p>
        </div>
      )}

      {/* Submit Section */}
      {!isGraded && answeredCount === questions.length && questions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📤</span> Submit Your Answers
          </h2>
          
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl mb-4 animate-pulse">
              <p className="text-green-700 font-medium flex items-center gap-2">
                <span>🎉</span> {successMessage}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-4">
              <p className="text-red-700 font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </p>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-blue-800 mb-2">✨ All Questions Answered!</h3>
            <p className="text-gray-700">Review your answers above, then submit for your teacher to review.</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Submit Answers</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results for graded */}
      {isGraded && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> Your Results
          </h3>
          <div className="space-y-4">
            <p className="text-lg">
              <span className="text-gray-600">Score:</span>
              <span className="font-bold text-green-700 ml-2 text-2xl">
                {activity.score} / {activity.max_score || 100}
              </span>
            </p>
            {activity.feedback && (
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Teacher's Feedback:</p>
                <p className="text-gray-700 bg-white rounded-lg p-4 whitespace-pre-wrap">
                  {activity.feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Submit Your Answers?</h3>
            <p className="text-gray-600 mb-6 text-center">
              Your teacher will review your answers and give you feedback.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}