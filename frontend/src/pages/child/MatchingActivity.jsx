import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function MatchingActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pairs, setPairs] = useState({});
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matches, setMatches] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/activities/${id}`);
      setActivity(response.data.activity);
      setIsGraded(response.data.activity.submission_status === 'graded');
      
      // Parse activity_config for pairs
      if (response.data.activity.activity_config) {
        let config = response.data.activity.activity_config;
        if (typeof config === 'string') {
          config = JSON.parse(config);
        }
        if (config.pairs) {
          // Shuffle left and right items
          const leftItems = [...config.pairs].sort(() => Math.random() - 0.5);
          const rightItems = [...config.pairs].map(p => p.right).sort(() => Math.random() - 0.5);
          
          setPairs({
            left: leftItems,
            right: rightItems,
          });
        }
      }
      
      // Load existing submission
      if (response.data.activity.submission_data) {
        try {
          const saved = JSON.parse(response.data.activity.submission_data);
          setSubmissionData(saved);
          setMatches(saved.matches || {});
        } catch (e) {
          // Ignore
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLeft = (index, item) => {
    if (isGraded || matches[item.left] !== undefined) return;
    setSelectedLeft({ index, item });
    // Auto-match if right already selected
    if (selectedRight !== null) {
      checkMatch();
    }
  };

  const handleSelectRight = (index, item) => {
    if (isGraded || Object.values(matches).includes(item)) return;
    setSelectedRight({ index, item });
    // Auto-match if left already selected
    if (selectedLeft !== null) {
      checkMatch();
    }
  };

  const checkMatch = () => {
    if (!selectedLeft || !selectedRight) return;
    
    const leftItem = selectedLeft.item;
    const rightItem = selectedRight.item;
    
    // Find the correct pair
    const correctPair = pairs.left.find(p => p.left === leftItem.left);
    const isCorrect = correctPair && correctPair.right === rightItem;
    
    const newMatches = { ...matches };
    newMatches[leftItem.left] = {
      left: leftItem.left,
      right: rightItem,
      correct: isCorrect,
      leftIndex: selectedLeft.index,
      rightIndex: selectedRight.index,
    };
    
    setMatches(newMatches);
    setSelectedLeft(null);
    setSelectedRight(null);
    
    // Check if all matched
    if (Object.keys(newMatches).length === pairs.left.length) {
      setTimeout(() => {
        setShowConfirm(true);
      }, 500);
    }
  };

  const handleSubmit = async () => {
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      const correctCount = Object.values(matches).filter(m => m.correct).length;
      const totalPairs = pairs.left?.length || 1;
      const score = Math.round((correctCount / totalPairs) * (activity.max_score || 10));
      const submissionData = {
        matches,
        score,
        completedAt: new Date().toISOString(),
      };
      await axiosClient.post(`/child/activities/${id}/submit`, {
        submitted_content: JSON.stringify(submissionData),
        submission_text: `Matched ${correctCount} of ${totalPairs} pairs correctly!`,
      });
      setSuccessMessage('Excellent matching! Your answers have been submitted! 🎯');
      await fetchActivity();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit activity');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchStatus = (leftItem) => {
    const match = matches[leftItem.left];
    if (!match) return 'unmatched';
    return match.correct ? 'correct' : 'incorrect';
  };

  const getRightItemStatus = (rightItem) => {
    const matchedLeft = Object.values(matches).find(m => m.right === rightItem);
    if (!matchedLeft) return 'unmatched';
    return matchedLeft.correct ? 'correct' : 'incorrect';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading activity... 🔗</p>
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

  const canPlay = !isGraded;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🔗</span>
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
            {canPlay && <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">🔗 Match Items</span>}
          </div>
        </div>

        {activity.description && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-2">📋 Instructions</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{activity.description}</p>
          </div>
        )}

        {activity.instructions && (
          <div className="mt-4 p-4 bg-purple-50 rounded-xl border-l-4 border-purple-400">
            <h3 className="font-bold text-purple-800 mb-2">🎯 What to Do</h3>
            <p className="text-gray-700">{activity.instructions}</p>
          </div>
        )}
      </div>

      {/* Matching Game */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>🔗</span> Match the Pairs
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                ✅ {Object.values(matches).filter(m => m.correct).length} Correct
              </span>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                ❌ {Object.values(matches).filter(m => !m.correct).length} Incorrect
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                ❓ {pairs.left?.length - Object.keys(matches).length} Remaining
              </span>
            </div>
          </div>
          <p className="text-gray-600 mt-2 text-sm">
            {canPlay 
              ? 'Click an item on the left, then click its match on the right!' 
              : 'Review your matches below.'}
          </p>
        </div>

        <div className="p-6">
          {pairs.left && pairs.right && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 text-center mb-4 text-lg">
                  👈 Click to Select
                </h3>
                {pairs.left.map((pair, index) => {
                  const status = getMatchStatus(pair);
                  const isSelected = selectedLeft?.index === index;
                  return (
                    <div
                      key={`left-${index}`}
                      onClick={() => handleSelectLeft(index, pair)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                        status === 'correct' 
                          ? 'bg-green-50 border-green-400' 
                          : status === 'incorrect' 
                            ? 'bg-red-50 border-red-400' 
                            : isSelected 
                              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400' 
                              : 'bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                      } ${!canPlay ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-700 flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-left font-medium text-gray-800">{pair.left}</span>
                        {matches[pair.left] && (
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            matches[pair.left].correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {matches[pair.left].correct ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 text-center mb-4 text-lg">
                  👉 Find the Match
                </h3>
                {pairs.right.map((rightItem, index) => {
                  const status = getRightItemStatus(rightItem);
                  const isSelected = selectedRight?.index === index;
                  return (
                    <div
                      key={`right-${index}`}
                      onClick={() => handleSelectRight(index, rightItem)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                        status === 'correct' 
                          ? 'bg-green-50 border-green-400' 
                          : status === 'incorrect' 
                            ? 'bg-red-50 border-red-400' 
                            : isSelected 
                              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400' 
                              : 'bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                      } ${!canPlay ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center font-bold text-pink-700 flex-shrink-0">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1 text-left font-medium text-gray-800">{rightItem}</span>
                        {Object.values(matches).some(m => m.right === rightItem) && (
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            Object.values(matches).find(m => m.right === rightItem)?.correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {Object.values(matches).find(m => m.right === rightItem)?.correct ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {Object.keys(matches).length > 0 && (
          <div className="px-6 pb-6">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
              <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                <span>📊</span> Your Results
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-100 rounded-xl p-3">
                  <div className="text-2xl font-bold text-green-700">
                    {Object.values(matches).filter(m => m.correct).length}
                  </div>
                  <div className="text-sm text-green-700">Correct</div>
                </div>
                <div className="bg-red-100 rounded-xl p-3">
                  <div className="text-2xl font-bold text-red-700">
                    {Object.values(matches).filter(m => !m.correct).length}
                  </div>
                  <div className="text-sm text-red-700">Incorrect</div>
                </div>
                <div className="bg-blue-100 rounded-xl p-3">
                  <div className="text-2xl font-bold text-blue-700">
                    {Math.round((Object.values(matches).filter(m => m.correct).length / pairs.left.length) * 100)}%
                  </div>
                  <div className="text-sm text-blue-700">Score</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {canPlay && Object.keys(matches).length < (pairs.left?.length || 0) && (
          <div className="px-6 pb-6 text-center">
            <p className="text-gray-500 text-sm">
              Keep matching! {pairs.left.length - Object.keys(matches).length} pair{pairs.left.length - Object.keys(matches).length !== 1 ? 's' : ''} remaining.
            </p>
          </div>
        )}
      </div>

      {/* Submission Section */}
      {canPlay && Object.keys(matches).length === (pairs.left?.length || 0) && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📤</span> Submit Your Matches
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

          <div className="bg-purple-50 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-purple-800 mb-2">✨ All Pairs Matched!</h3>
            <p className="text-gray-700">Review your answers above, then submit for your teacher to review.</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Submit Matches</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Submit Your Matches?</h3>
            <p className="text-gray-600 mb-6 text-center">
              Your teacher will review your matches and give you feedback. 
              You can update them later if needed.
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 disabled:opacity-50"
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