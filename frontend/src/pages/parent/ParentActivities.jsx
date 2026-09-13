import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  MdAssignment,
  MdCheckCircle,
  MdPending,
  MdFeedback,
  MdVisibility,
  MdClose,
  MdSend,
  MdFilterList,
} from 'react-icons/md';

export default function ParentActivities() {
  const { selectedChildId, childrenList } = useOutletContext() || {};
  const [currentChildId, setCurrentChildId] = useState(selectedChildId || (childrenList?.[0]?.id?.toString() || ''));
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  // View submission modal
  const [viewingActivity, setViewingActivity] = useState(null);

  // Submit on behalf modal
  const [submittingActivity, setSubmittingActivity] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedChildId) {
      setCurrentChildId(selectedChildId);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (currentChildId) {
      fetchActivities(currentChildId);
    } else if (childrenList?.length > 0) {
      setCurrentChildId(childrenList[0].id.toString());
      fetchActivities(childrenList[0].id.toString());
    } else {
      setLoading(false);
    }
  }, [currentChildId, childrenList]);

  async function fetchActivities(childId) {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/parent/children/${childId}/activities`);
      setActivities(res.data.activities || []);
    } catch (err) {
      console.error('Failed to load child activities:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedChild = childrenList?.find((c) => c.id.toString() === currentChildId?.toString());
  const isParentManaged = selectedChild ? !selectedChild.user_id : true;

  const handleSubmitOnBehalf = async (e) => {
    e.preventDefault();
    if (!submittingActivity) return;

    try {
      setIsSubmitting(true);
      await axiosClient.post(
        `/parent/children/${currentChildId}/activities/${submittingActivity.id}/submit`,
        {
          submission_text: submissionText,
          file_url: submissionUrl,
        }
      );
      await fetchActivities(currentChildId);
      setSubmittingActivity(null);
      setSubmissionText('');
      setSubmissionUrl('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = activities.filter((act) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'not_started') return act.submission_status === 'not_started';
    if (statusFilter === 'pending') return act.submission_status === 'pending';
    if (statusFilter === 'graded') return act.submission_status === 'graded';
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdAssignment className="text-blue-600 text-3xl" />
            <span>Learning Activities</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review worksheets, writing exercises, submissions, and instructor feedback.
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: `All Activities (${activities.length})` },
          { key: 'pending', label: `Pending Review (${activities.filter((a) => a.submission_status === 'pending').length})` },
          { key: 'graded', label: `Graded (${activities.filter((a) => a.submission_status === 'graded').length})` },
          { key: 'not_started', label: `Not Started (${activities.filter((a) => a.submission_status === 'not_started').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading activities...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm text-slate-500">
          No activities found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((act) => {
            const isGraded = act.submission_status === 'graded';
            const isPending = act.submission_status === 'pending';
            const notStarted = act.submission_status === 'not_started';

            return (
              <div
                key={act.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 mr-2">
                        {act.activity_type}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 mt-1">{act.title}</h3>
                    </div>

                    {/* Status badge */}
                    {isGraded && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-xs">
                        Score: {act.score} / {act.max_score || 10}
                      </span>
                    )}
                    {isPending && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">
                        Pending Review
                      </span>
                    )}
                    {notStarted && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-xs">
                        Not Started
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">
                    Course: <strong>{act.course_title}</strong> • Lesson: {act.lesson_title}
                  </div>

                  {act.feedback && (
                    <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 p-2.5 rounded-2xl space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <MdFeedback className="text-blue-600" />
                        <span>Teacher Feedback:</span>
                      </div>
                      <p className="italic leading-relaxed">"{act.feedback}"</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setViewingActivity(act)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <MdVisibility />
                    <span>View Submission</span>
                  </button>

                  {isParentManaged && (
                    <button
                      onClick={() => {
                        setSubmittingActivity(act);
                        setSubmissionText(act.submission_text || '');
                        setSubmissionUrl(act.submission_url || '');
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                    >
                      {act.submission_id ? 'Update Submission' : 'Submit for Child'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View Details Modal ── */}
      {viewingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{viewingActivity.title}</h3>
                <p className="text-xs text-slate-500">Activity Submission & Review</p>
              </div>
              <button onClick={() => setViewingActivity(null)} className="text-slate-400 hover:text-slate-600">
                <MdClose className="text-2xl" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[10px]">Status</span>
                <span className="font-extrabold text-slate-800 capitalize">{viewingActivity.submission_status?.replace('_', ' ')}</span>
              </div>

              <div>
                <span className="font-bold text-slate-400 block uppercase text-[10px]">Submitted Content</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 mt-1 whitespace-pre-wrap">
                  {viewingActivity.submission_text || 'No text submitted.'}
                </p>
              </div>

              {viewingActivity.submission_url && (
                <div>
                  <span className="font-bold text-slate-400 block uppercase text-[10px]">Attached File / Link</span>
                  <a
                    href={viewingActivity.submission_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Open Attachment ➔
                  </a>
                </div>
              )}

              {viewingActivity.feedback && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="font-bold text-blue-900 block text-[10px] uppercase">Instructor Feedback</span>
                  <p className="text-blue-800 mt-1 italic">"{viewingActivity.feedback}"</p>
                  {viewingActivity.score !== null && (
                    <div className="mt-2 font-black text-blue-900">Score: {viewingActivity.score} / {viewingActivity.max_score || 10}</div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingActivity(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit on behalf modal ── */}
      {submittingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Submit for {selectedChild?.full_name}</h3>
                <p className="text-xs text-slate-500">{submittingActivity.title}</p>
              </div>
              <button onClick={() => setSubmittingActivity(null)} className="text-slate-400 hover:text-slate-600">
                <MdClose className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSubmitOnBehalf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Child's Written Response or Activity Text
                </label>
                <textarea
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Type the response or notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uploaded Worksheet URL or Document Link (Optional)
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmittingActivity(null)}
                  className="px-4 py-2 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <MdSend />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit to Instructor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
