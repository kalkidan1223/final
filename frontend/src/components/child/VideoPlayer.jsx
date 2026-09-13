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
  const videoRef = useRef(null);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/students/videos/${id}`);
      setVideo(response.data.video);
      // Check if already watched
      if (response.data.video?.watched) {
        setWatched(true);
        setProgress(100);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      if (currentProgress > 90 && !watched) {
        markAsWatched();
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
      await axiosClient.post(`/students/videos/${id}/watch`);
    } catch (e) {
      // Silent fail
    }
  };

  const handlePlay = () => {
    // Track play event
  };

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
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
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
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Progress Bar at top */}
        <div className="h-2 bg-gray-200 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
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
                <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
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
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium">
                ▶ Watch Video
              </a>
            </div>
          )}
        </div>

        {/* Info Bar */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {video.duration_seconds && (
              <span>⏱️ {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAsWatched}
              disabled={watched}
              className={`px-4 py-2 rounded-xl font-medium transition ${watched ? 'bg-green-100 text-green-700 cursor-default' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              {watched ? '✅ Marked as Watched' : '✅ Mark as Watched'}
            </button>
          </div>
        </div>
      </div>

      {/* Learning Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6">
        <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
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