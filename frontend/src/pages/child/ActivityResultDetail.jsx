import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ActivityResultDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResultDetail();
  }, [submissionId]);

  const fetchResultDetail = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/results/activities/${submissionId}`);
      setResult(response.data.activity_result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load activity result');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center max-w-lg mx-auto my-12">
        <span className="text-4xl block mb-2">😔</span>
        <p className="text-rose-700 font-bold mb-4">{error}</p>
        <button
          onClick={fetchResultDetail}
          className="px-6 py-2 bg-green-600 text-white font-bold rounded-2xl shadow hover:bg-green-700 transition"
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-green-600 hover:text-green-700 font-bold">
          <span className="mr-2">←</span> Back to Results
        </button>
      </div>

      {/* Result Card */}
      <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-green-100">
        <div className="border-b-2 border-green-100 pb-6 mb-6">
          <h1 className="text-2xl font-black text-gray-800 mb-2">🎯 Activity Result</h1>
          <div className="flex items-center gap-2">
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              result.status === 'graded' ? 'bg-green-100 text-green-700' :
              result.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {result.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-500">Activity</p>
            <p className="text-lg font-black text-gray-800">{result.activity_title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">Course</p>
              <p className="text-gray-800">{result.course_title}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Lesson</p>
              <p className="text-gray-800">{result.lesson_title}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-gray-500">Type</p>
            <p className="text-gray-800 capitalize">{result.activity_type.replace(/_/g, ' ')}</p>
          </div>

          {result.instructions && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-bold text-gray-500 mb-2">Instructions</p>
              <p className="text-gray-700">{result.instructions}</p>
            </div>
          )}

          {result.score !== null && (
            <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4">
              <div>
                <p className="text-sm font-bold text-gray-500">Score</p>
                <p className="text-2xl font-black text-green-600">{result.score} / {result.max_score}</p>
              </div>
              {result.percentage && (
                <div>
                  <p className="text-sm font-bold text-gray-500">Percentage</p>
                  <p className="text-2xl font-black text-green-600">{result.percentage}%</p>
                </div>
              )}
            </div>
          )}

          {result.feedback && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm font-bold text-green-800 mb-2">Instructor Feedback</p>
              <p className="text-green-900 italic">"{result.feedback}"</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-gray-500">Submitted</p>
              <p className="text-gray-800">{new Date(result.submitted_at).toLocaleString()}</p>
            </div>
            {result.reviewed_at && (
              <div>
                <p className="font-bold text-gray-500">Graded</p>
                <p className="text-gray-800">{new Date(result.reviewed_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {result.instructor_name && (
            <div className="text-sm text-gray-500">
              <p className="font-bold">Graded by: {result.instructor_name}</p>
            </div>
          )}

          {result.submission_url && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-bold text-gray-500 mb-2">Submitted Work</p>
              <a
                href={result.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition"
              >
                <span>📄</span> View Submitted Work
              </a>
            </div>
          )}

          {result.submission_text && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-bold text-gray-500 mb-2">Submitted Text</p>
              <p className="text-gray-700 whitespace-pre-wrap">{result.submission_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
