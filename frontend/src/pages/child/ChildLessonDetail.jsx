import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LessonResourceViewer from '../../components/child/LessonResourceViewer';
import LessonCompletionCelebration from '../../components/child/LessonCompletionCelebration';
import AskTeacherModal from '../../components/child/AskTeacherModal';

export default function ChildLessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const completionShownRef = useRef(false);

  useEffect(() => {
    fetchLessonJourney();
    startSession();
    
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [id]);

  const fetchLessonJourney = async () => {
    try {
      setLoading(true);
      
      // Try new learning journey API first
      try {
        const response = await axiosClient.get(`/child/learning/lessons/${id}`);
        completionShownRef.current = response.data.progress?.status === 'completed' ? 'done' : 'pending';
        setLessonData(response.data);
        
        // Celebrate only the first time this mount sees the lesson completed
        // (i.e. the child just finished it), never on every revisit.
        if (response.data.progress?.status === 'completed'
            && response.data.progress?.progress_percentage === 100
            && completionShownRef.current === 'pending') {
          completionShownRef.current = 'shown';
          setShowCelebration(true);
        }
        return;
      } catch (newApiError) {
        console.log('New API failed, falling back to legacy endpoint:', newApiError.message);
      }
      
      // Fallback to legacy endpoint
      const response = await axiosClient.get(`/child/lessons/${id}`);
      
      // Transform legacy format to new format
      const { lesson, materials = [], videos = [], activities = [], quizzes = [] } = response.data;
      
      // Create pseudo-resources for the legacy format
      const resources = [
        ...videos.map((v, idx) => ({
          id: `video-${v.id}`,
          resource_type: 'video',
          resource_id: v.id,
          title: v.title,
          display_order: idx,
          is_required: true,
          status: v.is_completed ? 'completed' : v.progress_percentage > 0 ? 'in_progress' : 'not_started',
          progress_percentage: v.progress_percentage || 0,
          is_locked: false
        })),
        ...materials.map((m, idx) => ({
          id: `material-${m.id}`,
          resource_type: 'material',
          resource_id: m.id,
          title: m.title,
          display_order: videos.length + idx,
          is_required: true,
          status: m.is_completed ? 'completed' : 'not_started',
          progress_percentage: m.progress_percentage || 0,
          is_locked: false
        })),
        ...activities.map((a, idx) => ({
          id: `activity-${a.id}`,
          resource_type: 'activity',
          resource_id: a.id,
          title: a.title,
          display_order: videos.length + materials.length + idx,
          is_required: true,
          status: a.is_completed ? 'completed' : 'not_started',
          progress_percentage: 0,
          is_locked: false
        })),
        ...quizzes.map((q, idx) => ({
          id: `quiz-${q.id}`,
          resource_type: 'quiz',
          resource_id: q.id,
          title: q.title,
          display_order: videos.length + materials.length + activities.length + idx,
          is_required: true,
          status: q.is_completed ? 'completed' : 'not_started',
          progress_percentage: 0,
          is_locked: false
        }))
      ];
      
      const totalResources = resources.length;
      const completedResources = resources.filter(r => r.status === 'completed').length;
      const progressPercentage = totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0;
      
      // Find current step
      const currentStep = resources.find(r => r.status === 'in_progress') || 
                         resources.find(r => r.status === 'not_started');
      
      setLessonData({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          course_id: lesson.course_id,
          course_title: lesson.course_title,
          order_index: lesson.order_index
        },
        progress: {
          status: progressPercentage === 100 ? 'completed' : completedResources > 0 ? 'in_progress' : 'not_started',
          progress_percentage: progressPercentage,
          required_resources_completed: completedResources,
          total_required_resources: totalResources
        },
        resources,
        current_step: currentStep
      });
      
    } catch (err) {
      // Check for authentication errors (401)
      if (err.response?.status === 401 || err.response?.data?.code === 'TOKEN_EXPIRED') {
        setError('Please log in to continue');
        setErrorCode('AUTH_REQUIRED');
      } else {
        setErrorCode(err.response?.data?.code || '');
        setError(err.response?.data?.error || 'Failed to load lesson. Please try again!');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLockedLesson = () => errorCode === 'LESSON_LOCKED';
  const isAuthRequired = () => errorCode === 'AUTH_REQUIRED';

  const startSession = async () => {
    try {
      const response = await axiosClient.post('/child/learning/sessions/start', {
        lesson_id: id
      });
      setSessionId(response.data.session_id);
    } catch (err) {
      console.warn('Failed to start session:', err);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    try {
      await axiosClient.post(`/child/learning/sessions/${sessionId}/end`, {
        resources_accessed: lessonData?.resources?.length || 0
      });
    } catch (err) {
      console.warn('Failed to end session:', err);
    }
  };

  const handleResourceCompleted = () => {
    // Refresh lesson data to update progress
    fetchLessonJourney();
  };

  const handleContinueToNextLesson = () => {
    setShowCelebration(false);
    navigate(`/child/courses/${lessonData.lesson.course_id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-7xl animate-bounce">📖</div>
        <p className="text-xl font-black text-green-700 animate-pulse">Loading your lesson...</p>
      </div>
    );
  }

  if (error) {
    if (isLockedLesson()) {
      return (
        <div className="max-w-lg mx-auto my-12 bg-white rounded-3xl border-4 border-amber-200 p-8 text-center space-y-4 shadow-lg">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-black text-slate-800">This lesson is locked</h2>
          <p className="text-slate-600 font-medium">
            Finish the previous lesson first — then this one opens up for you!
          </p>
          <Link
            to="/child/courses"
            className="inline-block px-8 py-3 bg-green-600 text-white font-black rounded-full shadow hover:bg-green-700 transition"
          >
            ← Back to My Courses
          </Link>
        </div>
      );
    }

    if (isAuthRequired()) {
      return (
        <div className="max-w-lg mx-auto my-12 bg-white rounded-3xl border-4 border-amber-200 p-8 text-center space-y-4 shadow-lg">
          <div className="text-6xl">🔐</div>
          <h2 className="text-2xl font-black text-slate-800">Please Log In</h2>
          <p className="text-slate-600 font-medium">
            You need to log in to access your lessons.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 bg-green-600 text-white font-black rounded-full shadow hover:bg-green-700 transition"
          >
            Go to Login →
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-w-lg mx-auto my-12">
        <Link to="/child/courses" className="inline-flex items-center text-green-600 hover:text-green-700 font-bold gap-2">
          <span className="text-2xl">←</span> <span>Back to Courses</span>
        </Link>
        <div className="bg-rose-50 border-4 border-rose-200 p-8 rounded-3xl text-center">
          <span className="text-6xl block mb-4">😟</span>
          <p className="text-rose-700 font-bold text-lg mb-6">{error}</p>
          <button
            onClick={fetchLessonJourney}
            className="px-8 py-3 bg-green-600 text-white font-black text-lg rounded-full shadow-lg hover:bg-green-700 transition transform hover:scale-105"
          >
            Try Again 🔄
          </button>
        </div>
      </div>
    );
  }

  const { lesson, progress, resources, current_step } = lessonData || {};
  const isComplete = progress?.status === 'completed';

  // Show celebration if lesson just completed
  if (showCelebration && isComplete) {
    return (
      <LessonCompletionCelebration
        lesson={lesson}
        progress={progress}
        onContinue={handleContinueToNextLesson}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12 px-4">
      {/* Back Link */}
      <div>
        <Link
          to={`/child/courses/${lesson.course_id}`}
          className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-black text-sm bg-white px-4 py-2 rounded-full shadow-md border-2 border-green-100 transition hover:scale-105"
        >
          <span className="text-xl">←</span> <span>Back to {lesson.course_title || 'Course'}</span>
        </Link>
      </div>

      {/* ============================================ */}
      {/* LESSON HEADER - More Colorful & Child-Friendly */}
      {/* ============================================ */}
      <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden border-4 border-white/20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 animate-float-slow"></div>
        <div className="absolute top-1/3 left-10 text-6xl opacity-20 animate-float">⭐</div>
        <div className="absolute bottom-10 right-1/4 text-5xl opacity-15 animate-float-slow">✨</div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="bg-white/30 backdrop-blur-md px-5 py-2 rounded-full text-sm font-black border-2 border-white/50 shadow-lg">
              📚 Lesson {lesson.order_index !== undefined ? lesson.order_index + 1 : ''}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-lg">
            {lesson.title}
          </h1>

          {lesson.description && (
            <p className="text-lg sm:text-xl font-semibold text-white/90 max-w-2xl leading-relaxed">
              {lesson.description}
            </p>
          )}

          {/* Progress Bar - More Colorful */}
          <div className="bg-white/30 backdrop-blur-md rounded-2xl p-5 border-2 border-white/30 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-bold">Your Progress</span>
              <span className="text-2xl sm:text-3xl font-black drop-shadow-md">{progress?.progress_percentage || 0}%</span>
            </div>
            <div className="w-full bg-white/30 h-5 rounded-full overflow-hidden border-2 border-white/30">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full transition-all duration-700 shadow-inner"
                style={{ width: `${progress?.progress_percentage || 0}%` }}
              />
            </div>
            <div className="text-sm sm:text-base font-bold mt-3">
              {progress?.required_resources_completed || 0} of {progress?.total_required_resources || 0} steps completed
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* ASK MY TEACHER - Big, easy-to-find help button */}
      {/* ============================================ */}
      <button
        onClick={() => setAskOpen(true)}
        className="w-full bg-white rounded-[2rem] border-4 border-purple-200 p-5 sm:p-6 shadow-xl flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition text-left"
      >
        <span className="text-5xl flex-shrink-0 animate-bounce">🙋</span>
        <span className="flex-1">
          <span className="block text-xl sm:text-2xl font-black text-purple-700">Ask My Teacher</span>
          <span className="block text-sm font-bold text-slate-500">
            Don’t understand something? Ask your teacher for help!
          </span>
        </span>
        <span className="text-3xl">➜</span>
      </button>

      {/* ============================================ */}
      {/* LEARNING PATH - More Child-Friendly */}
      {/* ============================================ */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-bounce">🗺️</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Your Learning Steps</h2>
        </div>

        {resources && resources.length > 0 ? (
          <div className="space-y-6">
            {resources.map((resource, index) => (
              <ResourceStep
                key={resource.id}
                resource={resource}
                index={index}
                isCurrent={current_step?.id === resource.id}
                isFirst={index === 0}
                isLast={index === resources.length - 1}
                onCompleted={handleResourceCompleted}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-[2.5rem] p-12 text-center border-4 border-purple-200 shadow-xl">
            <span className="text-7xl block mb-4 animate-bounce">📚</span>
            <h3 className="text-xl sm:text-2xl font-black text-purple-800 mb-2">No Learning Steps Yet</h3>
            <p className="text-base font-bold text-purple-600">Your teacher is preparing the lesson content!</p>
          </div>
        )}

        {/* Lesson Completion Status */}
        {isComplete && (
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl p-8 text-white text-center shadow-2xl">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black mb-2">Lesson Complete!</h2>
            <p className="text-lg font-medium mb-6">You finished all the steps. Amazing work!</p>
            <button
              onClick={handleContinueToNextLesson}
              className="px-8 py-4 bg-white text-green-600 font-black text-lg rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              Continue to Next Lesson →
            </button>
          </div>
        )}
      </div>

      <AskTeacherModal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        courseId={lesson?.course_id || null}
        courseTitle={lesson?.course_title || ''}
        lessonId={lesson?.id || null}
        lessonTitle={lesson?.title || ''}
      />
    </div>
  );
}

// ============================================
// RESOURCE STEP COMPONENT - More Child-Friendly
// ============================================
function ResourceStep({ resource, index, isCurrent, isFirst, isLast, onCompleted }) {
  const [expanded, setExpanded] = useState(isCurrent);

  useEffect(() => {
    if (isCurrent) {
      setExpanded(true);
    }
  }, [isCurrent]);

  const isCompleted = resource.status === 'completed';
  const isInProgress = resource.status === 'in_progress';
  const isLocked = resource.is_locked;
  const notStarted = resource.status === 'not_started' && !isLocked;

  const getStatusIcon = () => {
    if (isCompleted) return '✅';
    if (isInProgress || isCurrent) return '▶️';
    if (isLocked) return '🔒';
    return '○';
  };

  const getResourceIcon = () => {
    switch (resource.resource_type) {
      case 'video': return '🎬';
      case 'material': return '📖';
      case 'activity': return '✏️';
      case 'quiz': return '🧠';
      default: return '📄';
    }
  };

  const getStepLabel = () => {
    switch (resource.resource_type) {
      case 'video': return 'WATCH';
      case 'material': return 'LEARN';
      case 'activity': return 'PRACTICE';
      case 'quiz': return 'CHECK YOUR KNOWLEDGE';
      default: return 'STEP';
    }
  };

  const getBorderColor = () => {
    if (isCompleted) return 'border-green-400';
    if (isCurrent || isInProgress) return 'border-purple-500';
    if (isLocked) return 'border-gray-300';
    return 'border-pink-400';
  };

  const getBgColor = () => {
    if (isCompleted) return 'bg-gradient-to-br from-green-50 to-emerald-50';
    if (isCurrent || isInProgress) return 'bg-gradient-to-br from-purple-50 to-pink-50';
    if (isLocked) return 'bg-gray-50';
    return 'bg-white';
  };

  return (
    <div className="relative">
      {/* Connecting Line - More Colorful */}
      {!isLast && (
        <div className={`absolute left-10 top-24 w-2 h-full ${
          isCompleted ? 'bg-gradient-to-b from-green-400 to-emerald-400' : 'bg-gray-300'
        }`} style={{ height: 'calc(100% - 96px)' }}></div>
      )}

      <div
        className={`relative ${getBgColor()} rounded-[2rem] border-4 ${getBorderColor()} shadow-xl transition-all duration-300 ${
          isLocked ? 'opacity-60' : 'hover:shadow-2xl hover:scale-[1.01]'
        } ${isCurrent && !isCompleted ? 'ring-4 ring-yellow-400 ring-offset-4 animate-pulse' : ''}`}
      >
        {/* Current Step Badge - More Colorful */}
        {isCurrent && !isCompleted && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2.5 rounded-full font-black text-sm shadow-xl flex items-center gap-2 z-10 border-2 border-yellow-300">
            <span className="text-xl animate-bounce">⭐</span> YOUR NEXT STEP <span className="text-xl animate-bounce">⭐</span>
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Step Header - Always Visible */}
          <div className="flex items-start gap-5">
            {/* Status Circle - Larger */}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl flex-shrink-0 shadow-2xl border-4 border-white ${
                isCompleted ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                isCurrent || isInProgress ? 'bg-gradient-to-br from-purple-600 to-pink-600 animate-pulse' :
                isLocked ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                'bg-gradient-to-br from-pink-500 to-orange-500'
              }`}
            >
              {getStatusIcon()}
            </div>

            {/* Step Info - More Child-Friendly */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-sm font-black text-slate-500 uppercase tracking-wider">
                  Step {index + 1}
                </span>
                <span className="text-sm font-black text-purple-600 uppercase bg-purple-100 px-4 py-1.5 rounded-full border-2 border-purple-300">
                  {getStepLabel()}
                </span>
                {resource.is_required && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-full border-2 border-orange-300">
                    Required
                  </span>
                )}
                {!resource.is_required && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full border-2 border-blue-300">
                    Optional
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                    <span className="text-2xl">{getResourceIcon()}</span>
                    <span>{resource.title}</span>
                  </h3>
                  {resource.description && (
                    <p className="text-sm sm:text-base text-slate-600 font-medium">{resource.description}</p>
                  )}
                </div>

                {/* Status Badge - More Colorful */}
                {isCompleted && (
                  <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-black px-5 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap shadow-lg border-2 border-green-300">
                    <span className="text-lg">✓</span> COMPLETE
                  </span>
                )}
                {isInProgress && resource.progress_percentage > 0 && (
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-black px-5 py-2.5 rounded-full whitespace-nowrap shadow-lg border-2 border-purple-300 animate-pulse">
                    {resource.progress_percentage}% DONE
                  </span>
                )}
                {isLocked && (
                  <span className="bg-gray-300 text-gray-600 text-sm font-black px-5 py-2.5 rounded-full flex items-center gap-2 whitespace-nowrap border-2 border-gray-400">
                    <span className="text-lg">🔒</span> LOCKED
                  </span>
                )}
              </div>

              {/* Progress Bar for in-progress resources - More Colorful */}
              {isInProgress && resource.progress_percentage > 0 && (
                <div className="w-full bg-purple-100 h-4 rounded-full overflow-hidden mt-4 border-2 border-purple-200">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 shadow-inner"
                    style={{ width: `${resource.progress_percentage}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Expandable Resource Viewer - More Child-Friendly */}
          {!isLocked && (
            <div className="mt-6">
              {expanded ? (
                <div className="border-t-4 border-purple-200 pt-6">
                  <LessonResourceViewer
                    resource={resource}
                    onCompleted={onCompleted}
                  />
                  <button
                    onClick={() => setExpanded(false)}
                    className="mt-4 text-sm font-bold text-purple-600 hover:text-purple-800 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-purple-50 transition"
                  >
                    <span className="text-lg">▲</span> Collapse
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setExpanded(true)}
                  className={`w-full py-5 rounded-2xl font-black text-lg sm:text-xl shadow-xl transition transform hover:scale-105 active:scale-95 border-4 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 border-green-300'
                      : isCurrent || isInProgress
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 border-purple-300'
                      : 'bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:from-pink-600 hover:to-orange-600 border-pink-300'
                  }`}
                >
                  <span className="text-2xl mr-2">{isCompleted ? '👀' : isCurrent ? '🚀' : isInProgress ? '▶️' : '👀'}</span>
                  {isCompleted ? 'Review This Step' : isCurrent ? 'Start This Step' : isInProgress ? 'Continue' : 'Open This Step'}
                </button>
              )}
            </div>
          )}

          {/* Locked Message */}
          {isLocked && (
            <div className="mt-6 bg-gray-100 border-2 border-gray-300 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-gray-600">
                🔒 Complete the previous required steps to unlock this one
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
