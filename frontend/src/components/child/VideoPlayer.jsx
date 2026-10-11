import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [watched, setWatched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedTime, setSavedTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    fetchVideo();
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      // Try the new learning journey API first
      try {
        const response = await axiosClient.get(`/child/learning/resources/video/${id}`);
        const videoData = response.data.resource;
        const progressData = response.data.progress;

        setVideo({
          title: videoData.title,
          video_url: videoData.video_url,
          thumbnail_url: videoData.thumbnail_url,
          description: videoData.description,
          duration_seconds: videoData.duration_seconds
        });

        // Load saved progress
        if (progressData) {
          setProgress(progressData.watch_percentage || 0);
          setSavedTime(progressData.current_position_seconds || 0);
          setWatched(progressData.completed || progressData.watch_percentage >= 90);
        }
      } catch (newApiError) {
        // Fallback to legacy endpoint
        const response = await axiosClient.get(`/students/videos/${id}`);
        setVideo(response.data.video);
        if (response.data.video?.watched) {
          setWatched(true);
          setProgress(100);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (currentTime, duration) => {
    if (!duration || duration === 0) return;

    const watchPercentage = (currentTime / duration) * 100;

    try {
      await axiosClient.post(`/child/learning/progress/video/${id}`, {
        current_position_seconds: currentTime,
        duration_seconds: duration,
        watch_percentage: watchPercentage
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      const currentProgress = (currentTime / duration) * 100;

      setProgress(currentProgress);

      if (currentProgress > 90 && !watched) {
        markAsWatched();
      }

      // Save progress every 5 seconds
      if (Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime) !== Math.floor(savedTime)) {
        saveProgress(currentTime, duration);
        setSavedTime(currentTime);
      }
    }
  };

  const handleEnded = () => {
    if (!watched) {
      markAsWatched();
    }
  };

  const markAsWatched = async () => {
    setWatched(true);
    setProgress(100);
    try {
      await axiosClient.post(`/child/learning/progress/video/${id}`, {
        current_position_seconds: videoRef.current?.duration || 0,
        duration_seconds: videoRef.current?.duration || 0,
        watch_percentage: 100,
        completed: true
      });
    } catch (e) {
      console.error('Failed to mark as watched:', e);
    }
  };

  const handlePlay = () => {
    // Track play event
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = async () => {
    if (!videoSrc) return;
    try {
      const response = await fetch(videoSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.title || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: open in new tab
      window.open(videoSrc, '_blank');
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading video... 🎬</p>
        </div>
      </div>
    );
  }

  if (error) {
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

  if (!video) return null;

  const isYouTube = video.video_url?.includes('youtube.com') || video.video_url?.includes('youtu.be');
  const isUpload = video.video_url?.startsWith('/uploads/');
  
  function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n]+)/,
      /(?:youtube\.com\/embed\/)([^&\n]+)/,
      /(?:youtu\.be\/)([^&\n]+)/,
      /(?:youtube\.com\/shorts\/)([^&\n]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
    return null;
  }
  
  const youtubeEmbedUrl = isYouTube ? getYouTubeEmbedUrl(video.video_url) : null;
  const videoSrc = isYouTube ? youtubeEmbedUrl : resolveFileUrl(video.video_url);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-green-600 hover:text-green-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <span className="text-3xl">🎬</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{video.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              {isYouTube && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700">YouTube</span>}
              {isUpload && <span className="px-3 py-1 rounded-full bg-green-100 text-green-700">Uploaded Video</span>}
              {video.status && <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">{video.status}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {watched && <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold flex items-center gap-1">
              <span>✅</span> Watched
            </span>}
          </div>
        </div>

        {video.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-gray-700">{video.description}</p>
          </div>
        )}
      </div>

      {/* Video Player */}
      <div ref={containerRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Progress Bar at top */}
        <div className="h-2 bg-gray-200 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
          {watched && (
            <div className="absolute top-0 right-4 -translate-y-1/2 text-green-600 text-xs font-bold">
              ✅ Completed
            </div>
          )}
        </div>

        <div className="aspect-video bg-black relative">
          {isYouTube ? (
            youtubeEmbedUrl ? (
              <iframe
                src={`${youtubeEmbedUrl}?autoplay=0&rel=0&modestbranding=1`}
                title={video.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                  ▶ Open on YouTube
                </a>
              </div>
            )
          ) : isUpload ? (
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              className="w-full h-full"
              poster={video.thumbnail_url}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onLoadedMetadata={() => {
                // Restore saved position when video loads
                if (savedTime > 0 && videoRef.current) {
                  videoRef.current.currentTime = savedTime;
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 font-medium">
                ▶ Watch Video
              </a>
            </div>
          )}
        </div>

        {/* Info Bar with Download and Fullscreen */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {video.duration_seconds && (
              <span>⏱️ {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isUpload && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition flex items-center gap-2"
                title="Download video"
              >
                <span>⬇️</span> Download
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition flex items-center gap-2"
              title="Fullscreen"
            >
              <span>{isFullscreen ? '⛶' : '⛶'}</span> {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
            <button
              onClick={markAsWatched}
              disabled={watched}
              className={`px-4 py-2 rounded-xl font-medium transition ${watched ? 'bg-green-100 text-green-700 cursor-default' : 'bg-teal-500 text-white hover:bg-teal-600'}`}
            >
              {watched ? '✅ Marked' : '✅ Mark Watched'}
            </button>
          </div>
        </div>
      </div>

      {/* Learning Tips */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6">
        <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
          <span>💡</span> Learning Tip
        </h3>
        <p className="text-gray-700">
          Take notes while watching! Pause the video to write down important points. 
          You can re-watch any part as many times as you need.
        </p>
      </div>
    </div>
  );
}