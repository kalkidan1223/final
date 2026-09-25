import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

// Helper function to convert YouTube URL to embed format
function getYouTubeEmbedUrl(url) {
  if (!url) return '';
  
  // Already an embed URL
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  
  // Extract video ID from various YouTube URL formats
  let videoId = '';
  
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('watch?v=')[1]?.split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1]?.split('?')[0];
  }
  
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

export default function LessonResourceViewer({ resource, onCompleted }) {
  const { resource_type, resource_id } = resource;

  switch (resource_type) {
    case 'video':
      return <VideoResourceViewer resourceId={resource_id} resource={resource} onCompleted={onCompleted} />;
    case 'material':
      return <MaterialResourceViewer resourceId={resource_id} resource={resource} onCompleted={onCompleted} />;
    case 'activity':
      return <ActivityResourceViewer resourceId={resource_id} resource={resource} onCompleted={onCompleted} />;
    case 'quiz':
      return <QuizResourceViewer resourceId={resource_id} resource={resource} onCompleted={onCompleted} />;
    default:
      return <div className="text-center text-gray-600">Unknown resource type</div>;
  }
}

// ============================================
// VIDEO RESOURCE VIEWER
// ============================================
function VideoResourceViewer({ resourceId, resource, onCompleted }) {
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchProgress, setWatchProgress] = useState(0);
  const [youtubeWatching, setYoutubeWatching] = useState(false);

  useEffect(() => {
    fetchVideoDetails();
  }, [resourceId]);

  useEffect(() => {
    // For YouTube videos, simulate watch progress after user stays on page
    if (videoData?.resource?.source_type === 'youtube' && youtubeWatching) {
      const interval = setInterval(() => {
        setWatchProgress(prev => {
          const newProgress = Math.min(prev + 5, 100);
          if (newProgress >= 90) {
            handleVideoProgress(90, 100);
          }
          return newProgress;
        });
      }, 5000); // Increase progress every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [youtubeWatching, videoData]);

  const fetchVideoDetails = async () => {
    try {
      const response = await axiosClient.get(`/child/learning/resources/video/${resourceId}`);
      console.log('Video data:', response.data);
      console.log('Video URL:', response.data.resource?.video_url);
      console.log('Video source type:', response.data.resource?.source_type);
      setVideoData(response.data);
      setWatchProgress(response.data.progress?.watch_percentage || 0);
    } catch (err) {
      console.error('Failed to load video:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoProgress = async (currentTime, duration) => {
    const watchPercentage = (currentTime / duration) * 100;
    
    try {
      const response = await axiosClient.post(`/child/learning/progress/video/${resourceId}`, {
        watch_percentage: watchPercentage,
        current_position_seconds: currentTime,
        duration_seconds: duration
      });
      
      setWatchProgress(response.data.progress?.watch_percentage || watchPercentage);
      
      if (response.data.progress?.completed && onCompleted) {
        onCompleted();
      }
    } catch (err) {
      console.error('Failed to update video progress:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-8"><div className="text-4xl animate-bounce">🎬</div></div>;
  }

  const requiredPercentage = videoData?.progress?.required_percentage || 90;
  const isComplete = watchProgress >= requiredPercentage;

  return (
    <div className="space-y-4">
      <div className="bg-black rounded-2xl overflow-hidden aspect-video">
        {videoData?.resource?.video_url ? (
          videoData.resource.source_type === 'youtube' ? (
            <iframe
              className="w-full h-full"
              src={getYouTubeEmbedUrl(videoData.resource.video_url)}
              title={videoData.resource.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                setYoutubeWatching(true);
              }}
            />
          ) : (
            <video
              controls
              className="w-full h-full"
              src={videoData.resource.video_url}
              onTimeUpdate={(e) => {
                const video = e.target;
                if (video.duration > 0) {
                  handleVideoProgress(video.currentTime, video.duration);
                }
              }}
            >
              Your browser does not support the video tag.
            </video>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <p>Video not available</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-black text-gray-800">📹 Watch Progress</h4>
          <span className="text-2xl font-black text-purple-600">{Math.round(watchProgress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-3">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${watchProgress}%` }}
          />
        </div>

        {isComplete ? (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-lg font-black text-green-700">Great Job!</p>
            <p className="text-sm font-medium text-green-600">You completed the video!</p>
          </div>
        ) : (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-blue-700">
              Watch at least {requiredPercentage}% of the video to complete this step
            </p>
            <p className="text-xs font-medium text-blue-600 mt-1">
              {Math.round(requiredPercentage - watchProgress)}% more to go!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MATERIAL RESOURCE VIEWER
// ============================================
function MaterialResourceViewer({ resourceId, resource, onCompleted }) {
  const [materialData, setMaterialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchMaterialDetails();
  }, [resourceId]);

  const fetchMaterialDetails = async () => {
    try {
      const response = await axiosClient.get(`/child/learning/resources/material/${resourceId}`);
      setMaterialData(response.data);
    } catch (err) {
      console.error('Failed to load material:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageView = async (page, totalPages) => {
    const viewPercentage = (page / totalPages) * 100;
    
    try {
      const response = await axiosClient.post(`/child/learning/progress/material/${resourceId}`, {
        pages_viewed: page,
        total_pages: totalPages,
        view_percentage: viewPercentage
      });
      
      if (response.data.progress?.completed && onCompleted) {
        onCompleted();
      }
    } catch (err) {
      console.error('Failed to update material progress:', err);
    }
  };

  useEffect(() => {
    if (materialData?.resource) {
      const totalPages = 5; // Default, could be dynamic
      handlePageView(currentPage, totalPages);
    }
  }, [currentPage, materialData]);

  if (loading) {
    return <div className="text-center py-8"><div className="text-4xl animate-bounce">📖</div></div>;
  }

  const viewProgress = materialData?.progress?.view_percentage || 0;
  const requiredPercentage = materialData?.progress?.required_percentage || 80;
  const isComplete = viewProgress >= requiredPercentage;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-purple-200 min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">📖</div>
          <h3 className="text-2xl font-black text-gray-800">{materialData?.resource?.title}</h3>
          <p className="text-gray-600 font-medium max-w-2xl mx-auto">
            {materialData?.resource?.description || 'Read and learn from this material.'}
          </p>
          
          {materialData?.resource?.file_url && (
            <a
              href={materialData.resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-lg rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              📄 Open Material
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-black text-gray-800">📚 Reading Progress</h4>
          <span className="text-2xl font-black text-purple-600">{Math.round(viewProgress)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${viewProgress}%` }}
          />
        </div>

        {isComplete ? (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-lg font-black text-green-700">Excellent!</p>
            <p className="text-sm font-medium text-green-600">You finished reading!</p>
          </div>
        ) : (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-blue-700">
              View at least {requiredPercentage}% of the material to complete this step
            </p>
            <button
              onClick={() => handlePageView(5, 5)}
              className="mt-3 px-6 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition"
            >
              Mark as Read ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ACTIVITY RESOURCE VIEWER
// ============================================
function ActivityResourceViewer({ resourceId, resource, onCompleted }) {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityDetails();
  }, [resourceId]);

  const fetchActivityDetails = async () => {
    try {
      const response = await axiosClient.get(`/child/learning/resources/activity/${resourceId}`);
      setActivityData(response.data);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartActivity = () => {
    // Navigate to specific activity page based on type
    window.location.href = `/child/activities/${resourceId}`;
  };

  if (loading) {
    return <div className="text-center py-8"><div className="text-4xl animate-bounce">✏️</div></div>;
  }

  const hasSubmission = activityData?.progress?.status === 'graded' || activityData?.progress?.status === 'pending';

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">✏️</div>
          <h3 className="text-2xl font-black text-gray-800">{activityData?.resource?.title}</h3>
          <p className="text-gray-700 font-bold text-lg">
            {activityData?.resource?.activity_type?.replace('_', ' ').toUpperCase()}
          </p>
          <p className="text-gray-600 font-medium max-w-2xl mx-auto">
            {activityData?.resource?.instructions || 'Complete this activity to practice what you learned.'}
          </p>
          
          {hasSubmission ? (
            <div className="bg-white border-2 border-green-300 rounded-2xl p-6">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-lg font-black text-green-700">Activity Submitted!</p>
              <p className="text-sm font-medium text-green-600">Your teacher will review your work</p>
            </div>
          ) : (
            <Link
              to={`/child/activities/${resourceId}`}
              className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              🎯 Start Activity
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUIZ RESOURCE VIEWER
// ============================================
function QuizResourceViewer({ resourceId, resource, onCompleted }) {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizDetails();
  }, [resourceId]);

  const fetchQuizDetails = async () => {
    try {
      const response = await axiosClient.get(`/child/learning/resources/quiz/${resourceId}`);
      setQuizData(response.data);
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8"><div className="text-4xl animate-bounce">🧠</div></div>;
  }

  const hasAttempt = quizData?.progress?.status !== 'not_started';
  const isPassed = quizData?.progress?.score >= (quizData?.resource?.passing_score || 60);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border-2 border-yellow-200 min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">🧠</div>
          <h3 className="text-2xl font-black text-gray-800">{quizData?.resource?.title}</h3>
          <p className="text-gray-600 font-medium max-w-2xl mx-auto">
            {quizData?.resource?.description || 'Test your knowledge with this quiz!'}
          </p>
          
          {quizData?.resource?.time_limit_seconds && (
            <p className="text-sm font-bold text-orange-600">
              ⏱️ Time Limit: {Math.round(quizData.resource.time_limit_seconds / 60)} minutes
            </p>
          )}
          
          {hasAttempt && isPassed ? (
            <div className="bg-white border-2 border-green-300 rounded-2xl p-6">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-lg font-black text-green-700">Quiz Passed!</p>
              <p className="text-sm font-medium text-green-600">
                Score: {quizData.progress.score}%
              </p>
            </div>
          ) : (
            <Link
              to={`/child/quizzes/${resourceId}`}
              className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black text-lg rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              {hasAttempt ? '🔄 Try Again' : '🧠 Take Quiz'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
