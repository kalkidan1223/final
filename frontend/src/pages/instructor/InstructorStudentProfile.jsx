import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MdArrowBack, MdTrendingUp, MdCalendarToday, MdGrade, MdFeedback } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

export default function InstructorStudentProfile() {
  const { studentId } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    axiosClient.get(`/instructor/students/${studentId}`)
      .then(({ data: res }) => setData(res))
      .catch(err => setError(err.response?.data?.error || 'Could not load student profile'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    </InstructorLayout>
  );

  if (error) return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-center">
          <p className="text-red-700 font-semibold">⚠️ {error}</p>
          <Link to="/instructor/students" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">← Back to Students</Link>
        </div>
      </div>
    </InstructorLayout>
  );

  const { student, progress, attendance_rate, avg_score, recent_submissions, feedback_history } = data || {};

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Back */}
        <Link to="/instructor/students" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition">
          <MdArrowBack /> Back to Students
        </Link>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {student?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{student?.full_name}</h1>
            <p className="text-slate-500 text-sm capitalize">{student?.account_type || 'Parent-managed'} • {student?.age_group_name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-indigo-600">{avg_score ?? 0}%</div>
            <div className="text-xs text-slate-400">Average Score</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { emoji: '📈', label: 'Progress',   value: `${progress?.overall ?? 0}%` },
            { emoji: '📅', label: 'Attendance', value: `${attendance_rate ?? 0}%` },
            { emoji: '✅', label: 'Activities', value: `${progress?.activities_done ?? 0}/${progress?.activities_total ?? 0}` },
            { emoji: '🏆', label: 'Avg Score',  value: `${avg_score ?? 0}%` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="font-bold text-slate-800 text-lg">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bars per course */}
        {progress?.courses?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MdTrendingUp className="text-indigo-600" /> Course Progress</h2>
            <div className="space-y-4">
              {progress.courses.map(c => (
                <div key={c.course_id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700">{c.course_title}</span>
                    <span className="text-indigo-600 font-bold">{c.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent submissions */}
        {recent_submissions?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MdGrade className="text-indigo-600" /> Recent Submissions</h2>
            <div className="space-y-2">
              {recent_submissions.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.activity_title}</p>
                    <p className="text-xs text-slate-400">{new Date(s.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.score != null && <span className="text-sm font-bold text-indigo-600">{s.score}/{s.max_score}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback history */}
        {feedback_history?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MdFeedback className="text-indigo-600" /> Teacher Feedback</h2>
            <div className="space-y-3">
              {feedback_history.map(f => (
                <div key={f.id} className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <p className="text-sm text-slate-700 leading-relaxed">{f.feedback}</p>
                  <p className="text-xs text-slate-400 mt-2">{f.activity_title} · {new Date(f.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
