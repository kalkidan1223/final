import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function ChildQuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Mode: 'intro' | 'taking' | 'results'
  const [mode, setMode] = useState('intro');
  const [previousResult, setPreviousResult] = useState(null);
  const [quizMeta, setQuizMeta] = useState({ attempt_count: 0, attempt_limit: null, can_attempt: true });
  const [result, setResult] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const startAttemptRef = useRef(false);

  useEffect(() => {
    fetchQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axiosClient.get(`/child/quizzes/${id}`);
      const data = res.data;
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      setPreviousResult(data.previous_result || null);
      setQuizMeta({
        attempt_count: data.attempt_count || 0,
        attempt_limit: data.attempt_limit || null,
        can_attempt: data.can_attempt !== false,
      });

      // If already has results, show intro with option to view or retake
      setMode('intro');
    } catch (err) {
      setError(err.response?.data?.error || 'ፈተናውን መጫን አልተቻለም / Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  // Start the quiz
  const handleStartQuiz = async () => {
    try {
      setError('');
      setSubmitting(true);

      // Track attempt on backend idempotently
      await axiosClient.post(`/child/quizzes/${id}/start`);

      setAnswers({});
      setCurrentQuestion(0);
      setResult(null);
      setMode('taking');

      // Set up timer if time limit exists
      if (quiz?.time_limit_seconds && quiz.time_limit_seconds > 0) {
        setTimeLeft(quiz.time_limit_seconds);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleTimeUp();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'ፈተናውን ማስጀመር አልተቻለም / Could not start quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeUp = async () => {
    await doSubmit(true);
  };

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submitQuiz = () => {
    const unanswered = questions.filter((q) => answers[q.id] === undefined || answers[q.id] === '');
    if (unanswered.length > 0) {
      setError(`እባክዎን ሁሉንም ጥያቄዎች ይመልሱ! ${unanswered.length} ያልተመለሰ ጥያቄ አለ / Please answer all questions! (${unanswered.length} remaining)`);
      return;
    }
    setError('');
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    await doSubmit(false);
  };

  const doSubmit = async (autoSubmit = false) => {
    setSubmitting(true);
    setError('');
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await axiosClient.post(`/child/quizzes/${id}/submit`, { answers });
      const data = res.data;

      // A passing attempt unlocks this step on the lesson journey. The backend
      // re-verifies the pass server-side before recording completion.
      if (data.passed) {
        axiosClient
          .post(`/child/learning/progress/quiz/${id}/complete`)
          .catch(() => {});
      }

      setResult({
        ...data.result,
        score: data.score,
        total_points: data.total_points,
        percentage: data.percentage,
        passed: data.passed,
        message: data.message,
        review: data.review || [],
      });

      // Update metadata attempt count
      setQuizMeta((prev) => {
        const nextCnt = prev.attempt_count + 1;
        return {
          ...prev,
          attempt_count: nextCnt,
          can_attempt: !prev.attempt_limit || nextCnt < prev.attempt_limit,
        };
      });

      setMode('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'ፈተናውን ማስገባት አልተቻለም / Failed to submit quiz. Please try again!');
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

  // Loading Screen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-3xl shadow-lg border border-purple-100 max-w-sm">
          <div className="text-5xl animate-bounce mb-4">📝</div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-700 font-bold text-lg">ፈተናው እየተጫነ ነው...</p>
          <p className="text-gray-400 text-xs">Loading Ethiopian Quiz...</p>
        </div>
      </div>
    );
  }

  // Error without quiz screen
  if (error && !quiz) {
    return (
      <div className="space-y-4 max-w-lg mx-auto my-12">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-bold">
          <span>←</span> Back
        </button>
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl text-center">
          <span className="text-4xl block mb-2">⚠️</span>
          <p className="text-rose-700 font-bold text-sm mb-4">{error}</p>
          <button
            onClick={fetchQuiz}
            className="px-6 py-2 bg-purple-600 text-white font-bold rounded-2xl shadow hover:bg-purple-700 transition"
          >
            እንደገና ሞክር / Try Again 🔄
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. INTRO / START SCREEN
  // ─────────────────────────────────────────────────────────────
  if (mode === 'intro') {
    const prevPct = previousResult?.total_points > 0
      ? Math.round((Number(previousResult.score) / Number(previousResult.total_points)) * 100)
      : null;
    const isPrevPass = prevPct !== null && prevPct >= (quiz.passing_score || 60);

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            to={quiz.lesson_id ? `/child/lessons/${quiz.lesson_id}` : '/child/quizzes'}
            className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 font-bold text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-purple-100 transition hover:scale-105"
          >
            <span>←</span> ወደ ትምህርቱ ተመለስ / Back to Lesson
          </Link>
          <Link
            to="/child/quizzes"
            className="text-xs font-extrabold text-slate-500 hover:text-purple-600"
          >
            📋 ሁሉም ፈተናዎች / All Quizzes
          </Link>
        </div>

        {/* Main Quiz Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-purple-100 text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-amber-400 to-orange-400 rounded-3xl flex items-center justify-center text-4xl shadow-md transform hover:rotate-6 transition">
            🧠
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black uppercase tracking-wider">
              🇪🇹 የህፃናት ፈተና / Kids Quiz
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800">{quiz.title}</h1>
            {quiz.lesson_title && (
              <p className="text-xs sm:text-sm font-bold text-purple-700">
                ትምህርት: {quiz.lesson_title} • {quiz.course_title}
              </p>
            )}
            {quiz.description && (
              <p className="text-sm text-slate-600 max-w-lg mx-auto">{quiz.description}</p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100">
              <span className="text-xl block">❓</span>
              <span className="text-xs font-bold text-slate-500">ጥያቄዎች</span>
              <p className="text-base font-black text-purple-900">{questions.length}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
              <span className="text-xl block">⏱️</span>
              <span className="text-xs font-bold text-slate-500">ጊዜ</span>
              <p className="text-base font-black text-amber-900">
                {quiz.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds / 60)} ደቂቃ` : 'ያልተገደበ'}
              </p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
              <span className="text-xl block">🎯</span>
              <span className="text-xs font-bold text-slate-500">ማለፊያ</span>
              <p className="text-base font-black text-emerald-900">{quiz.passing_score || 60}%</p>
            </div>
          </div>

          {/* Previous Attempt Summary if taken before */}
          {previousResult && (
            <div className={`p-4 rounded-2xl border-2 text-left ${isPrevPass ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  የቀድሞ ውጤትህ/ሽ / Previous Result
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${isPrevPass ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                  {isPrevPass ? '✓ አልፈሃል/ሻል (Passed)' : '❌ አልተሳካም (Failed)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-800">
                <span>ውጤት: {previousResult.score} / {previousResult.total_points}</span>
                <span className="text-lg font-black text-purple-700">{prevPct}%</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl text-rose-700 text-xs font-bold">
              ⚠️ {error}
            </div>
          )}

          {/* Action button */}
          <div>
            {quizMeta.can_attempt ? (
              <button
                onClick={handleStartQuiz}
                disabled={submitting || questions.length === 0}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>በማስጀመር ላይ...</span>
                  </>
                ) : (
                  <>
                    <span>{previousResult ? '🔄 ፈተናውን እንደገና ሞክር / Retake Quiz' : '🚀 ፈተናውን ጀምር / Start Quiz'}</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-4 bg-slate-100 rounded-2xl text-slate-600 text-sm font-bold">
                ⚠️ የፈተና ሙከራ ገደብህ አልቋል ({quizMeta.attempt_count}/{quizMeta.attempt_limit}) / Maximum attempt limit reached.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. RESULTS SCREEN
  // ─────────────────────────────────────────────────────────────
  if (mode === 'results' && result) {
    const pct = result.percentage;
    const isPass = result.passed || pct >= (quiz?.passing_score || 60);
    const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 75 ? '⭐⭐' : pct >= 60 ? '⭐' : '💪';

    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-16">
        {/* Top Result Banner */}
        <div className={`bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center border-4 ${isPass ? 'border-emerald-400 bg-gradient-to-b from-emerald-50/40 to-white' : 'border-amber-400 bg-gradient-to-b from-amber-50/40 to-white'}`}>
          <div className="text-6xl mb-3 animate-bounce">{isPass ? '🎉' : '💪'}</div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">
            {isPass ? 'በጣም ጎበዝ! አልፈሃል/ሻል!' : 'በርታ/ቺ! እንደገና መሞከር ትችላለህ/ያለሽ!'}
          </h1>
          <p className="text-sm font-extrabold text-slate-500 mb-4">
            {isPass ? 'Great Job! You Passed the Quiz!' : "Keep Practicing! You'll get there!"}
          </p>

          <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-inner border border-slate-100 mb-4">
            <span className="text-3xl sm:text-4xl font-black text-purple-700">{pct}%</span>
            <span className="text-2xl">{stars}</span>
            <span className="text-sm font-extrabold text-slate-600">
              ({result.score} / {result.total_points} ነጥብ)
            </span>
          </div>

          <p className="text-sm font-bold text-slate-700 max-w-md mx-auto">{result.message}</p>
        </div>

        {/* Detailed Question Review */}
        {result.review && result.review.length > 0 && (
          <div className="bg-white rounded-3xl shadow-md border border-purple-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <h2 className="text-lg font-black flex items-center gap-2">
                <span>📊</span> የጥያቄዎች ግምገማ / Question Review
              </h2>
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold">
                {result.review.length} ጥያቄዎች
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {result.review.map((item, index) => {
                const isCorrect = item.is_correct;
                return (
                  <div
                    key={item.id || index}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition ${
                      isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-black text-slate-800 text-sm sm:text-base flex-1">
                        {index + 1}. {item.question_text}
                      </h4>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                        isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                      }`}>
                        {isCorrect ? '✅ ትክክል / Correct' : '❌ ስህተት / Incorrect'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm pt-2 border-t border-slate-200/60">
                      <p className="flex items-center gap-2">
                        <span className="font-bold text-slate-500">የአንተ/ቺ መልስ:</span>
                        <span className={`font-black ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {item.student_answer ? String(item.student_answer) : 'ያልተመለሰ (Unanswered)'}
                        </span>
                      </p>

                      {!isCorrect && item.correct_answer && (
                        <p className="flex items-center gap-2 text-emerald-800">
                          <span className="font-bold text-slate-500">ትክክለኛው መልስ:</span>
                          <span className="font-black">{String(item.correct_answer)}</span>
                        </p>
                      )}

                      {item.explanation && (
                        <p className="bg-white/70 p-2.5 rounded-xl text-xs text-indigo-900 font-medium mt-1">
                          💡 <strong>ማስታወሻ:</strong> {item.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            to={quiz?.lesson_id ? `/child/lessons/${quiz.lesson_id}` : '/child/quizzes'}
            className="w-full sm:flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-center transition"
          >
            ← ወደ ትምህርቱ ተመለስ / Back to Lesson
          </Link>

          {quizMeta.can_attempt && (
            <button
              onClick={handleStartQuiz}
              className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-black rounded-2xl text-center shadow-md transition"
            >
              🔄 እንደገና ፈትን / Retake Quiz
            </button>
          )}

          <Link
            to="/child/quizzes"
            className="w-full sm:w-auto px-5 py-3.5 bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 font-bold rounded-2xl text-center transition"
          >
            📋 ፈተናዎች / Quizzes
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. QUIZ TAKING SCREEN
  // ─────────────────────────────────────────────────────────────
  const currentQ = questions[currentQuestion];
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-16">
      {/* Top Header with Timer */}
      <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-5 sm:p-6 flex items-center justify-between gap-4">
        <button
          onClick={() => setMode('intro')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600"
        >
          <span>✕</span> ሰርዝ / Quit Quiz
        </button>

        <h2 className="text-base sm:text-lg font-black text-slate-800 truncate">{quiz?.title}</h2>

        {quiz?.time_limit_seconds > 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl font-black text-sm ${
            timeLeft !== null && timeLeft < 60 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-purple-100 text-purple-700'
          }`}>
            <span>⏱️</span>
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar & Current Question Counter */}
      <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm font-black">
          <div className="flex items-center gap-2 text-purple-700">
            <span className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center text-xs">
              {currentQuestion + 1}
            </span>
            <span>ጥያቄ {currentQuestion + 1} ከ {questions.length}</span>
          </div>
          <span className="text-slate-500">{answeredCount} ተመልሷል / {questions.length}</span>
        </div>

        <div className="w-full bg-purple-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white rounded-3xl shadow-md border-2 border-purple-100 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-black uppercase">
                {currentQ.question_type}
              </span>
              <span className="px-3 py-0.5 bg-amber-50 text-amber-800 rounded-full text-xs font-black">
                ⭐ {currentQ.points || 1} ነጥብ
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-relaxed">
              {currentQuestion + 1}. {currentQ.question_text}
            </h3>
          </div>

          {/* Media attachment if any */}
          {currentQ.question_config?.media_url && (
            <div className="p-3 bg-slate-50 rounded-2xl max-w-md mx-auto text-center">
              {currentQ.question_type === 'picture' ? (
                <img
                  src={resolveFileUrl(currentQ.question_config.media_url)}
                  alt="Question"
                  className="max-h-60 rounded-xl mx-auto shadow-sm"
                />
              ) : currentQ.question_type === 'audio' ? (
                <audio src={resolveFileUrl(currentQ.question_config.media_url)} controls className="w-full" />
              ) : null}
            </div>
          )}

          {/* Options / Answer Input */}
          <div className="space-y-3 pt-2">
            {/* MCQ Options */}
            {currentQ.question_type === 'mcq' && Array.isArray(currentQ.options) && (
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((option, idx) => {
                  const isSelected = answers[currentQ.id] === option;
                  const letter = String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAnswer(currentQ.id, option)}
                      className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left font-bold text-base sm:text-lg transition-all flex items-center gap-4 ${
                        isSelected
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200 text-purple-900 shadow-sm'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-purple-50/50 hover:border-purple-300 text-slate-800'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition ${
                        isSelected ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {letter}
                      </span>
                      <span className="flex-1 text-left leading-snug">{option}</span>
                      {isSelected && <span className="text-xl text-purple-600">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* True / False Options */}
            {currentQ.question_type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'True', amharic: 'እውነት (True)', icon: '👍' },
                  { value: 'False', amharic: 'ሀሰት (False)', icon: '👎' },
                ].map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleAnswer(currentQ.id, opt.value)}
                      className={`p-6 rounded-3xl border-2 font-black text-center transition flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200 text-purple-900 shadow-md'
                          : 'bg-slate-50 border-slate-200 hover:bg-purple-50 text-slate-700'
                      }`}
                    >
                      <span className="text-4xl">{opt.icon}</span>
                      <span className="text-base sm:text-lg">{opt.amharic}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short Answer / Fill in Blank */}
            {(currentQ.question_type === 'short_answer' || currentQ.question_type === 'fill_in_the_blank') && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">መልስህን/ሽን እዚህ ጻፍ / Type your answer:</label>
                <input
                  type="text"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                  placeholder="መልስ..."
                  className="w-full px-5 py-4 border-2 border-slate-200 focus:border-purple-500 rounded-2xl text-lg font-bold text-slate-800 outline-none transition"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => goToQuestion(currentQuestion - 1)}
              disabled={currentQuestion === 0}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5"
            >
              <span>←</span> የቀደመው / Prev
            </button>

            {/* Quick question pill buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              {questions.map((q, idx) => {
                const isAns = answers[q.id] !== undefined && answers[q.id] !== '';
                const isCurr = idx === currentQuestion;

                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx)}
                    className={`w-8 h-8 rounded-xl text-xs font-black transition ${
                      isCurr
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : isAns
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {currentQuestion < questions.length - 1 ? (
              <button
                onClick={() => goToQuestion(currentQuestion + 1)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition flex items-center gap-1.5"
              >
                <span>ቀጣይ / Next</span>
                <span>→</span>
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-1.5"
              >
                <span>📤 አስገባ / Submit</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ready to Submit Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6 text-center space-y-3">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
            ⚠️ {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <h4 className="font-black text-slate-800 text-base">ሁሉንም መልሰሃል/ሻል? / All done?</h4>
            <p className="text-xs text-slate-500 font-medium">
              {answeredCount} ከ {questions.length} ጥያቄዎች ተመልሰዋል ({questions.length - answeredCount} ይቀራል)
            </p>
          </div>

          <button
            onClick={submitQuiz}
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 text-white font-black rounded-2xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>በማስገባት ላይ...</span>
              </>
            ) : (
              <>
                <span>📤 ፈተናውን አስገባ / Submit Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl mx-auto flex items-center justify-center text-3xl">
              📤
            </div>
            <h3 className="text-xl font-black text-slate-800">ፈተናውን ማስገባት ትፈልጋለህ/ሽ?</h3>
            <p className="text-xs text-slate-500 font-medium">
              Are you sure you want to submit? Your answers will be graded immediately!
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
              >
                ተመለስ / Review
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 text-white font-black rounded-2xl text-xs shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'እያስገባ ነው...' : 'አዎ አስገባ / Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}