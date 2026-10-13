import { useState, useEffect } from 'react';
import { 
  MdAssignment, MdQuiz, MdPeople, MdPending, 
  MdCheckCircle, MdSearch, MdFilterList, MdVisibility,
  MdClose, MdEdit, MdSave
} from 'react-icons/md';
import axiosClient from '../../api/axiosClient';

function InstructorResults() {
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState('submissions'); // submissions | quizzes
  const [activitySubmissions, setActivitySubmissions] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    course_id: '',
    quiz_id: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'reviewed',
    score: '',
    feedback: ''
  });

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchActivitySubmissions();
    } else {
      fetchQuizResults();
    }
  }, [activeTab, filters, pagination.offset]);

  async function fetchOverview() {
    try {
      const res = await axiosClient.get('/instructor/results/overview');
      setOverview(res.data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    }
  }

  async function fetchActivitySubmissions() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset,
        ...(filters.status && { status: filters.status }),
        ...(filters.course_id && { course_id: filters.course_id })
      });
      
      const res = await axiosClient.get(`/instructor/results/activity-submissions?${params}`);
      setActivitySubmissions(res.data.submissions);
      setPagination(prev => ({ ...prev, total: res.data.total }));
    } catch (err) {
      console.error('Failed to fetch activity submissions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuizResults() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset,
        ...(filters.course_id && { course_id: filters.course_id }),
        ...(filters.quiz_id && { quiz_id: filters.quiz_id })
      });
      
      const res = await axiosClient.get(`/instructor/results/quiz-results?${params}`);
      setQuizResults(res.data.results);
      setPagination(prev => ({ ...prev, total: res.data.total }));
    } catch (err) {
      console.error('Failed to fetch quiz results:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  }

  function handlePageChange(direction) {
    setPagination(prev => ({
      ...prev,
      offset: direction === 'next' 
        ? prev.offset + prev.limit 
        : Math.max(0, prev.offset - prev.limit)
    }));
  }

  function handleViewSubmission(submission) {
    setSelectedItem(submission);
    setReviewForm({
      status: submission.status === 'pending' ? 'reviewed' : submission.status,
      score: submission.score || '',
      feedback: submission.feedback || ''
    });
  }

  function handleViewQuizResult(result) {
    setSelectedItem(result);
  }

  function closeModal() {
    setSelectedItem(null);
    setReviewForm({ status: 'reviewed', score: '', feedback: '' });
  }

  async function handleSubmitReview() {
    if (!selectedItem) return;
    
    try {
      await axiosClient.put(`/submissions/${selectedItem.id}/review`, reviewForm);
      alert('Review submitted successfully!');
      closeModal();
      fetchActivitySubmissions();
      fetchOverview();
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert('Failed to submit review: ' + (err.response?.data?.error || err.message));
    }
  }

  const filteredSubmissions = activitySubmissions.filter(sub => 
    searchTerm === '' || 
    sub.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.activity_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.course_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuizResults = quizResults.filter(result =>
    searchTerm === '' ||
    result.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.quiz_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.course_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Results & Analytics</h1>
        <p className="text-slate-600 mt-1">View and manage student submissions and quiz results</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <MdPeople className="text-2xl text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Total Students</div>
              <div className="text-2xl font-bold text-slate-900">{overview.total_students}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <MdAssignment className="text-2xl text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Activity Submissions</div>
              <div className="text-2xl font-bold text-slate-900">{overview.total_submissions}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <MdPending className="text-2xl text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Pending Reviews</div>
              <div className="text-2xl font-bold text-slate-900">{overview.pending_reviews}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <MdQuiz className="text-2xl text-green-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Quizzes Taken</div>
              <div className="text-2xl font-bold text-slate-900">{overview.total_quizzes_taken}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <MdCheckCircle className="text-2xl text-indigo-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Avg Quiz Score</div>
              <div className="text-2xl font-bold text-slate-900">
                {overview.average_quiz_score.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-rose-100 flex items-center justify-center">
              <MdCheckCircle className="text-2xl text-rose-600" />
            </div>
            <div>
              <div className="text-sm text-slate-600">Avg Activity Score</div>
              <div className="text-2xl font-bold text-slate-900">
                {overview.average_activity_score.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'submissions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <MdAssignment />
                <span>Activity Submissions</span>
                {overview.pending_reviews > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    {overview.pending_reviews}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('quizzes')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'quizzes'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <MdQuiz />
                <span>Quiz Results</span>
              </div>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-slate-200 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input
                type="text"
                placeholder="Search by student, activity, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            {activeTab === 'submissions' && (
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="graded">Graded</option>
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : activeTab === 'submissions' ? (
            <>
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No activity submissions found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSubmissions.map(sub => (
                    <div key={sub.id} className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{sub.student_name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              sub.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              sub.status === 'graded' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {sub.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-1">{sub.activity_title}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{sub.course_title}</span>
                            <span>•</span>
                            <span>{sub.lesson_title}</span>
                            <span>•</span>
                            <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                          </div>
                          {sub.status === 'graded' && sub.percentage !== null && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium text-slate-700">Score: </span>
                              <span className={`font-semibold ${sub.percentage >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                                {sub.percentage.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleViewSubmission(sub)}
                          className="px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <MdVisibility />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {filteredQuizResults.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No quiz results found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuizResults.map(result => (
                    <div key={result.id} className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{result.student_name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              result.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {result.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-1">{result.quiz_title}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{result.course_title}</span>
                            <span>•</span>
                            <span>{result.lesson_title}</span>
                            <span>•</span>
                            <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <div>
                              <span className="font-medium text-slate-700">Score: </span>
                              <span className={`font-semibold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                                {result.score}/{result.total_points} ({result.percentage?.toFixed(1)}%)
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">Passing: </span>
                              <span className="text-slate-600">{result.quiz_passing_score}%</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleViewQuizResult(result)}
                          className="px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <MdVisibility />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {activeTab === 'submissions' ? 'Activity Submission Details' : 'Quiz Result Details'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <MdClose className="text-xl text-slate-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {activeTab === 'submissions' ? (
                <>
                  {/* Student Info */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Student</h3>
                    <p className="text-lg font-semibold text-slate-900">{selectedItem.student_name}</p>
                  </div>

                  {/* Activity Info */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Activity</h3>
                    <p className="text-slate-900">{selectedItem.activity_title}</p>
                    <p className="text-sm text-slate-600">{selectedItem.course_title} - {selectedItem.lesson_title}</p>
                  </div>

                  {/* Submission Date */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Submitted</h3>
                    <p className="text-slate-900">{new Date(selectedItem.submitted_at).toLocaleString()}</p>
                  </div>

                  {/* Submission Content */}
                  {selectedItem.submission_text && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Submission Text</h3>
                      <div className="bg-slate-50 rounded-lg p-4 text-slate-900 whitespace-pre-wrap">
                        {selectedItem.submission_text}
                      </div>
                    </div>
                  )}

                  {selectedItem.submission_url && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Submitted File</h3>
                      <a
                        href={selectedItem.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 underline"
                      >
                        View File
                      </a>
                    </div>
                  )}

                  {/* Review Section */}
                  {selectedItem.status === 'pending' ? (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Grade Submission</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Status
                          </label>
                          <select
                            value={reviewForm.status}
                            onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="reviewed">Reviewed (No Score)</option>
                            <option value="graded">Graded</option>
                          </select>
                        </div>

                        {reviewForm.status === 'graded' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Score (out of {selectedItem.activity_max_score})
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={selectedItem.activity_max_score}
                              value={reviewForm.score}
                              onChange={(e) => setReviewForm({ ...reviewForm, score: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="Enter score"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Feedback (Optional)
                          </label>
                          <textarea
                            value={reviewForm.feedback}
                            onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Provide feedback to the student..."
                          />
                        </div>

                        <button
                          onClick={handleSubmitReview}
                          disabled={reviewForm.status === 'graded' && !reviewForm.score}
                          className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <MdSave />
                          <span>Submit Review</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Review</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-slate-600">Status: </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            selectedItem.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedItem.status}
                          </span>
                        </div>
                        {selectedItem.percentage !== null && (
                          <div>
                            <span className="text-sm text-slate-600">Score: </span>
                            <span className="font-semibold text-slate-900">
                              {selectedItem.percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {selectedItem.feedback && (
                          <div>
                            <span className="text-sm text-slate-600">Feedback: </span>
                            <p className="mt-1 text-slate-900">{selectedItem.feedback}</p>
                          </div>
                        )}
                        {selectedItem.reviewed_at && (
                          <div>
                            <span className="text-sm text-slate-600">Reviewed: </span>
                            <span className="text-slate-900">{new Date(selectedItem.reviewed_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Quiz Result Details */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Student</h3>
                    <p className="text-lg font-semibold text-slate-900">{selectedItem.student_name}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Quiz</h3>
                    <p className="text-slate-900">{selectedItem.quiz_title}</p>
                    <p className="text-sm text-slate-600">{selectedItem.course_title} - {selectedItem.lesson_title}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Submitted</h3>
                    <p className="text-slate-900">{new Date(selectedItem.submitted_at).toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Score</h3>
                      <p className="text-2xl font-bold text-slate-900">
                        {selectedItem.score}/{selectedItem.total_points}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-1">Percentage</h3>
                      <p className={`text-2xl font-bold ${selectedItem.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedItem.percentage?.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Result</h3>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      selectedItem.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedItem.passed ? 'Passed' : 'Failed'} (Passing: {selectedItem.quiz_passing_score}%)
                    </span>
                  </div>

                  {selectedItem.answers && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Student Answers</h3>
                      <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                          {JSON.stringify(selectedItem.answers, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default InstructorResults;
