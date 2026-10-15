import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourseOverview();
  }, [id]);

  const fetchCourseOverview = async () => {
    try {
      setLoading(true);
      // Try new learning journey API first
      try {
        console.log('Trying new learning journey API:', `/child/learning/courses/${id}`);
        const response = await axiosClient.get(`/child/learning/courses/${id}`);
        console.log('New API success:', response.data);
        setCourseData(response.data);
        return;
      } catch (newApiError) {
        console.log('New API failed, falling back to legacy endpoint:', newApiError);
        console.log('Error response:', newApiError.response?.data);
      }
      
      // Fallback to legacy endpoint if new API fails (for existing courses without lesson_resources)
      console.log('Trying legacy API:', `/child/courses/${id}`);
      const response = await axiosClient.get(`/child/courses/${id}`);
      console.log('Legacy API response:', response.data);
      
      // Transform legacy format to new format
      const lessons = response.data.lessons || [];
      const completedCount = lessons.filter(l => l.access_state === 'completed').length;
      const totalLessons = lessons.length;
      const courseProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      
      // Find next lesson
      const nextLesson = lessons.find(l => l.access_state === 'in-progress') || 
                        lessons.find(l => l.access_state !== 'locked' && l.access_state !== 'completed');
      
      setCourseData({
        course: response.data.course,
        progress: {
          percentage: courseProgress,
          completed_lessons: completedCount,
          total_lessons: totalLessons,
          current_streak: 0
        },
        lessons: lessons.map(lesson => ({
          ...lesson,
          status: lesson.access_state === 'completed' ? 'completed' : 
                  lesson.access_state === 'in-progress' ? 'in_progress' : 'not_started',
          is_locked: lesson.access_state === 'locked',
          progress_percentage: lesson.progress_percentage || 0
        })),
        next_lesson: nextLesson
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load course. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueLearning = () => {
    if (courseData?.next_lesson) {
      navigate(`/child/lessons/${courseData.next_lesson.id}`);
    } else if (courseData?.lessons?.length > 0) {
      // Find first available lesson
      const firstAvailable = courseData.lessons.find(l => !l.is_locked);
      if (firstAvailable) {
        navigate(`/child/lessons/${firstAvailable.id}`);
      }
    }
  };

  const getButtonText = () => {
    if (!courseData?.next_lesson) {
      if (courseData?.progress?.percentage === 100) {
        return '🎉 Course Complete!';
      }
      return '🎯 Start Learning';
    }
    
    const lesson = courseData.next_lesson;
    if (lesson.status === 'in_progress') {
      return '▶️ Continue Learning';
    }
    return '🚀 Start Next Lesson';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-7xl animate-bounce">🌟</div>
        <p className="text-xl font-black text-green-700 animate-pulse">Loading your learning adventure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-lg mx-auto my-12">
        <Link to="/child/courses" className="inline-flex items-center text-green-600 hover:text-green-700 font-bold">
          <span className="text-2xl">←</span> <span className="ml-2">Back to Courses</span>
        </Link>
        <div className="bg-rose-50 border-4 border-rose-200 p-8 rounded-3xl text-center">
          <span className="text-6xl block mb-4">😟</span>
          <p className="text-rose-700 font-bold text-lg mb-6">{error}</p>
          <button
            onClick={fetchCourseOverview}
            className="px-8 py-3 bg-green-600 text-white font-black text-lg rounded-full shadow-lg hover:bg-green-700 transition transform hover:scale-105"
          >
            Try Again 🔄
          </button>
        </div>
      </div>
    );
  }

  const { course, progress, lessons, next_lesson } = courseData || {};
  const isComplete = progress?.percentage === 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12 px-4">
      {/* Back Link */}
      <div>
        <Link
          to="/child/courses"
          className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-black text-sm bg-white px-4 py-2 rounded-full shadow-md border-2 border-green-100 transition hover:scale-105"
        >
          <span className="text-xl">←</span> <span>My Courses</span>
        </Link>
      </div>

      {/* ============================================ */}
      {/* COURSE HEADER - Colorful & Playful */}
      {/* ============================================ */}
      <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-[2.5rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden border-4 border-white/20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 animate-float-slow"></div>
        <div className="absolute top-1/3 left-10 text-6xl opacity-20 animate-float">⭐</div>
        <div className="absolute bottom-10 right-1/4 text-5xl opacity-15 animate-float-slow">✨</div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-6xl animate-bounce">{getCourseIcon(course?.title)}</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-lg">
              {course?.title?.toUpperCase() || 'LEARNING ADVENTURE'}
            </h1>
          </div>

          {course?.description && (
            <p className="text-lg sm:text-xl font-semibold text-white/90 max-w-2xl leading-relaxed">
              {course.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base font-bold">
            <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border-2 border-white/30">
              <span className="text-2xl">👩‍🏫</span>
              <span>Teacher: {course?.instructor_name || 'Your Teacher'}</span>
            </div>

            {progress?.current_streak > 0 && (
              <div className="flex items-center gap-2 bg-yellow-400/40 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border-2 border-yellow-300">
                <span className="text-2xl animate-pulse">🔥</span>
                <span>{progress.current_streak} Day Streak!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* PROGRESS & CONTINUE LEARNING - More Colorful */}
      {/* ============================================ */}
      <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border-4 border-purple-200">
        {/* Progress Bar */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-black text-gray-700">Your Progress</span>
            <span className="text-3xl sm:text-4xl font-black text-purple-600 drop-shadow-md">{progress?.percentage || 0}%</span>
          </div>
          <div className="w-full bg-purple-100 h-8 rounded-full overflow-hidden relative border-4 border-purple-200">
            <div
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3 shadow-inner"
              style={{ width: `${progress?.percentage || 0}%` }}
            >
              {(progress?.percentage || 0) > 10 && (
                <span className="text-white text-lg font-black animate-bounce">⭐</span>
              )}
            </div>
          </div>
          <div className="text-center text-base sm:text-lg font-bold text-gray-600">
            {progress?.completed_lessons || 0} of {progress?.total_lessons || 0} lessons completed
          </div>
        </div>

        {/* Continue Button - Most Important Action */}
        {!isComplete && (
          <button
            onClick={handleContinueLearning}
            disabled={!next_lesson && lessons?.every(l => l.is_locked)}
            className="w-full py-7 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-black text-2xl sm:text-3xl rounded-[2rem] shadow-2xl transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 border-4 border-purple-300"
          >
            <span className="text-3xl">🚀</span>
            <span>{getButtonText()}</span>
            <span className="text-4xl animate-bounce">→</span>
          </button>
        )}

        {isComplete && (
          <div className="text-center space-y-6">
            <div className="text-7xl animate-bounce">🏆</div>
            <h2 className="text-3xl sm:text-4xl font-black text-purple-600 drop-shadow-lg">Amazing Work!</h2>
            <p className="text-lg sm:text-xl font-bold text-gray-600">You completed this entire course!</p>
            {course?.certificate_enabled && (
              <button className="px-10 py-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl rounded-[2rem] shadow-xl hover:shadow-2xl transition transform hover:scale-105 border-4 border-yellow-300">
                🎓 View Certificate
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* LEARNING JOURNEY - Visual Lesson Path */}
      {/* ============================================ */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🗺️</span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-800">Your Learning Journey</h2>
        </div>

        <div className="space-y-4">
          {lessons && lessons.length > 0 ? (
            lessons.map((lesson, idx) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                index={idx}
                isNext={next_lesson?.id === lesson.id}
              />
            ))
          ) : (
            <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-300">
              <span className="text-6xl block mb-4">📚</span>
              <h3 className="text-xl font-black text-gray-700 mb-2">No Lessons Yet</h3>
              <p className="text-gray-600 font-medium">Your teacher is preparing exciting lessons for you!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// LESSON CARD COMPONENT
// ============================================
function LessonCard({ lesson, index, isNext }) {
  const isCompleted = lesson.status === 'completed';
  const isInProgress = lesson.status === 'in_progress';
  const isLocked = lesson.is_locked;
  const notStarted = lesson.status === 'not_started' && !isLocked;

  const getStatusIcon = () => {
    if (isCompleted) return '✅';
    if (isInProgress) return '▶️';
    if (isLocked) return '🔒';
    return '○';
  };

  const getStatusColor = () => {
    if (isCompleted) return 'from-green-500 to-emerald-600';
    if (isInProgress || isNext) return 'from-purple-500 to-pink-600';
    if (isLocked) return 'from-gray-400 to-gray-500';
    return 'from-blue-500 to-cyan-600';
  };

  const getBorderColor = () => {
    if (isCompleted) return 'border-green-400';
    if (isInProgress || isNext) return 'border-purple-400';
    if (isLocked) return 'border-gray-300';
    return 'border-blue-400';
  };

  return (
    <div
      className={`relative bg-white rounded-[2rem] border-4 ${getBorderColor()} shadow-xl transition-all duration-300 overflow-hidden ${
        isLocked ? 'opacity-60' : 'hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1'
      } ${isNext ? 'ring-4 ring-yellow-400 ring-offset-4 animate-pulse' : ''}`}
    >
      {/* Next Lesson Badge - More Colorful */}
      {isNext && !isCompleted && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-5 py-2 rounded-bl-3xl font-black text-sm shadow-lg flex items-center gap-2 border-b-4 border-l-4 border-yellow-300">
          <span className="text-xl animate-bounce">⭐</span> 
          <span>YOUR NEXT STEP</span>
        </div>
      )}

      <div className="flex items-center gap-5 p-6 sm:p-7">
        {/* Lesson Number/Status Circle - Larger & More Colorful */}
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${getStatusColor()} flex items-center justify-center text-white font-black text-3xl sm:text-4xl flex-shrink-0 shadow-2xl border-4 border-white/30 ${
            isInProgress ? 'animate-pulse' : ''
          }`}
        >
          {isCompleted || isLocked ? getStatusIcon() : index + 1}
        </div>

        {/* Lesson Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-gray-500 uppercase tracking-wider">
              Lesson {lesson.order_index !== undefined ? lesson.order_index + 1 : index + 1}
            </span>

            {isCompleted && (
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md border-2 border-green-300">
                ✓ COMPLETE
              </span>
            )}
            {isInProgress && (
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md animate-pulse border-2 border-purple-300">
                {lesson.progress_percentage || 0}% DONE
              </span>
            )}
            {isLocked && (
              <span className="bg-gray-300 text-gray-600 text-xs font-black px-4 py-1.5 rounded-full shadow-md border-2 border-gray-400">
                🔒 LOCKED
              </span>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">
            {lesson.title}
          </h3>

          {lesson.description && (
            <p className="text-sm sm:text-base text-gray-600 line-clamp-2 font-medium">{lesson.description}</p>
          )}

          {/* Progress indicator for in-progress lessons - More Colorful */}
          {isInProgress && lesson.progress_percentage > 0 && (
            <div className="w-full bg-purple-100 h-3 rounded-full overflow-hidden border-2 border-purple-200">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 shadow-inner"
                style={{ width: `${lesson.progress_percentage}%` }}
              />
            </div>
          )}

          {/* Resource summary */}
          {(lesson.required_resources_completed !== undefined && lesson.total_required_resources > 0) && (
            <div className="text-sm font-bold text-gray-500">
              {lesson.required_resources_completed} of {lesson.total_required_resources} steps completed
            </div>
          )}
        </div>

        {/* Action Button - More Prominent */}
        <div className="flex-shrink-0">
          {isLocked ? (
            <div className="px-6 py-3 bg-gray-200 text-gray-500 font-black text-sm rounded-full flex items-center gap-2 border-2 border-gray-300">
              <span className="text-xl">🔒</span>
              <span className="hidden sm:inline">Locked</span>
            </div>
          ) : (
            <Link
              to={`/child/lessons/${lesson.id}`}
              className={`px-7 py-4 font-black text-base sm:text-lg rounded-full shadow-xl transition transform hover:scale-110 active:scale-95 flex items-center gap-2 border-4 ${
                isCompleted
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 border-green-300'
                  : isInProgress || isNext
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 border-purple-300'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 border-blue-300'
              }`}
            >
              <span className="text-xl">{isCompleted ? '📖' : isInProgress ? '▶️' : '🚀'}</span>
              <span>{isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}</span>
              <span className="text-xl">→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getCourseIcon(title) {
  if (!title) return '📚';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('math')) return '🔢';
  if (lowerTitle.includes('science')) return '🔬';
  if (lowerTitle.includes('english')) return '📖';
  if (lowerTitle.includes('amharic')) return '🇪🇹';
  if (lowerTitle.includes('art')) return '🎨';
  if (lowerTitle.includes('music')) return '🎵';
  if (lowerTitle.includes('sport') || lowerTitle.includes('physical')) return '⚽';
  return '📚';
}