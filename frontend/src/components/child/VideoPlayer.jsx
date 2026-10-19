import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';
import { useGenuineWatch } from '../../hooks/useGenuineWatch';

function getYouTubeId(url) {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

export default function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytTimerRef = useRef(null);

  const { progress, setProgress, tick, reset } = useGenuineWatch(id, () => {});

  useEffect(() => {
    fetchVideo();
    return () => {
      if (ytTimerRef.current) clearInterval(ytTimerRef.current);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') ytPlayerRef.current.destroy();
    };
  }, [id]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/child/learning/resources/video/${id}`);
      const v = response.data.resource;
      setVideo({
        title: v.title,
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        description: v.description,
        duration_seconds: v.duration_seconds,
        status: v.status,
      });
      if (response.data.progress) setProgress((p) => ({ ...p, ...response.data.progress }));
    } catch (err) {
      // Fallback to legacy endpoint
      try {
        const response = await axiosClient.get(`/students/videos/${id}`);
        setVideo(response.data.video);
      } catch (e2) {
        setError(err.response?.data?.error || 'Failed to load video');
      }
    } finally {
      setLoading(false);
    }
  };

  const isYouTube = !!video?.video_url?.includes('youtube.com') || !!video?.video_url?.includes('youtu.be');
  const isVimeo = !!video?.video_url?.includes('vimeo.com');
  const isUpload = !!video?.video_url?.startsWith('/uploads/');
  const isDirect = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(video?.video_url || '');
  const isNative = isUpload || isDirect;
  const youtubeId = isYouTube ? getYouTubeId(video?.video_url) : '';
  const videoSrc = isNative ? resolveFileUrl(video?.video_url) : null;

  // YouTube genuine tracking via the IFrame API
  useEffect(() => {
    if (!isYouTube || !youtubeId) return undefined;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT) return;
      ytPlayerRef.current = new YT.Player('vp-yt-' + id, {
        videoId: youtubeId,
        playerVars: { rel: 0, modestbranding: 1, start: Math.floor(progress.current_position_seconds || 0) },
        events: {
          onStateChange: (event) => {
            if (event.data === 1) {
              ytTimerRef.current = setInterval(() => {
                const player = ytPlayerRef.current;
                if (!player || typeof player.getCurrentTime !== 'function') return;
                tick(player.getCurrentTime(), player.getDuration(), true);
              }, 3000);
            } else {
              if (ytTimerRef.current) { clearInterval(ytTimerRef.current); ytTimerRef.current = null; }
              reset();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (ytTimerRef.current) clearInterval(ytTimerRef.current);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') ytPlayerRef.current.destroy();
    };
  }, [isYouTube, youtubeId, id]);

  const vimeoPlayerRef = useRef(null);
  const vimeoTimerRef = useRef(null);
  useEffect(() => {
    if (!isVimeo || !video?.video_url) return undefined;
    let cancelled = false;
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.async = true;
    script.onload = () => {
      if (cancelled || !window.Vimeo) return;
      const m = (video.video_url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (!m) return;
      const iframe = document.getElementById('vp-vimeo-' + id);
      if (!iframe) return;
      const player = new window.Vimeo.Player(iframe);
      vimeoPlayerRef.current = player;
      player.on('play', () => {
        vimeoTimerRef.current = setInterval(async () => {
          try {
            const [seconds, duration] = await Promise.all([player.getCurrentTime(), player.getDuration()]);
            tick(seconds, duration, true);
          } catch (e) {}
        }, 3000);
      });
      player.on('pause', () => { if (vimeoTimerRef.current) { clearInterval(vimeoTimerRef.current); vimeoTimerRef.current = null; } reset(); });
      player.on('ended', () => { if (vimeoTimerRef.current) { clearInterval(vimeoTimerRef.current); vimeoTimerRef.current = null; } reset(); });
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      if (vimeoTimerRef.current) clearInterval(vimeoTimerRef.current);
    };
  }, [isVimeo, video?.video_url, id]);

  const handleTimeUpdate = (e) => {
    const v = e.target;
    if (v.duration > 0) tick(v.currentTime, v.duration, !v.paused);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
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
      window.open(videoSrc, '_blank');
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
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

  const pct = Math.min(100, Math.round(progress.watch_percentage || 0));
  const required = progress.required_percentage || 90;
  const watched = progress.completed || pct >= required;

  return (
    <div className="space-y-6 animate-fade-in">
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
            </div>
          </div>
          {watched && <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold flex items-center gap-1"><span>✅</span> Completed</span>}
        </div>
        {video.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-gray-700">{video.description}</p>
          </div>
        )}
      </div>

      <div ref={containerRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="h-2 bg-gray-200 relative overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="aspect-video bg-black relative">
          {isYouTube ? (
            youtubeId ? <div id={'vp-yt-' + id} className="w-full h-full" /> : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">▶ Open on YouTube</a>
              </div>
            )
          ) : isVimeo ? (
            <iframe id={'vp-vimeo-' + id} src={'https://player.vimeo.com/video/' + ((video.video_url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1]} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          ) : isNative ? (
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              className="w-full h-full"
              poster={video.thumbnail_url}
              onTimeUpdate={handleTimeUpdate}
              onPause={reset}
              onSeeking={reset}
              onLoadedMetadata={() => {
                if (progress.current_position_seconds > 0 && videoRef.current) {
                  videoRef.current.currentTime = progress.current_position_seconds;
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white p-4 text-center bg-gray-900">
              <p>This video is hosted externally. Open it to watch; progress tracking is not available for this provider.</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {video.duration_seconds && (
              <span>⏱️ {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}</span>
            )}
            <span>Progress: {pct}% (need {required}%)</span>
          </div>
          <div className="flex items-center gap-2">
            {isUpload && (
              <button onClick={handleDownload} className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition flex items-center gap-2" title="Download video">
                <span>⬇️</span> Download
              </button>
            )}
            <button onClick={toggleFullscreen} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition flex items-center gap-2" title="Fullscreen">
              <span>⛶</span> {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6">
        <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2"><span>💡</span> Learning Tip</h3>
        <p className="text-gray-700">Take notes while watching! Pause the video to write down important points. You can re-watch any part as many times as you need. Progress counts only the parts you actually watch.</p>
      </div>
    </div>
  );
}
