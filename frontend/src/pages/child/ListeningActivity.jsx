import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function ListeningActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [played, setPlayed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/activities/${id}`);
      setActivity(response.data.activity);
      setIsGraded(response.data.activity.submission_status === 'graded');
      
      if (response.data.activity.submission_data) {
        try {
          const saved = JSON.parse(response.data.activity.submission_data);
          setSelectedAnswer(saved.answer);
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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
      if (audioRef.current.duration && audioRef.current.currentTime / audioRef.current.duration > 0.9) {
        setPlayed(true);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setPlayed(true);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer) => {
    if (isGraded) return;
    setSelectedAnswer(answer);
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      await axiosClient.post(`/child/activities/${id}/submit`, {
        submission_text: selectedAnswer,
        submitted_content: JSON.stringify({ answer: selectedAnswer }),
      });
      setSuccessMessage('Great listening! Your answer has been submitted! 🎧');
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
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading activity... 🎧</p>
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

  const audioUrl = activity?.resource_url || activity?.audio_url;
  const resolvedAudioUrl = audioUrl ? resolveFileUrl(audioUrl) : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">🎧</span>
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
            {!isGraded && <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">🎧 Listen & Answer</span>}
          </div>
        </div>

        {activity.description && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-2">📋 Instructions</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{activity.description}</p>
          </div>
        )}

        {activity.instructions && (
          <div className="mt-4 p-4 bg-green-50 rounded-xl border-l-4 border-green-400">
            <h3 className="font-bold text-green-800 mb-2">🎯 What to Do</h3>
            <p className="text-gray-700">{activity.instructions}</p>
          </div>
        )}

        {isGraded && activity.score !== null && (
          <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl">
            <h3 className="font-bold text-green-800 mb-2">✅ Your Results</h3>
            <div className="space-y-2">
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
              {activity.graded_at && (
                <p className="text-sm text-gray-600 mt-3">
                  Graded on: {new Date(activity.graded_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-green-50 to-teal-50">
          <div className="max-w-2xl mx-auto">
            {/* Audio Visualization */}
            <div className="mb-6 h-24 bg-white/50 rounded-xl flex items-end justify-center gap-1 px-4 py-4" role="img" aria-label="Audio waveform">
              {[...Array(40)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded bg-green-400 transition-all duration-200"
                  style={{
                    height: `${isPlaying ? (15 + Math.random() * 50) : (5 + Math.sin(i * 0.3 + Date.now() * 0.001) * 5)}px`,
                    opacity: isPlaying ? 1 : 0.4,
                  }}
                />
              ))}
            </div>

            <audio
              ref={audioRef}
              src={resolvedAudioUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
              preload="metadata"
            />

            {/* Progress Bar */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-gray-500 w-16 text-right">{formatTime(currentTime)}</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full relative cursor-pointer" onClick={(e) => {
                if (audioRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  audioRef.current.currentTime = percent * audioRef.current.duration;
                }
              }}>
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-teal-500 rounded-full transition-all duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 w-16">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                  }
                }}
                className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition text-green-600"
                aria-label="Rewind 10 seconds"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) {
                    if (audioRef.current.paused) {
                      audioRef.current.play();
                    } else {
                      audioRef.current.pause();
                    }
                  }
                }}
                className={`p-4 rounded-full shadow-lg transition ${isPlaying ? 'bg-green-500 text-white' : 'bg-white text-green-600 hover:bg-green-50'}`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10);
                  }
                }}
                className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition text-green-600"
                aria-label="Forward 10 seconds"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Volume & Speed */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">🔊</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={1}
                  onChange={(e) => {
                    if (audioRef.current) audioRef.current.volume = e.target.value;
                  }}
                  className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
              <select
                value={1}
                onChange={(e) => {
                  if (audioRef.current) audioRef.current.playbackRate = parseFloat(e.target.value);
                }}
                className="px-3 py-1 bg-white rounded-lg border border-gray-200 text-sm text-gray-700"
                aria-label="Playback speed"
              >
                <option value="0.5">0.5x (Slower)</option>
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x (Normal)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x (Faster)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Played indicator */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={played ? 'text-green-600' : 'text-gray-400'}>✅</span>
            <span className={played ? 'text-green-700 font-medium' : 'text-gray-500'}>
              {played ? 'Audio listened to completely!' : 'Listen to the full audio to continue'}
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      {!isGraded && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span>❓</span> Question
            </h3>
            <p className="text-lg text-gray-700">{activity.question_text || 'What did you hear? Select the correct answer:'}</p>
          </div>

          {activity.activity_config?.options && activity.activity_config.options.length > 0 ? (
            <div className="space-y-3" role="radiogroup" aria-label="Answer options">
              {activity.activity_config.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isGraded}
                  className={`w-full p-5 rounded-xl border-2 text-left text-lg font-medium transition-all duration-200 ${
                    selectedAnswer === option
                      ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                  } ${!isGraded ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      selectedAnswer === option ? 'bg-purple-500' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1 text-left">{option}</span>
                    {selectedAnswer === option && (
                      <svg className="w-6 h-6 text-purple-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 mb-2">Your Answer:</label>
              <textarea
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={isGraded}
                rows={4}
                className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-200"
                placeholder="Type your answer here..."
              />
            </div>
          )}

          {selectedAnswer && !isGraded && (
            <div className="mt-6 p-4 bg-purple-50 rounded-xl">
              <h4 className="font-bold text-purple-800 mb-2">Your Selected Answer:</h4>
              <p className="text-gray-700">{selectedAnswer}</p>
            </div>
          )}
        </div>
      )}

      {isGraded && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> Your Answer & Results
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-gray-700"><strong>Your Answer:</strong> {activity.submission_text || 'N/A'}</p>
          </div>
          <div className="space-y-2">
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
          </div>
        </div>
      )}

      {/* Submit Section */}
      {selectedAnswer && !isGraded && !submitting && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📤</span> Submit Your Answer
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

          <div className="bg-green-50 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-green-800 mb-2">✨ Ready to Submit?</h3>
            <p className="text-gray-700">Your answer will be sent to your teacher for review.</p>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>📤</span>
            <span>Submit Answer</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Submit Your Answer?</h3>
            <p className="text-gray-600 mb-6 text-center">
              Your teacher will review your answer and give you feedback.
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-teal-700 disabled:opacity-50"
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