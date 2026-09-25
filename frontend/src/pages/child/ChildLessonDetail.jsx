import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LessonResourceViewer from '../../components/child/LessonResourceViewer';
import LessonCompletionCelebration from '../../components/child/LessonCompletionCelebration';

export default function ChildLessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

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
        setLessonData(response.data);
        
        // Check if lesson just completed
        if (response.data.progress?.status === 'completed' && !showCelebration) {
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
      setError(err.response?.data?.error || 'Failed to load lesson. Please try again!');
    } finally {
      setLoading(false);
    }
  };

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
        <p className="text-xl font-black text-purple-700 animate-pulse">Loading your lesson...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-lg mx-auto my-12">
        <Link to="/child/courses" className="inline-flex items-center text-purple-600 hover:text-purple-700 font-bold gap-2">
          <span className="text-2xl">←</span> <span>Back to Courses</span>
        </Link>
        <div className="bg-rose-50 border-4 border-rose-200 p-8 rounded-3xl text-center">
          <span className="text-6xl block mb-4">😟</span>
          <p className="text-rose-700 font-bold text-lg mb-6">{error}</p>
          <button
            onClick={fetchLessonJourney}
            className="px-8 py-3 bg-purple-600 text-white font-black text-lg rounded-full shadow-lg hover:bg-purple-700 transition transform hover:scale-105"
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
          className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 font-black text-sm bg-white px-4 py-2 rounded-full shadow-md border-2 border-purple-100 transition hover:scale-105"
        >
          <span className="text-xl">←</span> <span>Back to {lesson.course_title || 'Course'}</span>
        </Link>
      </div>

      {/* ============================================ */}
      {/* LESSON HEADER */}
      {/* ============================================ */}
      <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-4 py-1 rounded-full text-sm font-black backdrop-blur-sm">
              Lesson {lesson.order_index !== undefined ? lesson.order_index + 1 : ''}
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {lesson.title}
          </h1>
          
          {lesson.description && (
            <p className="text-lg font-medium text-white/90 max-w-2xl">
              {lesson.description}
            </p>
          )}
          
          {/* Progress Bar */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">Your Progress</span>
              <span className="text-xl font-black">{progress?.progress_percentage || 0}%</span>
            </div>
            <div className="w-full bg-white/30 h-4 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${progress?.progress_percentage || 0}%` }}
              />
            </div>
            <div className="text-sm font-bold mt-2">
              {progress?.required_resources_completed || 0} of {progress?.total_required_resources || 0} steps completed
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* LEARNING PATH - Sequential Resources */}
      {/* ============================================ */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🗺️</span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-800">Your Learning Steps</h2>
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
          <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-300">
            <span className="text-6xl block mb-4">📚</span>
            <h3 className="text-xl font-black text-gray-700 mb-2">No Learning Steps Yet</h3>
            <p className="text-gray-600 font-medium">Your teacher is preparing the lesson content!</p>
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
    </div>
  );
}

// ============================================
// RESOURCE STEP COMPONENT
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
    if (isCurrent || isInProgress) return 'border-blue-500';
    if (isLocked) return 'border-gray-300';
    return 'border-purple-300';
  };

  const getBgColor = () => {
    if (isCompleted) return 'bg-green-50';
    if (isCurrent || isInProgress) return 'bg-blue-50';
    if (isLocked) return 'bg-gray-50';
    return 'bg-white';
  };

  return (
    <div className="relative">
      {/* Connecting Line */}
      {!isLast && (
        <div className={`absolute left-8 top-20 w-1 h-full ${
          isCompleted ? 'bg-green-400' : 'bg-gray-300'
        }`} style={{ height: 'calc(100% - 80px)' }}></div>
      )}

      <div
        className={`relative ${getBgColor()} rounded-3xl border-4 ${getBorderColor()} shadow-lg transition-all duration-300 ${
          isLocked ? 'opacity-60' : ''
        } ${isCurrent && !isCompleted ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
      >
        {/* Current Step Badge */}
        {isCurrent && !isCompleted && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full font-black text-sm shadow-lg flex items-center gap-2 z-10">
            <span>⭐</span> YOUR NEXT STEP <span>⭐</span>
          </div>
        )}

        <div className="p-6">
          {/* Step Header - Always Visible */}
          <div className="flex items-start gap-4">
            {/* Status Circle */}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0 shadow-lg ${
                isCompleted ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                isCurrent || isInProgress ? 'bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse' :
                isLocked ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                'bg-gradient-to-br from-purple-400 to-pink-500'
              }`}
            >
              {getStatusIcon()}
            </div>

            {/* Step Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-black text-gray-500 uppercase">
                  Step {index + 1}
                </span>
                <span className="text-sm font-black text-purple-600 uppercase bg-purple-100 px-3 py-1 rounded-full">
                  {getStepLabel()}
                </span>
                {resource.is_required && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    Required
                  </span>
                )}
                {!resource.is_required && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    Optional
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-800 mb-1 flex items-center gap-2">
                    <span>{getResourceIcon()}</span>
                    <span>{resource.title}</span>
                  </h3>
                  {resource.description && (
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  )}
                </div>

                {/* Status Badge */}
                {isCompleted && (
                  <span className="bg-green-100 text-green-800 text-sm font-black px-4 py-2 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <span>✓</span> COMPLETE
                  </span>
                )}
                {isInProgress && resource.progress_percentage > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-sm font-black px-4 py-2 rounded-full whitespace-nowrap">
                    {resource.progress_percentage}% DONE
                  </span>
                )}
                {isLocked && (
                  <span className="bg-gray-200 text-gray-600 text-sm font-black px-4 py-2 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <span>🔒</span> LOCKED
                  </span>
                )}
              </div>

              {/* Progress Bar for in-progress resources */}
              {isInProgress && resource.progress_percentage > 0 && (
                <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${resource.progress_percentage}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Expandable Resource Viewer */}
          {!isLocked && (
            <div className="mt-6">
              {expanded ? (
                <div className="border-t-2 border-gray-200 pt-6">
                  <LessonResourceViewer
                    resource={resource}
                    onCompleted={onCompleted}
                  />
                  <button
                    onClick={() => setExpanded(false)}
                    className="mt-4 text-sm font-bold text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <span>▲</span> Collapse
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setExpanded(true)}
                  className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition transform hover:scale-105 ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-600'
                      : isCurrent || isInProgress
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                  }`}
                >
                  {isCompleted ? '👀 Review This Step' : isCurrent ? '🚀 Start This Step' : isInProgress ? '▶️ Continue' : '👀 Open This Step'}
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
