import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  MdQuiz,
  MdCheckCircle,
  MdTrendingUp,
  MdHistory,
  MdScore,
} from 'react-icons/md';

export default function ParentQuizzes() {
  const { selectedChildId, childrenList } = useOutletContext() || {};
  const [currentChildId, setCurrentChildId] = useState(selectedChildId || (childrenList?.[0]?.id?.toString() || ''));
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    if (selectedChildId) {
      setCurrentChildId(selectedChildId);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (currentChildId) {
      fetchQuizzes(currentChildId);
    } else if (childrenList?.length > 0) {
      setCurrentChildId(childrenList[0].id.toString());
      fetchQuizzes(childrenList[0].id.toString());
    } else {
      setLoading(false);
    }
  }, [currentChildId, childrenList]);

  async function fetchQuizzes(childId) {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/parent/children/${childId}/quizzes`);
      setQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error('Failed to load child quizzes:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedChild = childrenList?.find((c) => c.id.toString() === currentChildId?.toString());

  // Metrics
  const takenQuizzes = quizzes.filter((q) => q.percentage !== null && q.percentage !== undefined);
  const avgScore =
    takenQuizzes.length > 0
      ? Math.round(takenQuizzes.reduce((acc, q) => acc + (q.percentage || 0), 0) / takenQuizzes.length)
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdQuiz className="text-blue-600 text-3xl" />
            <span>Quiz Results</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your child's quiz performance, scores, and completion history.
          </p>
        </div>

        {childrenList?.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Child:</span>
            <select
              value={currentChildId}
              onChange={(e) => setCurrentChildId(e.target.value)}
              className="bg-transparent text-sm font-extrabold text-slate-800 focus:outline-none"
            >
              {childrenList.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Quizzes</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{quizzes.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across assigned courses</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Quizzes</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{takenQuizzes.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Attempted and scored</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Score</div>
          <div className="text-3xl font-black text-blue-600 mt-1">{avgScore}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Overall quiz performance</div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading quiz results...</span>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm text-slate-500">
          No quizzes currently found for this child's courses.
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-lg text-slate-900">
              Quiz Records for {selectedChild?.full_name}
            </h3>
            <span className="text-xs font-bold text-slate-500">{quizzes.length} Quizzes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => {
              const hasTaken = quiz.percentage !== null && quiz.percentage !== undefined;

              return (
                <div
                  key={quiz.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">{quiz.title}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {quiz.course_title} • {quiz.lesson_title}
                      </div>
                    </div>

                    {hasTaken ? (
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-black ${
                          quiz.percentage >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : quiz.percentage >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {quiz.percentage}%
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">
                        Not Taken
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">SCORE</span>
                      <span className="font-extrabold text-slate-800">
                        {quiz.score !== null ? `${quiz.score} / ${quiz.total_points || 10}` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">ATTEMPTS</span>
                      <span className="font-extrabold text-slate-800">{quiz.attempt_count || 0}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">QUESTIONS</span>
                      <span className="font-extrabold text-slate-800">{quiz.total_questions || '—'}</span>
                    </div>
                  </div>

                  {quiz.completed_at && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Taken on: {new Date(quiz.completed_at).toLocaleDateString()}</span>
                      {quiz.time_taken && <span>Duration: {quiz.time_taken}s</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
