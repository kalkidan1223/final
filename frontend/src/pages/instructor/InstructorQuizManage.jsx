import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

const QUESTION_TYPES = ['mcq', 'true_false', 'fill_in_the_blank', 'matching'];

export default function InstructorQuizManage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    question_text: '', question_type: 'mcq', options: '', correct_answer: '', points: 1,
  });

  async function load() {
    setLoading(true);
    const { data } = await axiosClient.get(`/quizzes/${id}`);
    setQuiz(data.quiz);
    setQuestions(data.questions);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleAddQuestion(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        question_text: form.question_text,
        question_type: form.question_type,
        correct_answer: form.correct_answer,
        points: Number(form.points) || 1,
        options: form.question_type === 'mcq'
          ? form.options.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
      };
      await axiosClient.post(`/quizzes/${id}/questions`, payload);
      setForm({ question_text: '', question_type: 'mcq', options: '', correct_answer: '', points: 1 });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add question');
    }
  }

  async function handleDelete(questionId) {
    if (!confirm('Delete this question?')) return;
    await axiosClient.delete(`/quiz-questions/${questionId}`);
    await load();
  }

  if (loading || !quiz) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-slate-800">{quiz.title} — questions</h1>

        <ul className="mb-8 space-y-2">
          {questions.map((q, index) => (
            <li key={q.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-800">{index + 1}. {q.question_text}</p>
                  <p className="text-xs text-slate-500">
                    {q.question_type.replace(/_/g, ' ')} · correct: {q.correct_answer} · {q.points} pt(s)
                  </p>
                </div>
                <button onClick={() => handleDelete(q.id)} className="text-sm text-rose-500 hover:underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
          {questions.length === 0 && <p className="text-slate-500">No questions yet.</p>}
        </ul>

        <form onSubmit={handleAddQuestion} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-medium text-slate-700">Add a question</h2>
          <input
            required
            placeholder="Question text"
            value={form.question_text}
            onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
          />
          <div className="flex gap-2">
            <select
              value={form.question_type}
              onChange={(e) => setForm((f) => ({ ...f, question_type: e.target.value }))}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5"
            >
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <input
              type="number"
              min="1"
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
              className="w-24 rounded-xl border border-slate-200 px-4 py-2.5"
              placeholder="Points"
            />
          </div>
          {form.question_type === 'mcq' && (
            <input
              placeholder="Options, comma separated (e.g. Cat, Dog, Bird)"
              value={form.options}
              onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
            />
          )}
          <input
            required
            placeholder="Correct answer"
            value={form.correct_answer}
            onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="rounded-xl bg-sky-500 px-5 py-2.5 font-semibold text-white hover:bg-sky-600">
            Add question
          </button>
        </form>
      </div>
    </Layout>
  );
}
