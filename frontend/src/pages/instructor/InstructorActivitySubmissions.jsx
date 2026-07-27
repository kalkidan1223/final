import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-sky-100 text-sky-700',
  graded: 'bg-emerald-100 text-emerald-700',
};

function GradeForm({ submission, onGraded }) {
  const [score, setScore] = useState(submission.score ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(status) {
    setSaving(true);
    try {
      await axiosClient.put(`/submissions/${submission.id}/review`, {
        status,
        score: status === 'graded' ? Number(score) : undefined,
        feedback,
      });
      onGraded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Score"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        <input
          placeholder="Feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={saving}
          onClick={() => submit('graded')}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          Save grade
        </button>
        <button
          disabled={saving}
          onClick={() => submit('reviewed')}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
        >
          Mark reviewed (no score)
        </button>
      </div>
    </div>
  );
}

export default function InstructorActivitySubmissions() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [activityRes, submissionsRes] = await Promise.all([
      axiosClient.get(`/activities/${id}`),
      axiosClient.get(`/activities/${id}/submissions`),
    ]);
    setActivity(activityRes.data.activity);
    setSubmissions(submissionsRes.data.submissions);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading || !activity) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-slate-800">{activity.title}</h1>
        <p className="mb-6 text-sm text-slate-500">Max score: {activity.max_score}</p>

        <ul className="space-y-4">
          {submissions.map((sub) => (
            <li key={sub.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-800">{sub.student_name}</p>
                  <p className="text-xs text-slate-500">
                    Submitted by {sub.submitted_by} · {new Date(sub.submitted_at).toLocaleString()}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[sub.status]}`}>
                  {sub.status}
                </span>
              </div>

              {sub.submission_text && <p className="mt-2 text-sm text-slate-700">{sub.submission_text}</p>}
              {sub.submission_url && (
                <a href={sub.submission_url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-sky-600 hover:underline">
                  View submission →
                </a>
              )}

              {sub.status === 'graded' ? (
                <p className="mt-3 text-sm text-emerald-700">
                  Graded: {sub.score}/{activity.max_score} {sub.feedback && `— "${sub.feedback}"`}
                </p>
              ) : (
                <GradeForm submission={sub} onGraded={load} />
              )}
            </li>
          ))}
          {submissions.length === 0 && <p className="text-slate-500">No submissions yet.</p>}
        </ul>
      </div>
    </Layout>
  );
}
