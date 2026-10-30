import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

// ============================================
// HELPERS
// ============================================
function getYouTubeId(url) {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url.split('embed/')[1]?.split('?')[0] || '';
  if (url.includes('youtube.com/watch?v=')) return url.split('watch?v=')[1]?.split('&')[0] || '';
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0] || '';
  return '';
}

function getYouTubeEmbedUrl(url) {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

// Loads the YouTube IFrame API once and shares the promise between viewers.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// Genuine watch tracking shared by native <video> and the YouTube player.
// Only contiguous spans of real playback are reported, so seeking forward or
// leaving the tab never counts as watched (prompt section 10).
function useGenuineWatch(resourceId, onCompleted) {
  const [progress, setProgress] = useState({
    watch_percentage: 0,
    watched_seconds: 0,
    duration_seconds: 0,
    current_position_seconds: 0,
    required_percentage: 90,
    completed: false,
  });
  const accStartRef = useRef(null);
  const hiddenRef = useRef(typeof document !== 'undefined' ? document.hidden : false);

  useEffect(() => {
    const onVisibility = () => {
      hiddenRef.current = document.hidden;
      if (document.hidden) accStartRef.current = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const send = useCallback(async (from, to, current, duration) => {
    if (!(to > from)) return;
    try {
      const { data } = await axiosClient.post(`/child/learning/progress/video/${resourceId}`, {
        current_position_seconds: current,
        duration_seconds: duration,
        position: { from, to },
      });
      if (data?.progress) {
        setProgress(data.progress);
        if (data.progress.completed && onCompleted) onCompleted();
      }
    } catch (err) {
      // Locked step or offline: keep playing, just do not record.
    }
  }, [resourceId, onCompleted]);

  const tick = useCallback((current, duration, playing) => {
    if (!playing || hiddenRef.current) { accStartRef.current = null; return; }
    const start = accStartRef.current;
    if (start == null) { accStartRef.current = current; return; }
    const delta = current - start;
    if (delta < 0 || delta > 5) { accStartRef.current = current; return; } // seek / stall
    if (delta >= 2) {
      accStartRef.current = current;
      send(start, current, current, duration);
    }
  }, [send]);

  const reset = useCallback(() => { accStartRef.current = null; }, []);

  return { progress, setProgress, tick, reset };
}

export default function LessonResourceViewer({ resource, onCompleted }) {
  const { resource_type, resource_id } = resource;

  switch (resource_type) {
    case 'video':
      return <VideoResourceViewer resourceId={resource_id} onCompleted={onCompleted} />;
    case 'material':
      return <MaterialResourceViewer resourceId={resource_id} onCompleted={onCompleted} />;
    case 'activity':
      return <ActivityResourceViewer resourceId={resource_id} onCompleted={onCompleted} />;
    case 'quiz':
      return <QuizResourceViewer resourceId={resource_id} onCompleted={onCompleted} />;
    default:
      return <div className="text-center text-gray-600">Unknown resource type</div>;
  }
}
// ============================================
// VIDEO RESOURCE VIEWER
// ============================================
function VideoResourceViewer({ resourceId, onCompleted }) {
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { progress, setProgress, tick, reset } = useGenuineWatch(resourceId, onCompleted);
  const ytPlayerRef = useRef(null);
  const ytTimerRef = useRef(null);

  useEffect(() => { fetchVideoDetails(); }, [resourceId]);

  // Reset the on-screen percentage when switching videos.
  useEffect(() => { reset(); }, [resourceId, reset]);

  const fetchVideoDetails = async () => {
    try {
      const response = await axiosClient.get(`/child/learning/resources/video/${resourceId}`);
      setVideoData(response.data);
      if (response.data.progress) setProgress((p) => ({ ...p, ...response.data.progress }));
    } catch (err) {
      console.error('Failed to load video:', err);
    } finally {
      setLoading(false);
    }
  };

  const videoUrl = videoData?.resource?.video_url || '';
  const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
  const isVimeo = /vimeo\.com/.test(videoUrl);
  const isUpload = videoData?.resource?.source_type === 'upload' || videoUrl.startsWith('/uploads/');
  const isDirectVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(videoUrl);
  const isNative = isUpload || isDirectVideo;

  // --- Native uploaded video ---
  const handleNativeTimeUpdate = (e) => {
    const v = e.target;
    if (v.duration > 0) tick(v.currentTime, v.duration, !v.paused);
  };

  // --- YouTube player (real playback time, not iframe presence) ---
  useEffect(() => {
    if (!isYouTube || !videoData?.resource?.video_url) return undefined;
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT) return;
      const id = getYouTubeId(videoData.resource.video_url);
      ytPlayerRef.current = new YT.Player('yt-player-' + resourceId, {
        videoId: id,
        playerVars: { rel: 0, modestbranding: 1, start: Math.floor(progress.current_position_seconds || 0) },
        events: {
          onStateChange: (event) => {
            if (event.data === 1) {
              ytTimerRef.current = setInterval(() => {
                const player = ytPlayerRef.current;
                if (!player || typeof player.getCurrentTime !== 'function') return;
                tick(player.getCurrentTime(), player.getDuration(), true);
              }, 3000);
            } else if (ytTimerRef.current) {
              clearInterval(ytTimerRef.current);
              ytTimerRef.current = null;
              reset();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (ytTimerRef.current) clearInterval(ytTimerRef.current);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        ytPlayerRef.current.destroy();
      }
    };
  }, [isYouTube, resourceId, videoData?.resource?.video_url]);

  // --- Vimeo player (real playback time via the Vimeo Player SDK) ---
  const vimeoPlayerRef = useRef(null);
  const vimeoTimerRef = useRef(null);
  useEffect(() => {
    if (!isVimeo || !videoData?.resource?.video_url) return undefined;
    let cancelled = false;
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.async = true;
    script.onload = () => {
      if (cancelled || !window.Vimeo) return;
      const iframe = document.getElementById('vimeo-player-' + resourceId);
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
  }, [isVimeo, resourceId, videoData?.resource?.video_url]);

  if (loading) {
    return <div className="text-center py-8"><div className="text-4xl animate-bounce">📺</div></div>;
  }

  const required = progress.required_percentage || 90;
  const isComplete = progress.completed || progress.watch_percentage >= required;
  const pct = Math.min(100, Math.round(progress.watch_percentage || 0));
  // Uploaded videos are stored as `/uploads/...`; resolve against the API origin.
  const videoSrc = resolveFileUrl(videoData?.resource?.video_url || '');

  return (
    <div className="space-y-4">
      <div className="bg-black rounded-2xl overflow-hidden aspect-video">
        {videoData?.resource?.video_url ? (
          isYouTube ? (
            <div id={'yt-player-' + resourceId} className="w-full h-full" />
          ) : isVimeo ? (
            <iframe
              id={'vimeo-player-' + resourceId}
              src={'https://player.vimeo.com/video/' + (videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1]}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : isNative ? (
            <video
              controls
              className="w-full h-full"
              src={videoSrc}
              onTimeUpdate={handleNativeTimeUpdate}
              onPause={reset}
              onSeeking={reset}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white p-4 text-center">
              <p>This video is hosted externally. Open it to watch; progress tracking is not available for this provider.</p>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <p>Video not available</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-black text-gray-800">📺 Watch Progress</h4>
          <span className="text-2xl font-black text-green-600">{pct}%</span>
        </div>

        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-3">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {isComplete ? (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-lg font-black text-green-700">Great Job!</p>
            <p className="text-sm font-medium text-green-600">You completed the video!</p>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-green-700">
              Watch at least {required}% of the video to continue. Watching is counted only while it really plays.
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
function MaterialResourceViewer({ resourceId, onCompleted }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewPct, setViewPct] = useState(0);
  const [completed, setCompleted] = useState(false);
  const listenedRef = useRef(0);
  const lastTimeRef = useRef(0);
  const reportedRef = useRef(0);

  useEffect(() => { fetchMaterial(); }, [resourceId]);

  const fetchMaterial = async () => {
    try {
      const res = await axiosClient.get(`/child/learning/resources/material/${resourceId}`);
      setData(res.data);
      const p = res.data.progress || {};
      setViewPct(Math.round(Number(p.view_percentage ?? p.progress_percentage ?? 0)));
      setCompleted(!!(p.completed || p.status === 'completed'));
      setPagesViewed(Math.max(1, Number(p.pages_viewed) || 1));
    } catch (err) {
      console.error('Failed to load material:', err);
    } finally {
      setLoading(false);
    }
  };

  const report = async (payload) => {
    try {
      const { data: res } = await axiosClient.post(`/child/learning/progress/material/${resourceId}`, payload);
      const p = res.progress || {};
      setViewPct(Math.round(Number(p.view_percentage ?? p.progress_percentage ?? 0)));
      setCompleted(!!(p.completed || p.status === 'completed'));
      if (p.completed && onCompleted) onCompleted();
    } catch (err) {
      // locked or offline
    }
  };

  // Audio: accumulate only genuinely listened seconds (ignores seeking).
  const handleAudioTime = (e) => {
    const a = e.target;
    if (a.paused || a.duration <= 0) return;
    const delta = a.currentTime - lastTimeRef.current;
    if (delta > 0 && delta <= 2) listenedRef.current += delta;
    lastTimeRef.current = a.currentTime;
    if (listenedRef.current - reportedRef.current >= 5) {
      reportedRef.current = listenedRef.current;
      report({
        view_percentage: (listenedRef.current / a.duration) * 100,
        duration: a.duration,
        listened_seconds: listenedRef.current,
      });
    }
  };

  if (loading) return <div className="text-center py-8"><div className="text-4xl animate-bounce">📄</div></div>;

  const material = data?.resource || {};
  const type = (material.material_type || material.type || '').toLowerCase();
  // Uploaded files are stored as `/uploads/...`, which must be resolved against
  // the API origin (the frontend dev server does not proxy them).
  const fileUrl = resolveFileUrl(material.file_url);
  const pct = Math.min(100, Math.round(viewPct));

  // Determine if this is a viewable file type
  const isViewableInBrowser = ['pdf', 'image', 'audio', 'video'].includes(type);
  const isDownloadable = ['document', 'presentation', 'other'].includes(type);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
        <h3 className="text-xl font-black text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">
            {type === 'audio' ? '🎵' : 
             type === 'pdf' ? '📄' : 
             type === 'image' ? '🖼️' :
             type === 'video' ? '🎬' :
             type === 'document' ? '📝' :
             type === 'presentation' ? '📊' : '📁'}
          </span>
          {material.title}
        </h3>

        {material.description && (
          <p className="text-sm text-gray-600 font-medium mb-4">{material.description}</p>
        )}

        {type === 'audio' && fileUrl && (
          <audio controls className="w-full" src={fileUrl} onTimeUpdate={handleAudioTime}>
            Your browser does not support audio.
          </audio>
        )}

        {type === 'video' && fileUrl && (
          <video controls className="w-full rounded-xl">
            <source src={fileUrl} />
            Your browser does not support video.
          </video>
        )}

        {type === 'pdf' && fileUrl && (
          <div className="space-y-3">
            <iframe title={material.title} src={fileUrl} className="w-full h-[600px] rounded-xl border" />
            <div className="flex items-center justify-center gap-3">
      <a href={fileUrl} download target="_blank" rel="noreferrer" className="inline-block px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full hover:from-green-600 hover:to-emerald-700 shadow transition">
        Download PDF
      </a>
      <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-block px-6 py-2 bg-white border-2 border-green-300 text-green-700 font-bold rounded-full hover:bg-green-50 transition">
        Open in new tab
      </a>
    </div>
          </div>
        )}

        {type === 'image' && fileUrl && (
          <img src={fileUrl} alt={material.title} className="w-full rounded-xl border shadow-md" />
        )}

        {(type === 'document' || type === 'presentation' || type === 'other') && fileUrl && (
          <div className="space-y-4">
            {/* Try to display in iframe for Office documents */}
            {(type === 'document' || type === 'presentation') && (
              <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
                <iframe 
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                  className="w-full h-[600px]"
                  frameBorder="0"
                  title={material.title}
                >
                  <p>Your browser does not support iframes.</p>
                </iframe>
              </div>
            )}
            
            {/* Always provide download link */}
            <div className="bg-white border-2 border-green-300 rounded-xl p-6 text-center">
              <div className="text-5xl mb-4">📥</div>
              <h4 className="text-lg font-black text-gray-800 mb-2">Download Material</h4>
              <p className="text-sm text-gray-600 mb-4">
                {type === 'document' ? 'Word Document' : 
                 type === 'presentation' ? 'PowerPoint Presentation' : 'File'}
              </p>
              <a 
                href={fileUrl} 
                download
                target="_blank" 
                rel="noreferrer" 
                className="inline-block px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-full hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition transform hover:scale-105"
              >
                📄 Download & Open
              </a>
            </div>
          </div>
        )}

        {!fileUrl && (
          <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
            <div className="text-5xl mb-2">⚠️</div>
            <p className="text-gray-700 font-bold">Material file not available</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-black text-gray-800">📖 Progress</h4>
          <span className="text-2xl font-black text-green-600">{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden mb-3">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {completed ? (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-lg font-black text-green-700">Excellent!</p>
            <p className="text-sm font-medium text-green-600">You finished this material!</p>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center space-y-3">
            {type === 'pdf' ? (
  <button
    onClick={() => report({ view_percentage: 100 })}
    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-full hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition transform hover:scale-105"
  >
    I have read this PDF
  </button>
) : type === 'audio' ? (
              <p className="text-sm font-bold text-green-700">Listen to at least 90% of the audio to finish.</p>
            ) : type === 'video' ? (
              <p className="text-sm font-bold text-green-700">Watch the video to continue.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-bold text-green-700">
                  {isDownloadable ? 'Download and review the material, then mark as complete.' : 'Review the material to continue.'}
                </p>
                <button
                  onClick={() => report({ view_percentage: 100 })}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-full hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition transform hover:scale-105"
                >
                  ✓ I Finished This
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// ============================================
// ACTIVITY RESOURCE VIEWER
// ============================================
function ActivityResourceViewer({ resourceId }) {
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchActivityDetails(); }, [resourceId]);

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

  if (loading) return <div className="text-center py-8"><div className="text-4xl animate-bounce">✏️</div></div>;

  const status = activityData?.progress?.status;
  const hasSubmission = status === 'graded' || status === 'pending' || status === 'submitted';

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">✏️</div>
          <h3 className="text-2xl font-black text-gray-800">{activityData?.resource?.title}</h3>
          <p className="text-gray-700 font-bold text-lg">
            {activityData?.resource?.activity_type?.replace(/_/g, ' ').toUpperCase()}
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
function QuizResourceViewer({ resourceId }) {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchQuizDetails(); }, [resourceId]);

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

  if (loading) return <div className="text-center py-8"><div className="text-4xl animate-bounce">🧠</div></div>;

  const passing = quizData?.resource?.passing_score || 60;
  const scorePct = quizData?.progress?.percentage != null ? Number(quizData.progress.percentage) : null;
  const hasAttempt = scorePct != null;
  const isPassed = scorePct != null && scorePct >= passing;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border-2 border-yellow-200 min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">🧠</div>
          <h3 className="text-2xl font-black text-gray-800">{quizData?.resource?.title}</h3>
          <p className="text-gray-600 font-medium max-w-2xl mx-auto">
            {quizData?.resource?.description || 'Test your knowledge with this quiz!'}
          </p>
          <p className="text-sm font-bold text-orange-600">Passing score: {passing}%</p>

          {hasAttempt && isPassed ? (
            <div className="bg-white border-2 border-green-300 rounded-2xl p-6">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-lg font-black text-green-700">Quiz Passed!</p>
              <p className="text-sm font-medium text-green-600">Score: {Math.round(scorePct)}%</p>
            </div>
          ) : (
            <Link
              to={`/child/quizzes/${resourceId}`}
              className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black text-lg rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              {hasAttempt ? '🔄 Try Again' : '📝 Take Quiz'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
