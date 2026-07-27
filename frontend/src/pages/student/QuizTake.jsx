import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

export default function QuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient.get(`/quizzes/${id}`).then(({ data }) => {
      setQuiz(data.quiz);
      setQuestions(data.questions);
      setLoading(false);
    });
  }, [id]);

  function setAnswer(questionId, value) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await axiosClient.post(`/quizzes/${id}/submit`, { answers });
      setResult(data.result);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit the quiz');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !quiz) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  if (result) {
    const pct = result.total_points > 0 ? Math.round((result.score / result.total_points) * 100) : 0;
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <p className="text-6xl">{pct >= 60 ? '🎉' : '💪'}</p>
          <h1 className="mt-4 text-2xl font-semibold text-slate-800">
            You scored {result.score} / {result.total_points}
          </h1>
          <p className="mt-2 text-slate-500">{pct}% — {pct >= 60 ? 'Great job!' : 'Keep practicing, you\'ll get there!'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 rounded-xl bg-sky-500 px-5 py-2.5 font-semibold text-white hover:bg-sky-600"
          >
            Back to lesson
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-slate-800">{quiz.title}</h1>
        {quiz.description && <p className="mb-6 text-sm text-slate-500">{quiz.description}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="mb-3 font-medium text-slate-800">
                {index + 1}. {q.question_text}
              </p>

              {q.question_type === 'mcq' && Array.isArray(q.options) ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : q.question_type === 'true_false' ? (
                <div className="flex gap-4">
                  {['True', 'False'].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-sky-500 py-3 font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit quiz'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
