import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AskTeacherModal from '../../components/child/AskTeacherModal';

const STATUS_STYLES = {
  WAITING_FOR_ANSWER: { label: 'Waiting for Answer', icon: '⏳', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  ANSWERED: { label: 'Answered', icon: '✅', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  CLOSED: { label: 'Closed', icon: '🔒', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
};

function formatDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export default function ChildQuestions() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, answered: 0 });
  const [limit, setLimit] = useState(2);
  const [tab, setTab] = useState('waiting');
  const [openId, setOpenId] = useState(searchParams.get('open') || null);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    const open = searchParams.get('open');
    if (open) {
      setOpenId(open);
      const q = questions.find((x) => String(x.id) === String(open));
      if (q) setTab(q.status === 'ANSWERED' ? 'answered' : 'waiting');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, questions.length]);

  async function fetchQuestions() {
    setLoading(true);
    setError('');
    try {
      const res = await axiosClient.get('/child/questions');
      setQuestions(res.data.questions || []);
      setCounts(res.data.counts || { total: 0, pending: 0, answered: 0 });
      setLimit(res.data.limit || 2);
    } catch (err) {
      setError(err.response?.data?.error || 'We could not load your questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const waiting = questions.filter((q) => q.status === 'WAITING_FOR_ANSWER');
  const answered = questions.filter((q) => q.status === 'ANSWERED');
  const shown = tab === 'waiting' ? waiting : answered;
  const atLimit = counts.pending >= limit;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-7xl animate-bounce">🙋</div>
        <p className="text-xl font-black text-purple-700 animate-pulse">Loading your questions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 px-2 sm:px-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-[2rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border-4 border-white/20">
        <h1 className="text-3xl sm:text-4xl font-black drop-shadow-lg">My Questions 🙋</h1>
        <p className="text-white/90 font-bold mt-1">Ask your teacher when you need help!</p>

        {/* Counters */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-center border-2 border-white/30">
            <div className="text-2xl sm:text-3xl font-black">{counts.pending}<span className="text-base">/{limit}</span></div>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">Waiting</div>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-center border-2 border-white/30">
            <div className="text-2xl sm:text-3xl font-black">{counts.answered}</div>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">Answered</div>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-center border-2 border-white/30">
            <div className="text-2xl sm:text-3xl font-black">{counts.total}</div>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">Total</div>
          </div>
        </div>

        {/* Ask button */}
        <button
          onClick={() => setAskOpen(true)}
          className="mt-5 w-full sm:w-auto px-6 py-4 rounded-2xl bg-white text-purple-700 font-black text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition"
        >
          🙋 Ask My Teacher
        </button>
      </div>

      {/* Limit banner */}
      {atLimit && (
        <div className="rounded-2xl bg-amber-50 border-4 border-amber-200 p-5 flex items-start gap-3">
          <span className="text-3xl">⏳</span>
          <div>
            <p className="font-black text-amber-800">My Questions: {counts.pending} of {limit} waiting for answers</p>
            <p className="text-sm font-bold text-amber-700 mt-1">
              You already have two questions waiting for your teacher. Please wait for an answer before asking another question.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 border-4 border-rose-200 p-5 text-rose-700 font-bold flex items-center justify-between gap-3">
          <span>😟 {error}</span>
          <button onClick={fetchQuestions} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'waiting', label: `Waiting for Answer (${waiting.length})` },
          { id: 'answered', label: `Answered (${answered.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-3 rounded-2xl font-black text-sm sm:text-base border-2 transition ${
              tab === t.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-300 shadow-lg'
                : 'bg-white text-slate-600 border-purple-100 hover:bg-purple-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="bg-white rounded-3xl border-4 border-purple-100 p-10 text-center shadow-md">
          <span className="text-6xl block mb-3">{tab === 'waiting' ? '🌟' : '📭'}</span>
          <p className="text-xl font-black text-slate-700">
            {tab === 'waiting' ? 'No questions waiting right now!' : 'No answered questions yet.'}
          </p>
          <p className="text-slate-500 font-medium mt-1">
            {tab === 'waiting' ? 'Tap Ask My Teacher when you need help.' : 'Your teacher’s answers will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((q) => {
            const style = STATUS_STYLES[q.status] || STATUS_STYLES.WAITING_FOR_ANSWER;
            const isOpen = String(openId) === String(q.id);
            return (
              <div key={q.id} className="bg-white rounded-3xl border-4 border-purple-100 shadow-md overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : q.id)}
                  className="w-full text-left p-5 hover:bg-purple-50/50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black border-2 ${style.cls}`}>
                          {style.icon} {style.label}
                        </span>
                        {q.course_title && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border-2 border-purple-100">
                            📚 {q.course_title}
                          </span>
                        )}
                        {q.lesson_title && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-700 border-2 border-pink-100">
                            📖 {q.lesson_title}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 line-clamp-2">{q.question_text}</p>
                      <p className="text-xs text-slate-400 font-semibold mt-2">
                        Asked {formatDate(q.created_at)}
                        {q.instructor_name ? ` · Teacher: ${q.instructor_name}` : ''}
                      </p>
                    </div>
                    <span className={`text-2xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t-4 border-purple-100 pt-4 space-y-3">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">Your question</p>
                      <p className="font-medium text-slate-700 whitespace-pre-wrap">{q.question_text}</p>
                    </div>

                    {q.status === 'ANSWERED' && q.answer_text ? (
                      <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4">
                        <p className="text-xs font-black text-emerald-700 uppercase tracking-wide mb-1">
                          ✅ {q.answered_by_name || q.instructor_name || 'Your teacher'} answered
                        </p>
                        <p className="font-medium text-emerald-900 whitespace-pre-wrap">{q.answer_text}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-2">
                          Answered {formatDate(q.answer_created_at || q.answered_at)}
                          {q.answer_updated_at && q.answer_updated_at !== q.answer_created_at
                            ? ` · edited ${formatDate(q.answer_updated_at)}` : ''}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
                        <p className="font-bold text-amber-800">⏳ Waiting for your teacher to answer…</p>
                        <p className="text-sm text-amber-700 font-medium mt-1">Check back soon!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link
        to="/child"
        className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-900 font-black text-sm"
      >
        ← Back to Home
      </Link>

      <AskTeacherModal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        onSubmitted={() => fetchQuestions()}
      />
    </div>
  );
}
