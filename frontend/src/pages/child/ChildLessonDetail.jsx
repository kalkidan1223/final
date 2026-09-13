import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function ChildLessonDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Interactive media modals
  const [activePdf, setActivePdf] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [activeAudio, setActiveAudio] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    fetchLesson();
  }, [id]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/child/lessons/${id}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Oops! We could not load this lesson. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  const handleWatchVideo = async (video) => {
    setActiveVideo(video);
    try {
      await axiosClient.post(`/child/videos/${video.id}/watch`);
      // Update local state to show watched
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          videos: prev.videos.map((v) => (v.id === video.id ? { ...v, watched: true } : v)),
        };
      });
    } catch (e) {
      console.warn('Watch video track failed:', e);
    }
  };

  const handleListenAudio = async (material) => {
    setActiveAudio(material);
    try {
      await axiosClient.post(`/child/materials/${material.id}/listen`);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          materials: prev.materials.map((m) => (m.id === material.id ? { ...m, listened: true } : m)),
        };
      });
    } catch (e) {
      console.warn('Listen material track failed:', e);
    }
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

  // Calculate live lesson progress
  const totalItems = videos.length + activities.length + quizzes.length;
  const completedVideos = videos.filter((v) => v.watched).length;
  const completedActivities = activities.filter((a) => a.submission_status === 'graded' || a.submission_status === 'pending').length;
  const completedQuizzes = quizzes.filter((q) => q.result_id).length;
  const totalCompleted = completedVideos + completedActivities + completedQuizzes;
  const lessonProgressPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 100;

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

          {/* Lesson Completion Progress Badge */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-200 rounded-3xl p-4 min-w-[200px] text-center shadow-inner">
            <div className="text-xs font-black uppercase tracking-wider text-purple-700">Lesson Progress</div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-700 my-1">{lessonProgressPct}%</div>
            <div className="w-full bg-purple-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${lessonProgressPct}%` }}
              />
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
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span>✅</span> Lesson Completion Checklist
                </h3>

                <div className="space-y-2">
                  {videos.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-xs font-bold p-2.5 rounded-2xl bg-white border border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <span>🎬</span>
                        <span className="truncate">{v.title}</span>
                      </div>
                      <span className={v.watched ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}>
                        {v.watched ? '✓ Watched' : '○ Not Watched'}
                      </span>
                    </div>
                  ))}

                  {activities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs font-bold p-2.5 rounded-2xl bg-white border border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <span>🎯</span>
                        <span className="truncate">{a.title}</span>
                      </div>
                      <span className={a.submission_status === 'graded' ? 'text-emerald-600 font-extrabold' : a.submission_status === 'pending' ? 'text-blue-600 font-extrabold' : 'text-slate-400'}>
                        {a.submission_status === 'graded' ? `✓ Graded (${a.score}/${a.max_score || 10})` : a.submission_status === 'pending' ? '✓ Submitted' : '○ Not Completed'}
                      </span>
                    </div>
                  ))}

                  {quizzes.map((q) => (
                    <div key={q.id} className="flex items-center justify-between text-xs font-bold p-2.5 rounded-2xl bg-white border border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <span>📝</span>
                        <span className="truncate">{q.title}</span>
                      </div>
                      <span className={q.result_id ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}>
                        {q.result_id ? `✓ Completed (${q.score}/${q.total_points})` : '○ Not Completed'}
                      </span>
                    </div>
                  ))}
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
                              onClick={() => setActivePdf(resolveFileUrl(mat.file_url))}
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
                              onClick={() => handleListenAudio(mat)}
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
                      <div className="relative h-44 bg-slate-900 flex items-center justify-center group cursor-pointer" onClick={() => handleWatchVideo(vid)}>
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
                        {vid.watched && (
                          <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow">
                            ✓ Watched
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <h4 className="text-sm sm:text-base font-black text-slate-800 line-clamp-1">{vid.title}</h4>
                        <button
                          onClick={() => handleWatchVideo(vid)}
                          className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-2xl text-xs shadow hover:opacity-95 transition"
                        >
                          Watch Video 🎬
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

      {/* MODAL: Video Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-3xl w-full border border-slate-700 shadow-2xl relative">
            <div className="p-4 bg-slate-800 flex items-center justify-between text-white border-b border-slate-700">
              <h3 className="font-bold text-sm truncate">{activeVideo.title}</h3>
              <button onClick={() => setActiveVideo(null)} className="text-xl px-2 hover:text-rose-400 font-bold">
                ✕
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              {activeVideo.source_type === 'youtube' || activeVideo.video_url?.includes('youtube.com') || activeVideo.video_url?.includes('youtu.be') ? (
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
                <video src={resolveFileUrl(activeVideo.video_url)} controls autoPlay className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PDF Viewer */}
      {activePdf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 bg-purple-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Practice Worksheet / PDF</h3>
              <button onClick={() => setActivePdf(null)} className="text-xl px-2 font-bold">
                ✕
              </button>
            </div>
            <iframe src={activePdf} title="PDF Viewer" className="w-full flex-1 border-0" />
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

      {/* MODAL: Audio Player */}
      {activeAudio && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-purple-100">
            <span className="text-6xl animate-pulse block">🎧</span>
            <h3 className="text-lg font-black text-slate-800">{activeAudio.title}</h3>
            <p className="text-xs text-slate-500 font-medium">Listen and repeat along!</p>
            <audio src={resolveFileUrl(activeAudio.file_url)} controls autoPlay className="w-full mt-2" />
            <button
              onClick={() => setActiveAudio(null)}
              className="px-6 py-2 bg-purple-600 text-white font-bold rounded-2xl text-xs hover:bg-purple-700 transition"
            >
              Done Listening ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}