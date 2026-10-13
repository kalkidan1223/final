import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: '📝' },
  { value: 'true_false', label: 'True / False', icon: '✓' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank', icon: '✏️' },
  // Matching questions need a pairs editor; author those from the lesson's
  // quiz builder (QuizBuilder), which owns the matching UI.
];

export default function InstructorQuizManage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  const [form, setForm] = useState({
    question_text: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
  });

  async function load() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/quizzes/${id}`);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
    } catch (err) {
      setError('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleAddQuestion(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!form.question_text.trim()) {
      setError('Please enter a question');
      return;
    }
    if (!form.correct_answer.trim()) {
      setError('Please enter the correct answer');
      return;
    }
    if (form.question_type === 'mcq') {
      const validOptions = form.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        setError('Please provide at least 2 options for multiple choice');
        return;
      }
    }

    try {
      const payload = {
        question_text: form.question_text,
        question_type: form.question_type,
        correct_answer: form.correct_answer,
        points: Number(form.points) || 1,
        options: form.question_type === 'mcq'
          ? form.options.filter(o => o.trim())
          : undefined,
      };
      await axiosClient.post(`/quizzes/${id}/questions`, payload);
      setSuccess('Question added successfully!');
      setForm({
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 1,
      });
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add question');
    }
  }

  async function handleDelete(questionId) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await axiosClient.delete(`/quiz-questions/${questionId}`);
      setSuccess('Question deleted successfully');
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete question');
    }
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading quiz...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black mb-2">📝 Quiz Builder</h1>
              <p className="text-blue-100 text-lg font-medium">{quiz?.title}</p>
              {quiz?.description && (
                <p className="text-blue-200 mt-2">{quiz.description}</p>
              )}
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
                <p className="text-sm font-medium text-blue-100">Total Questions</p>
                <p className="text-3xl font-black">{questions.length}</p>
              </div>
              <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur mt-2">
                <p className="text-sm font-medium text-blue-100">Total Points</p>
                <p className="text-3xl font-black">{totalPoints}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-800">Questions ({questions.length})</h2>
            <button
              onClick={() => setIsPreview(!isPreview)}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
            >
              {isPreview ? '✏️ Edit Mode' : '👁️ Preview Mode'}
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-300">
              <span className="text-6xl block mb-4">📝</span>
              <p className="text-gray-500 font-medium text-lg">No questions yet</p>
              <p className="text-gray-400 mt-2">Add your first question below to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100 hover:border-blue-200 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-black flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold">
                          {q.question_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-bold">
                          {q.points} pt(s)
                        </span>
                      </div>
                      <p className="text-lg font-bold text-gray-800 mb-3">{q.question_text}</p>

                      {q.question_type === 'mcq' && q.options && (
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, idx) => (
                            <div
                              key={idx}
                              className={`px-4 py-2 rounded-xl border-2 ${
                                opt === q.correct_answer
                                  ? 'bg-green-50 border-green-300 text-green-800'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                              {opt}
                              {opt === q.correct_answer && ' ✓'}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.question_type === 'matching' && q.options && Array.isArray(q.options.pairs) && (
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.pairs.map((pair, idx) => (
                            <div key={idx} className="px-4 py-2 rounded-xl border-2 bg-gray-50 border-gray-200 text-gray-700">
                              <span className="font-bold mr-2">{idx + 1}.</span>
                              {pair.question} <span className="text-gray-400">→</span> {pair.answer}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.question_type !== 'matching' && (
                        <div className="mt-3 text-sm text-gray-500">
                          <span className="font-medium">Correct Answer:</span> {q.correct_answer}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="ml-4 px-4 py-2 bg-rose-100 text-rose-600 font-bold rounded-xl hover:bg-rose-200 transition"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Question Form */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-blue-100">
          <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <span>➕</span> Add New Question
          </h2>

          {error && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 mb-6">
              <p className="text-rose-700 font-bold">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6">
              <p className="text-green-700 font-bold">{success}</p>
            </div>
          )}

          <form onSubmit={handleAddQuestion} className="space-y-6">
            {/* Question Type Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Question Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, question_type: type.value })}
                    className={`p-4 rounded-2xl border-2 font-bold transition ${
                      form.question_type === type.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Question Text</label>
              <textarea
                required
                rows={3}
                placeholder="Enter your question here..."
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* MCQ Options */}
            {form.question_type === 'mcq' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Answer Options</label>
                <div className="space-y-2">
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2.5 focus:border-blue-500 focus:outline-none transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correct Answer */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Correct Answer
                {form.question_type === 'mcq' && ' (Select the letter: A, B, C, or D)'}
              </label>
              <input
                required
                type="text"
                placeholder={
                  form.question_type === 'mcq'
                    ? 'e.g., A'
                    : form.question_type === 'true_false'
                    ? 'true or false'
                    : 'Enter the correct answer'
                }
                value={form.correct_answer}
                onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Points</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                className="w-32 rounded-2xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-[1.02]"
            >
              ➕ Add Question
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
