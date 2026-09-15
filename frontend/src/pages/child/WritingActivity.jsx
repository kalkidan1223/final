import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function WritingActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    fetchActivity();
  }, [id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const container = canvas.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 32, 900);
        const height = Math.min(width * 0.625, 500);
        setCanvasSize({ width, height });
        canvas.width = width;
        canvas.height = height;
      }
    }
  }, [activity]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/activities/${id}`);
      setActivity(response.data.activity);
      
      // Notify backend that activity has started (sets status to in_progress)
      try {
        await axiosClient.post(`/child/activities/${id}/start`);
      } catch (err) {
        console.warn('Activity start track failed:', err);
      }
      
      // Load existing submission if any
      if (response.data.activity.submission_data) {
        try {
          const savedStrokes = JSON.parse(response.data.activity.submission_data);
          setStrokes(savedStrokes);
        } catch (e) {
          // Ignore parse errors
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const getCanvasPoint = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e) => {
    if (activity.submission_status === 'graded') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(e, canvas);
    setCurrentStroke({
      points: [point],
      color: '#000000',
      width: 3,
    });
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    if (activity.submission_status === 'graded') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(e, canvas);
    setCurrentStroke({
      points: [point],
      color: '#000000',
      width: 3,
    });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseMove = (e) => {
    if (!currentStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(e, canvas);
    setCurrentStroke(prev => ({
      ...prev,
      points: [...prev.points, point],
    }));
  };

  const handleTouchMove = (e) => {
    if (!currentStroke) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(e, canvas);
    setCurrentStroke(prev => ({
      ...prev,
      points: [...prev.points, point],
    }));
  };

  const handleMouseUp = () => {
    if (currentStroke && currentStroke.points.length > 1) {
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    }
  };

  const handleTouchEnd = () => {
    if (currentStroke && currentStroke.points.length > 1) {
      setStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    }
  };

  const drawStrokes = (ctx, strokesToDraw) => {
    strokesToDraw.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw saved strokes
    drawStrokes(ctx, strokes);
    
    // Draw current stroke
    if (currentStroke) {
      drawStrokes(ctx, [currentStroke]);
    }
  };

  useEffect(() => {
    renderCanvas();
  }, [strokes, currentStroke, canvasSize]);

  const clearCanvas = () => {
    if (window.confirm('Are you sure you want to clear your drawing?')) {
      setStrokes([]);
      setCurrentStroke(null);
    }
  };

  const undoStroke = () => {
    if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    if (strokes.length === 0) {
      setError('Please draw something before submitting!');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    try {
      const submissionData = JSON.stringify(strokes);
      await axiosClient.post(`/child/activities/${id}/submit`, {
        submission_data: submissionData,
        submission_text: 'Drawing submission',
      });
      setSuccessMessage('Great job! Your drawing has been submitted! 🎨');
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
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading activity... ✏️</p>
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

  const isGraded = activity.submission_status === 'graded';
  const isPending = activity.submission_status === 'pending';
  const canDraw = !isGraded;

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
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">✏️</span>
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
            {isPending && <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold flex items-center gap-1">⏳ Pending Review</span>}
            {canDraw && !isPending && <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">✏️ Ready to Draw</span>}
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
            </div>
          </div>
        )}
      </div>

      {/* Drawing Canvas */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={undoStroke}
              disabled={strokes.length === 0 || !canDraw}
              className={`px-4 py-2 rounded-xl font-medium transition ${canDraw ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 cursor-not-allowed'}`}
            >
              ↶ Undo
            </button>
            <button
              onClick={clearCanvas}
              disabled={strokes.length === 0 || !canDraw}
              className={`px-4 py-2 rounded-xl font-medium transition ${canDraw ? 'text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
            >
              🗑️ Clear
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Brush: ● Black, 3px</span>
            <span className="px-2 py-1 bg-gray-100 rounded-full">{strokes.length} strokes</span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative p-4 bg-gray-50" style={{ aspectRatio: '16/10' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair bg-white rounded-xl shadow-inner"
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
          {activity.resource_url && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg">
              <img
                src={activity.resource_url}
                alt="Reference"
                className="w-24 h-24 object-cover rounded-lg"
              />
              <p className="text-xs text-gray-500 text-center mt-1">Reference</p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>💡</span>
            <span>Use mouse or touch to draw. Try to trace carefully!</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
              {strokes.length} stroke{strokes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Submission Section */}
      {canDraw && !isPending && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📤</span> Submit Your Drawing
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

          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <h3 className="font-bold text-blue-800 mb-2">✨ Ready to Submit?</h3>
            <p className="text-gray-700">Your drawing will be sent to your teacher for review. You can always update it later if needed.</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || strokes.length === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Submit Drawing</span>
              </>
            )}
          </button>
        </div>
      )}

      {isPending && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-xl">
            <p className="text-yellow-700 font-medium flex items-center gap-2">
              <span>⏳</span> Your drawing is being reviewed by your teacher. Check back soon!
            </p>
          </div>
        </div>
      )}

      {isGraded && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
            <p className="font-medium">
              ✅ This activity has been graded. No further submissions allowed.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Submit Your Drawing?</h3>
            <p className="text-gray-600 mb-6 text-center">
              Your teacher will review your drawing and give you feedback. 
              You can update it later if needed.
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