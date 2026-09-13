import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function WorksheetActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGraded, setIsGraded] = useState(false);

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/activities/${id}`);
      setActivity(response.data.activity);
      setIsGraded(response.data.activity.submission_status === 'graded');
      if (response.data.activity.submission_url) {
        setFileUrl(response.data.activity.submission_url);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError('File is too large. Maximum size is 100 MB.');
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('File type not allowed. Please upload PDF, image, or Word document.');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    setProgress(0);
    setError('');

    axiosClient.post('/uploads/file', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
      },
    }).then(({ data }) => {
      setFileUrl(data.url);
      setUploading(false);
      setProgress(0);
    }).catch((err) => {
      setError(err.response?.data?.error || 'Could not upload the file');
      setUploading(false);
      setProgress(0);
    });
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!fileUrl.trim()) {
      setError('Please enter a file URL or upload a file');
      return;
    }
  };

  const handleSubmit = async () => {
    if (!fileUrl.trim()) {
      setError('Please upload a file or provide a file URL');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      await axiosClient.post(`/child/activities/${id}/submit`, {
        submission_text: 'Worksheet submitted',
        file_url: fileUrl,
      });
      setSuccessMessage('Excellent! Your worksheet has been submitted! 📝');
      await fetchActivity();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit activity');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading activity... 📝</p>
        </div>
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
          <span className="mr-2">←</span> Back
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <p className="text-red-700 font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </p>
        </div>
      </div>
    );
  }

  const hasWorksheetFile = activity.resource_url || activity.worksheet_url;
  const worksheetFileUrl = resolveFileUrl(activity.resource_url || activity.worksheet_url);
  const isPDF = hasWorksheetFile && worksheetFileUrl.toLowerCase().includes('.pdf');
  const isImage = hasWorksheetFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(worksheetFileUrl);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">📝</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{activity.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Lesson: {activity.lesson_title}</span>
              <span>•</span>
              <span>Course: {activity.course_title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isGraded && <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-1">✅ Graded</span>}
            {!isGraded && <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">📝 Submit Worksheet</span>}
          </div>
        </div>

        {activity.description && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-2">📋 Instructions</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{activity.description}</p>
          </div>
        )}

        {activity.instructions && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-400">
            <h3 className="font-bold text-yellow-800 mb-2">🎯 What to Do</h3>
            <p className="text-gray-700">{activity.instructions}</p>
          </div>
        )}
      </div>

      {/* Worksheet Viewer */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>📄</span> Worksheet
          </h2>
        </div>

        <div className="p-6">
          {hasWorksheetFile && (
            <div className="mb-6">
              {isPDF && (
                <div className="w-full h-[60vh] rounded-xl overflow-hidden shadow-inner bg-gray-100">
                  <iframe
                    src={`${worksheetFileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                    title={activity.title}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              )}
              {isImage && (
                <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 rounded-xl">
                  <img
                    src={worksheetFileUrl}
                    alt={activity.title}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}
              {!isPDF && !isImage && (
                <div className="text-center py-12">
                  <a
                    href={worksheetFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
                  >
                    <span>📄</span> Open Worksheet
                  </a>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={worksheetFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
                >
                  <span>🔗</span> Open in New Tab
                </a>
                <a
                  href={worksheetFileUrl}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition"
                >
                  <span>⬇️</span> Download
                </a>
              </div>
            </div>
          )}

          {!hasWorksheetFile && (
            <div className="text-center py-12">
              <span className="text-6xl block mb-4">📝</span>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Worksheet File Provided</h3>
              <p className="text-gray-600 mb-6">Your teacher hasn't attached a worksheet file for this activity.</p>
              <p className="text-gray-500">You can still submit your completed work below.</p>
            </div>
          )}
        </div>
      </div>

      {/* Submission Section */}
      {!isGraded && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📤</span> Submit Your Worksheet
          </h2>
          
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl mb-4 animate-pulse">
              <p className="text-green-700 font-medium flex items-center gap-2">
                <span>🎉</span> {successMessage}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-4">
              <p className="text-red-700 font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Upload Your Completed Worksheet
              </label>
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${uploading ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 hover:border-yellow-400 hover:bg-yellow-50'}`}>
                <input
                  type="file"
                  id="worksheet-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
                <label htmlFor="worksheet-upload" className="cursor-pointer flex flex-col items-center gap-3">
                  <span className="text-4xl">📤</span>
                  <div className="text-gray-700">
                    <p className="font-medium text-lg">Drag & drop or click to upload</p>
                    <p className="text-sm text-gray-500">PDF, Word, or Image files • Max 100 MB</p>
                  </div>
                  {uploading && (
                    <div className="w-full max-w-md">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Uploading... {progress}%</p>
                    </div>
                  )}
                  {fileUrl && !uploading && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-left">
                      <p className="font-medium text-green-800 flex items-center gap-2">
                        <span>✅</span> File ready: {fileUrl.split('/').pop()}
                      </p>
                    </div>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Supported: PDF, Word (.doc, .docx), Images (.jpg, .png, .gif) • Max 100 MB
              </p>
            </div>

            {/* Or URL */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Or Paste a File Link</label>
              <form onSubmit={handleUrlSubmit} className="flex gap-3">
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://example.com/your-worksheet.pdf"
                  className="flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-200"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-yellow-500 text-white rounded-xl font-medium hover:bg-yellow-600 transition"
                >
                  Use Link
                </button>
              </form>
            </div>

            {/* Current Submission */}
            {fileUrl && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                  <span>✅</span> Ready to Submit
                </h4>
                <p className="text-green-700 text-sm">File: {fileUrl.split('/').pop() || 'External link'}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                <p className="text-red-700 font-medium flex items-center gap-2">
                  <span>⚠️</span> {error}
                </p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl animate-pulse">
                <p className="text-green-700 font-medium flex items-center gap-2">
                  <span>🎉</span> {successMessage}
                </p>
              </div>
            )}

            {fileUrl && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-yellow-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Submit Worksheet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results for graded */}
      {isGraded && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> Your Results
          </h3>
          <div className="space-y-4">
            <p className="text-lg">
              <span className="text-gray-600">Score:</span>
              <span className="font-bold text-green-700 ml-2 text-2xl">
                {activity.score} / {activity.max_score || 100}
              </span>
            </p>
            {activity.feedback && (
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Teacher's Feedback:</p>
                <p className="text-gray-700 bg-white rounded-lg p-4 whitespace-pre-wrap">
                  {activity.feedback}
                </p>
              </div>
            )}
            {activity.submission_url && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <p className="font-bold text-blue-800 mb-2">Your Submission:</p>
                <a href={resolveFileUrl(activity.submission_url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                  <span>📄</span> View Submitted File
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Submit Your Worksheet?</h3>
            <p className="text-gray-600 mb-6 text-center">
              Your teacher will review your worksheet and give you feedback.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}