import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

export default function ActivitySubmit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activity, setActivity] = useState(null);
  const [children, setChildren] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      const activityRes = await axiosClient.get(`/activities/${id}`);
      setActivity(activityRes.data.activity);

      if (user.role === 'parent') {
        const childrenRes = await axiosClient.get('/students/children');
        setChildren(childrenRes.data.children);
      }
      setLoading(false);
    }
    load();
  }, [id, user.role]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { submission_url: submissionUrl || undefined, submission_text: submissionText || undefined };
      if (user.role === 'parent') {
        if (!studentId) throw new Error('Select which child this is for');
        payload.student_id = studentId;
      }
      await axiosClient.post(`/activities/${id}/submissions`, payload);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !activity) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  if (submitted) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <p className="text-6xl">✅</p>
          <h1 className="mt-4 text-2xl font-semibold text-slate-800">Submitted!</h1>
          <p className="mt-2 text-slate-500">Your instructor will review it soon.</p>
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
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-slate-800">{activity.title}</h1>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-600">
          {activity.activity_type.replace(/_/g, ' ')}
        </p>
        <p className="mb-6 text-slate-600">{activity.instructions}</p>

        {activity.resource_url && (
          <a
            href={activity.resource_url}
            target="_blank"
            rel="noreferrer"
            className="mb-6 inline-block text-sm text-sky-600 hover:underline"
          >
            📎 Download activity resource
          </a>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          {user.role === 'parent' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Which child?</label>
              <select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
              >
                <option value="">Select child</option>
                {children.filter((c) => String(c.age_group_id) === String(activity.course_age_group_id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {activity.requires_upload && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Upload link (photo, audio, or file URL)
              </label>
              <input
                required
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-sky-500 py-3 font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit activity'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
