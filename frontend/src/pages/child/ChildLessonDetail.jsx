import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function ChildLessonDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Active Learning Session Stopwatch
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);

  // Interactive media modals
  const [activePdf, setActivePdf] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [activeAudio, setActiveAudio] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  // Video Resume & Interval Tracking State
  const [videoResumePrompt, setVideoResumePrompt] = useState(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const lastVideoReportRef = useRef(0);
  const lastAudioReportRef = useRef(0);

  // 1. Fetch Lesson & Initial Session Time
  useEffect(() => {
    fetchLesson();
  }, [id]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/child/lessons/${id}`);
      setData(res.data);
      setActiveSeconds(res.data?.active_learning_seconds || res.data?.lesson?.active_learning_seconds || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Oops! We could not load this lesson. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  // 2. Window visibility listener for learning stopwatch
  useEffect(() => {
    const handleVisibility = () => {
      const active = !document.hidden && document.hasFocus();
      setIsTabActive(active);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', () => setIsTabActive(false));
    window.addEventListener('focus', () => setIsTabActive(true));

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', () => setIsTabActive(false));
      window.removeEventListener('focus', () => setIsTabActive(true));
    };
  }, []);

  // 3. Active stopwatch & periodic session ping
  useEffect(() => {
    if (!data || !isTabActive) return;

    // Increment visible active seconds each second
    const secTimer = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);

    // Ping backend every 5 seconds with active delta
    const pingTimer = setInterval(async () => {
      try {
        await axiosClient.post(`/child/lessons/${id}/session/ping`, { delta_seconds: 5 });
      } catch (err) {
        console.warn('Session ping failed:', err);
      }
    }, 5000);

    return () => {
      clearInterval(secTimer);
      clearInterval(pingTimer);
    };
  }, [data, isTabActive, id]);

  // Video launch handler with resume detection
  const handleOpenVideo = (video) => {
    setActiveVideo(video);
    if (video.last_position_seconds > 5 && !video.is_completed) {
      setVideoResumePrompt({
        position: video.last_position_seconds,
        video,
      });
    } else {
      setVideoResumePrompt(null);
    }
    lastVideoReportRef.current = 0;
  };

  // Video time update event: tracks genuine watch intervals
  const handleVideoTimeUpdate = async () => {
    const vid = videoRef.current;
    if (!vid || !activeVideo) return;

    const current = vid.currentTime;
    const dur = vid.duration || activeVideo.duration_seconds || 60;
    const prev = lastVideoReportRef.current;

    // Report in chunks of 3-5 seconds or at completion
    if (current - prev >= 3 || current >= dur - 0.5) {
      const fromSec = Math.max(0, prev);
      const toSec = Math.min(dur, current);
      lastVideoReportRef.current = current;

      try {
        const res = await axiosClient.post(`/child/videos/${activeVideo.id}/progress`, {
          duration: Math.round(dur),
          current_position: current,
          interval: { from: fromSec, to: toSec },
        });

        if (res.data) {
          setData((prevData) => {
            if (!prevData) return prevData;
            return {
              ...prevData,
              videos: prevData.videos.map((v) =>
                v.id === activeVideo.id
                  ? {
                      ...v,
                      watched: res.data.is_completed,
                      is_completed: res.data.is_completed,
                      progress_percentage: res.data.progress_percentage,
                      watched_seconds: res.data.watched_seconds,
                      last_position_seconds: res.data.last_position_seconds,
                    }
                  : v
              ),
            };
          });
        }
      } catch (e) {
        console.warn('Video progress ping failed:', e);
      }
    }
  };

  // Audio listen handler & progress tracking
  const handleOpenAudio = (material) => {
    setActiveAudio(material);
    lastAudioReportRef.current = 0;
  };

  const handleAudioTimeUpdate = async () => {
    const aud = audioRef.current;
    if (!aud || !activeAudio) return;

    const current = aud.currentTime;
    const dur = aud.duration || 60;
    const prev = lastAudioReportRef.current;

    if (current - prev >= 4 || current >= dur - 0.5) {
      lastAudioReportRef.current = current;
      try {
        const res = await axiosClient.post(`/child/materials/${activeAudio.id}/progress`, {
          duration: Math.round(dur),
          current_position: current,
          listened_seconds: current,
        });

        if (res.data) {
          setData((prevData) => {
            if (!prevData) return prevData;
            return {
              ...prevData,
              materials: prevData.materials.map((m) =>
                m.id === activeAudio.id
                  ? {
                      ...m,
                      listened: res.data.is_completed,
                      is_completed: res.data.is_completed,
                      progress_percentage: res.data.progress_percentage,
                    }
                  : m
              ),
            };
          });
        }
      } catch (e) {
        console.warn('Audio progress ping failed:', e);
      }
    }
  };

  // PDF page view ping
  const handleOpenPdf = async (material) => {
    setActivePdf({
      url: resolveFileUrl(material.file_url),
      title: material.title,
      id: material.id,
    });
    try {
      await axiosClient.post(`/child/materials/${material.id}/progress`, {
        pages_viewed: 1,
        total_pages: 1,
      });
      setData((prevData) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          materials: prevData.materials.map((m) =>
            m.id === material.id
              ? {
                  ...m,
                  is_completed: true,
                  progress_percentage: 100,
                }
              : m
          ),
        };
      });
    } catch (e) {
      console.warn('PDF view ping failed:', e);
    }
  };

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl animate-bounce">📖</div>
        <p className="text-lg font-black text-purple-700 animate-pulse">Opening your lesson... ✨</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-lg mx-auto my-12">
        <Link to="/child/courses" className="inline-flex items-center text-purple-600 hover:text-purple-700 font-bold">
          <span>←</span> Back to Courses
        </Link>
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl text-center">
          <span className="text-4xl block mb-2">🎈</span>
          <p className="text-rose-700 font-bold text-sm mb-4">{error}</p>
          <button
            onClick={fetchLesson}
            className="px-6 py-2 bg-purple-600 text-white font-bold rounded-2xl shadow hover:bg-purple-700 transition"
          >
            Try Again 🔄
          </button>
        </div>
      </div>
    );
  }

  const { lesson, materials = [], videos = [], activities = [], quizzes = [] } = data;

  // Real engagement status calculation
  const totalItems = materials.length + videos.length + activities.length + quizzes.length;
  const completedMaterials = materials.filter((m) => m.is_completed || m.listened).length;
  const completedVideos = videos.filter((v) => v.is_completed || v.watched).length;
  const completedActivities = activities.filter((a) => a.is_completed || a.submission_status === 'graded').length;
  const completedQuizzes = quizzes.filter((q) => q.is_completed || q.is_passed).length;

  const totalCompleted = completedMaterials + completedVideos + completedActivities + completedQuizzes;
  const lessonProgressPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 100;
  const isAllCompleted = totalItems > 0 && totalCompleted >= totalItems;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📖', count: null },
    { id: 'materials', label: 'Materials', icon: '📄', count: materials.length },
    { id: 'videos', label: 'Videos', icon: '🎬', count: videos.length },
    { id: 'activities', label: 'Activities', icon: '🎯', count: activities.length },
    { id: 'quizzes', label: 'Quizzes', icon: '📝', count: quizzes.length },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={`/child/courses/${lesson.course_id}`}
          className="inline-flex items-center gap-1.5 text-purple-700 hover:text-purple-800 font-bold text-sm bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-purple-100 transition hover:scale-105"
        >
          <span>←</span> Back to {lesson.course_title || 'Course'}
        </Link>
      </div>

      {/* Lesson Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-purple-100 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              <span>📖</span> Lesson {lesson.order_index || 1}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              {lesson.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Course: <strong className="text-purple-700">{lesson.course_title}</strong> • Instructor: <strong className="text-slate-700">{lesson.instructor_name || 'Sara'}</strong>
            </p>
          </div>

          {/* Active Learning Session Stopwatch & Lesson Progress */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-4 min-w-[170px] text-center shadow-inner">
              <div className="flex items-center justify-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-800">
                <span className={`w-2 h-2 rounded-full ${isTabActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                Learning Time
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-900 my-1">
                ⏱ {formatTimer(activeSeconds)}
              </div>
              <div className="text-[10px] font-bold text-amber-700">
                {isTabActive ? '🟢 Active Focus' : '⏸️ Paused (Away)'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-200 rounded-3xl p-4 min-w-[180px] text-center shadow-inner">
              <div className="text-[11px] font-black uppercase tracking-wider text-purple-700">Lesson Progress</div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700 my-1">{lessonProgressPct}%</div>
              <div className="w-full bg-purple-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${lessonProgressPct}%` }}
                />
              </div>
              <div className="text-[10px] font-bold text-purple-600 mt-1">
                {isAllCompleted ? '🎉 Complete!' : `${totalCompleted}/${totalItems} Finished`}
              </div>
            </div>
          </div>
        </div>

        {/* Learning Objectives */}
        {lesson.description && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🎯</span>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">Learning Objective</h4>
              <p className="text-xs sm:text-sm font-medium text-slate-700">{lesson.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden">
        <div className="border-b border-purple-100 px-3 py-2 bg-slate-50/50">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar" role="tablist">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={active}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-white hover:text-purple-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        active ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6">
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('materials')}
                  className="bg-blue-50 hover:bg-blue-100/70 cursor-pointer p-4 rounded-3xl text-center border border-blue-100 transition transform hover:scale-105"
                >
                  <span className="text-3xl block mb-1">📄</span>
                  <div className="text-xl font-black text-blue-900">{materials.length}</div>
                  <div className="text-xs font-bold text-blue-600">Materials</div>
                </div>

                <div
                  onClick={() => setActiveTab('videos')}
                  className="bg-purple-50 hover:bg-purple-100/70 cursor-pointer p-4 rounded-3xl text-center border border-purple-100 transition transform hover:scale-105"
                >
                  <span className="text-3xl block mb-1">🎬</span>
                  <div className="text-xl font-black text-purple-900">{videos.length}</div>
                  <div className="text-xs font-bold text-purple-600">Videos</div>
                </div>

                <div
                  onClick={() => setActiveTab('activities')}
                  className="bg-emerald-50 hover:bg-emerald-100/70 cursor-pointer p-4 rounded-3xl text-center border border-emerald-100 transition transform hover:scale-105"
                >
                  <span className="text-3xl block mb-1">🎯</span>
                  <div className="text-xl font-black text-emerald-900">{activities.length}</div>
                  <div className="text-xs font-bold text-emerald-600">Activities</div>
                </div>

                <div
                  onClick={() => setActiveTab('quizzes')}
                  className="bg-amber-50 hover:bg-amber-100/70 cursor-pointer p-4 rounded-3xl text-center border border-amber-100 transition transform hover:scale-105"
                >
                  <span className="text-3xl block mb-1">📝</span>
                  <div className="text-xl font-black text-amber-900">{quizzes.length}</div>
                  <div className="text-xs font-bold text-amber-600">Quizzes</div>
                </div>
              </div>

              {/* Progress Checklist */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>✅</span> Lesson Completion Checklist
                  </h3>
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                    {totalCompleted} of {totalItems} items completed
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Materials items */}
                  {materials.map((m) => {
                    const isDone = m.is_completed || m.listened;
                    const inProg = !isDone && (m.progress_percentage > 0 || m.pages_viewed > 0);
                    return (
                      <div key={m.id} className="flex items-center justify-between text-xs font-bold p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 truncate">
                          <span>{m.material_type === 'audio' ? '🎧' : '📄'}</span>
                          <span className="truncate">{m.title}</span>
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold">{m.material_type}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                          isDone ? 'bg-emerald-100 text-emerald-700' :
                          inProg ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isDone ? '✓ Completed' : inProg ? `▶ ${m.progress_percentage}%` : '○ Not Started'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Videos items */}
                  {videos.map((v) => {
                    const isDone = v.is_completed || v.watched;
                    const inProg = !isDone && (v.progress_percentage > 0 || v.watched_seconds > 0);
                    return (
                      <div key={v.id} className="flex items-center justify-between text-xs font-bold p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 truncate">
                          <span>🎬</span>
                          <span className="truncate">{v.title}</span>
                          {v.duration_seconds > 0 && (
                            <span className="text-[10px] text-slate-500">({Math.round(v.duration_seconds / 60)}m)</span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                          isDone ? 'bg-emerald-100 text-emerald-700' :
                          inProg ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isDone ? '✓ Watched (≥90%)' : inProg ? `▶ ${v.progress_percentage}% watched` : '○ Not Started'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Activities items */}
                  {activities.map((a) => {
                    const isGraded = a.is_completed || a.submission_status === 'graded';
                    const isSub = !isGraded && (a.submission_status === 'pending' || a.submission_status === 'submitted');
                    const inProg = !isGraded && !isSub && a.activity_status === 'in_progress';
                    return (
                      <div key={a.id} className="flex items-center justify-between text-xs font-bold p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 truncate">
                          <span>🎯</span>
                          <span className="truncate">{a.title}</span>
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold">{a.activity_type}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                          isGraded ? 'bg-emerald-100 text-emerald-700' :
                          isSub ? 'bg-blue-100 text-blue-700' :
                          inProg ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isGraded ? `✓ Graded (${a.score}/${a.max_score || 10})` :
                           isSub ? '✓ Submitted' :
                           inProg ? '▶ In Progress' : '○ Not Started'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Quizzes items */}
                  {quizzes.map((q) => {
                    const isPassed = q.is_completed || q.is_passed;
                    const hasAttempt = !isPassed && q.result_id;
                    return (
                      <div key={q.id} className="flex items-center justify-between text-xs font-bold p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 truncate">
                          <span>📝</span>
                          <span className="truncate">{q.title}</span>
                          <span className="text-[10px] text-slate-500">(Pass mark: 60%)</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                          isPassed ? 'bg-emerald-100 text-emerald-700' :
                          hasAttempt ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isPassed ? `✓ Passed (${q.score}/${q.total_points})` :
                           hasAttempt ? `❌ Failed (${q.percentage}%) - Retry` :
                           '○ Not Started'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. MATERIALS TAB */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              {materials.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl">
                  <span className="text-4xl block mb-2">📄</span>
                  <p className="text-sm font-bold text-slate-600">No materials added for this lesson yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {materials.map((mat) => {
                    const isPdf = mat.type === 'pdf' || mat.file_url?.endsWith('.pdf');
                    const isAudio = mat.type === 'audio' || mat.file_url?.match(/\.(mp3|wav|ogg)$/i);
                    const isImage = mat.type === 'image' || mat.file_url?.match(/\.(png|jpg|jpeg|webp|gif)$/i);

                    return (
                      <div
                        key={mat.id}
                        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
                            {isPdf ? '📄' : isAudio ? '🎧' : isImage ? '🖼️' : '📑'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-black text-slate-800 truncate">{mat.title}</h4>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-extrabold">{mat.type}</p>
                            {mat.description && <p className="text-xs text-slate-600 line-clamp-2 mt-1">{mat.description}</p>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          {mat.listened && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <span>✓</span> Listened
                            </span>
                          )}

                          {isPdf && (
                            <button
                              onClick={() => handleOpenPdf(mat)}
                              className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition"
                            >
                              Open PDF 📄
                            </button>
                          )}

                          {isImage && (
                            <button
                              onClick={() => setActiveImage(resolveFileUrl(mat.file_url))}
                              className="ml-auto px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow transition"
                            >
                              View Image 🖼️
                            </button>
                          )}

                          {isAudio && (
                            <button
                              onClick={() => handleOpenAudio(mat)}
                              className="ml-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition"
                            >
                              Listen 🎧
                            </button>
                          )}

                          {!isPdf && !isImage && !isAudio && (
                            <a
                              href={resolveFileUrl(mat.file_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-auto px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow transition"
                            >
                              Open File 🔗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. VIDEOS TAB */}
          {activeTab === 'videos' && (
            <div className="space-y-4">
              {videos.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl">
                  <span className="text-4xl block mb-2">🎬</span>
                  <p className="text-sm font-bold text-slate-600">No educational videos uploaded for this lesson yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {videos.map((vid) => (
                    <div
                      key={vid.id}
                      className="bg-white rounded-3xl overflow-hidden border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="relative h-44 bg-slate-900 flex items-center justify-center group cursor-pointer" onClick={() => handleOpenVideo(vid)}>
                        {vid.thumbnail_url ? (
                          <img src={resolveFileUrl(vid.thumbnail_url)} alt={vid.title} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="text-slate-500 text-5xl">🎬</div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition">
                          <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 transition">
                            ▶
                          </div>
                        </div>
                        {(vid.is_completed || vid.watched) && (
                          <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow">
                            ✓ Watched
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm sm:text-base font-black text-slate-800 line-clamp-1">{vid.title}</h4>
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                            {vid.progress_percentage || 0}%
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenVideo(vid)}
                          className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-2xl text-xs shadow hover:opacity-95 transition flex items-center justify-center gap-1.5"
                        >
                          <span>{vid.is_completed ? 'Rewatch Video' : vid.last_position_seconds > 0 ? 'Continue Video' : 'Watch Video'}</span>
                          <span>🎬</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. ACTIVITIES TAB */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl">
                  <span className="text-4xl block mb-2">🎯</span>
                  <p className="text-sm font-bold text-slate-600">No activities created for this lesson yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activities.map((act) => {
                    const typeSlug =
                      act.activity_type === 'writing' ? 'write' :
                      act.activity_type === 'matching' ? 'match' :
                      act.activity_type === 'reading' ? 'read' :
                      act.activity_type === 'listening' ? 'listen' : 'worksheet';

                    return (
                      <div
                        key={act.id}
                        className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                              {act.activity_type}
                            </span>
                            {act.submission_status === 'graded' ? (
                              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                ✓ Graded: {act.score} / {act.max_score || 10}
                              </span>
                            ) : act.submission_status === 'pending' ? (
                              <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                                ✓ Submitted
                              </span>
                            ) : null}
                          </div>

                          <h4 className="text-base font-black text-slate-800">{act.title}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2">{act.instructions}</p>

                          {/* Instructor feedback if graded */}
                          {act.feedback && (
                            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                              <strong>Teacher Feedback:</strong> {act.feedback}
                            </div>
                          )}
                        </div>

                        <Link
                          to={`/child/activities/${act.id}/${typeSlug}`}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 text-white font-bold rounded-2xl text-center text-xs shadow transition flex items-center justify-center gap-1.5"
                        >
                          <span>{act.submission_status ? 'Review / Redo' : 'Start Activity'}</span>
                          <span>➔</span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. QUIZZES TAB */}
          {activeTab === 'quizzes' && (
            <div className="space-y-4">
              {quizzes.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl">
                  <span className="text-4xl block mb-2">📝</span>
                  <p className="text-sm font-bold text-slate-600">No quizzes available for this lesson yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                            Quiz
                          </span>
                          {quiz.result_id && (
                            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              Score: {quiz.score} / {quiz.total_points}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-black text-slate-800">{quiz.title}</h4>
                        {quiz.description && <p className="text-xs text-slate-600 line-clamp-2">{quiz.description}</p>}

                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                          {quiz.time_limit_seconds && <span>⏱️ {Math.round(quiz.time_limit_seconds / 60)} mins</span>}
                          <span>🎯 Attempts: {quiz.attempt_count || 0}</span>
                        </div>
                      </div>

                      <Link
                        to={`/child/quizzes/${quiz.id}`}
                        className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-bold rounded-2xl text-center text-xs shadow transition flex items-center justify-center gap-1.5"
                      >
                        <span>{quiz.result_id ? 'Retake Quiz' : 'Take Quiz'}</span>
                        <span>➔</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Video Player with Real Time Interval Tracking & Resume Prompt */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-3xl w-full border border-slate-700 shadow-2xl relative flex flex-col">
            <div className="p-4 bg-slate-800 flex items-center justify-between text-white border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎬</span>
                <h3 className="font-bold text-sm truncate max-w-md">{activeVideo.title}</h3>
              </div>
              <button
                onClick={() => {
                  setActiveVideo(null);
                  setVideoResumePrompt(null);
                }}
                className="text-xl px-2 hover:text-rose-400 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Resume prompt banner */}
            {videoResumePrompt && (
              <div className="bg-indigo-900/90 text-indigo-100 p-3 flex items-center justify-between text-xs px-4 border-b border-indigo-700">
                <span>
                  📍 You were watching this earlier. Continue from{' '}
                  <strong className="text-yellow-300 font-bold">
                    {formatTimer(videoResumePrompt.position)}
                  </strong>
                  ?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = videoResumePrompt.position;
                      }
                      setVideoResumePrompt(null);
                    }}
                    className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black rounded-xl text-xs shadow"
                  >
                    Resume ⏩
                  </button>
                  <button
                    onClick={() => setVideoResumePrompt(null)}
                    className="px-2 py-1 bg-slate-700 text-slate-300 rounded-xl text-xs hover:text-white"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}

            <div className="aspect-video w-full bg-black relative">
              {activeVideo.source_type === 'youtube' ||
              activeVideo.video_url?.includes('youtube.com') ||
              activeVideo.video_url?.includes('youtu.be') ? (
                <iframe
                  src={
                    activeVideo.video_url.includes('embed')
                      ? activeVideo.video_url
                      : `https://www.youtube-nocookie.com/embed/${activeVideo.video_url.split('v=')[1]?.split('&')[0] || activeVideo.video_url.split('/').pop()}`
                  }
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={resolveFileUrl(activeVideo.video_url)}
                  controls
                  autoPlay
                  onTimeUpdate={handleVideoTimeUpdate}
                  className="w-full h-full"
                />
              )}
            </div>

            <div className="p-3 bg-slate-800/90 text-xs text-slate-400 flex items-center justify-between border-t border-slate-700">
              <span>
                Watched: <strong className="text-purple-400 font-bold">{activeVideo.watched_seconds || 0}s</strong> ({activeVideo.progress_percentage || 0}%)
              </span>
              <span className={activeVideo.is_completed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {activeVideo.is_completed ? '✓ Lesson video requirement completed (≥90%)' : 'Watch ≥90% to complete'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PDF Viewer with tracking */}
      {activePdf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 bg-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📄</span>
                <h3 className="font-bold text-sm truncate">{activePdf.title || 'Worksheet / PDF'}</h3>
              </div>
              <button onClick={() => setActivePdf(null)} className="text-xl px-2 font-bold">
                ✕
              </button>
            </div>
            <iframe src={activePdf.url} title="PDF Viewer" className="w-full flex-1 border-0" />
            <div className="p-2.5 bg-slate-100 text-slate-600 text-xs flex items-center justify-between px-4 border-t border-slate-200">
              <span className="font-bold text-emerald-600">✓ Progress Recorded</span>
              <button
                onClick={() => setActivePdf(null)}
                className="px-4 py-1 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700"
              >
                Close Worksheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Image Viewer */}
      {activeImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveImage(null)}>
          <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full p-2 relative shadow-2xl">
            <button onClick={() => setActiveImage(null)} className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 font-bold">
              ✕
            </button>
            <img src={activeImage} alt="Enlarged" className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* MODAL: Audio Player with Interval Progress Tracking */}
      {activeAudio && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-purple-100">
            <span className="text-6xl animate-pulse block">🎧</span>
            <h3 className="text-lg font-black text-slate-800">{activeAudio.title}</h3>
            <p className="text-xs text-slate-500 font-medium">Listen and repeat along!</p>
            <audio
              ref={audioRef}
              src={resolveFileUrl(activeAudio.file_url)}
              controls
              autoPlay
              onTimeUpdate={handleAudioTimeUpdate}
              className="w-full mt-2"
            />
            <div className="text-xs font-bold text-purple-700">
              {activeAudio.is_completed ? '✓ Requirement completed (≥90% listened)' : 'Listen to at least 90% to complete'}
            </div>
            <button
              onClick={() => setActiveAudio(null)}
              className="px-6 py-2 bg-purple-600 text-white font-bold rounded-2xl text-xs hover:bg-purple-700 transition shadow"
            >
              Close Audio ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}