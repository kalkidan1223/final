import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MdVolumeUp,
  MdPause,
  MdArrowBack,
  MdArrowForward,
  MdRefresh,
  MdCheckCircle,
  MdStar,
  MdHeadphones,
  MdSchool,
  MdCelebration,
  MdEmojiEvents,
  MdMusicNote,
  MdSportsEsports,
  MdAutoStories,
} from 'react-icons/md';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function ChildFidelLesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  // Data State
  const [lessonData, setLessonData] = useState(null);
  const [families, setFamilies] = useState([]);
  const [currentFamilyIndex, setCurrentFamilyIndex] = useState(0);
  const [progressMap, setProgressMap] = useState({});
  const [lessonProgress, setLessonProgress] = useState({ status: 'not_started', progress_percentage: 0 });

  // Playback State
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
  const audioRef = useRef(new Audio());

  // Mode: 'explore' (Explore & Tap) or 'practice' (Listen & Identify Game)
  const [activeMode, setActiveMode] = useState('explore');

  // Practice Challenge Game State
  const [challengeTargetForm, setChallengeTargetForm] = useState(null);
  const [challengeChoices, setChallengeChoices] = useState([]);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeRoundsCompleted, setChallengeRoundsCompleted] = useState(0);
  const [challengeFeedback, setChallengeFeedback] = useState(null); // { type: 'success'|'try_again', message: string }
  const [challengeCompleted, setChallengeCompleted] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Audio Events
  useEffect(() => {
    const audio = audioRef.current;
    audio.onended = () => {
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };
    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      setIsLoadingAudio(false);
      setPlaybackError('Could not play pronunciation. Tap to retry.');
    };
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Fetch Fidel Lesson Content
  useEffect(() => {
    async function loadFidelContent() {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosClient.get(`/student/lessons/${lessonId}/fidel-content`);
        setLessonData(res.data.lesson);
        setFamilies(res.data.families || []);
        setProgressMap(res.data.progress || {});
        setLessonProgress(res.data.lesson_progress || { status: 'not_started', progress_percentage: 0 });

        // Select first form of first family initially without playing
        if (res.data.families?.[0]?.forms?.[0]) {
          setSelectedFormId(res.data.families[0].forms[0].id);
        }
      } catch (err) {
        console.error('Failed to load child fidel lesson:', err);
        if (err.response?.status === 403) {
          setError(err.response?.data?.error || 'You cannot access this lesson yet.');
        } else if (err.response?.status === 404) {
          setError('Lesson not found.');
        } else {
          setError('Failed to load lesson content. Please check your connection.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadFidelContent();
  }, [lessonId]);

  // Current active family
  const currentFamily = families[currentFamilyIndex] || null;
  const currentForms = currentFamily?.forms || [];

  // Play audio for a specific character form
  async function handleFormClick(form) {
    setPlaybackError(null);
    setSelectedFormId(form.id);

    // If already playing this form, stop it
    if (isPlaying && audioRef.current.src.includes(form.audio_url)) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Stop previous audio
    audioRef.current.pause();
    setIsLoadingAudio(true);
    setIsPlaying(false);

    try {
      const fullUrl = resolveFileUrl(form.audio_url);
      audioRef.current.src = fullUrl;
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoadingAudio(false);

      // Record listening event on backend asynchronously
      axiosClient
        .post(`/student/lessons/${lessonId}/fidel-progress`, {
          fidel_character_id: form.id,
        })
        .then((res) => {
          if (res.data.progress) {
            setProgressMap((prev) => ({
              ...prev,
              [form.id]: {
                ...prev[form.id],
                listen_count: res.data.progress.listen_count,
                first_listened_at: res.data.progress.first_listened_at,
              },
            }));
          }
        })
        .catch((err) => {
          console.warn('Progress recording notice:', err.message);
        });
    } catch (err) {
      console.error('Audio play error:', err);
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setPlaybackError('Sound is loading. Tap again to hear.');
    }
  }

  // Replay currently selected form audio
  function handleReplay() {
    const activeForm = currentForms.find((f) => f.id === selectedFormId) || currentForms[0];
    if (activeForm) {
      handleFormClick(activeForm);
    }
  }

  // Practice Challenge: Start New Round
  function setupNewPracticeRound(allForms) {
    if (!allForms || allForms.length === 0) return;
    const target = allForms[Math.floor(Math.random() * allForms.length)];
    setChallengeTargetForm(target);

    // Shuffle 4 choices including the target
    const distractors = allForms.filter((f) => f.id !== target.id);
    const shuffledDistractors = [...distractors].sort(() => 0.5 - Math.random()).slice(0, 3);
    const choices = [...shuffledDistractors, target].sort(() => 0.5 - Math.random());
    setChallengeChoices(choices);
    setChallengeFeedback(null);

    // Auto-play the target sound for the child to hear
    setTimeout(() => {
      const fullUrl = resolveFileUrl(target.audio_url);
      audioRef.current.src = fullUrl;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }, 400);
  }

  // Switch to Practice Mode
  function startPracticeMode() {
    setActiveMode('practice');
    setChallengeScore(0);
    setChallengeRoundsCompleted(0);
    setChallengeCompleted(false);
    setupNewPracticeRound(currentForms);
  }

  // Handle choice in Practice Challenge
  async function handleChallengeAnswer(chosenForm) {
    if (!challengeTargetForm || challengeFeedback) return;

    if (chosenForm.id === challengeTargetForm.id) {
      // Correct!
      const newScore = challengeScore + 1;
      const newRounds = challengeRoundsCompleted + 1;
      setChallengeScore(newScore);
      setChallengeRoundsCompleted(newRounds);
      setChallengeFeedback({
        type: 'success',
        message: `ጎበዝ! Excellent! That is "${chosenForm.character}" (${chosenForm.character_name})! 🌟`,
      });

      // Play chosen sound
      const fullUrl = resolveFileUrl(chosenForm.audio_url);
      audioRef.current.src = fullUrl;
      audioRef.current.play().catch(() => {});

      if (newRounds >= Math.min(5, currentForms.length)) {
        // Complete challenge
        setTimeout(async () => {
          setChallengeCompleted(true);
          try {
            const completeRes = await axiosClient.post(
              `/student/lessons/${lessonId}/fidel-practice-complete`,
              {
                character_ids: currentForms.map((f) => f.id),
                score: Math.round((newScore / newRounds) * 100),
              }
            );
            if (completeRes.data.lesson_progress) {
              setLessonProgress(completeRes.data.lesson_progress);
            }
          } catch (err) {
            console.error('Failed to submit completion:', err);
          }
        }, 1200);
      } else {
        setTimeout(() => {
          setupNewPracticeRound(currentForms);
        }, 1500);
      }
    } else {
      // Try again
      setChallengeFeedback({
        type: 'try_again',
        message: 'ቅርብ ነበረ! Try listening again and pick the right one! 👂',
      });
      // Replay sound
      setTimeout(() => {
        const fullUrl = resolveFileUrl(challengeTargetForm.audio_url);
        audioRef.current.src = fullUrl;
        audioRef.current.play().catch(() => {});
      }, 700);
    }
  }

  // Count how many forms in current family have been listened to
  const listenedCountInFamily = currentForms.filter(
    (f) => progressMap[f.id] && progressMap[f.id].listen_count > 0
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50/50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-amber-900">ፊደል በማዘጋጀት ላይ...</h2>
        <p className="text-sm text-amber-700/70 mt-1">Loading Amharic Fidel lesson...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto">
            !
          </div>
          <h2 className="text-xl font-black text-slate-800">Cannot Open Lesson</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/child/courses')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <MdArrowBack />
              <span>Return to Courses</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/40 to-amber-100/30 flex flex-col justify-between selection:bg-amber-200">
      {/* ── Child Header ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-amber-200/60 sticky top-0 z-30 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link
            to={lessonData?.course_id ? `/child/courses/${lessonData.course_id}` : '/child/courses'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 font-bold text-xs md:text-sm transition-all transform active:scale-95"
          >
            <MdArrowBack className="text-lg" />
            <span>ትምህርቶች (Courses)</span>
          </Link>

          <div className="text-center flex-1 max-w-md truncate">
            <span className="text-[11px] font-black tracking-wider text-amber-700 uppercase block truncate">
              {lessonData?.course_title || 'Amharic Early Literacy'}
            </span>
            <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-800 truncate">
              {lessonData?.title || 'Fidel Learning'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
              <MdStar className="text-amber-500 text-sm" />
              <span>{lessonProgress.progress_percentage}% Done</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Learning Container ── */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 md:py-8 flex-1 flex flex-col justify-center">
        {/* Title & Mode Switcher */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex p-1.5 rounded-2xl bg-amber-200/70 shadow-inner">
            <button
              onClick={() => setActiveMode('explore')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeMode === 'explore'
                  ? 'bg-white text-amber-900 shadow-md transform scale-102'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <MdHeadphones className="text-base text-amber-600" />
              <span>አዳምጥ (Explore & Listen)</span>
            </button>
            <button
              onClick={startPracticeMode}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
                activeMode === 'practice'
                  ? 'bg-amber-600 text-white shadow-md transform scale-102'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <MdSportsEsports className="text-base" />
              <span>ልምምድ (Practice Game)</span>
            </button>
          </div>

          {currentFamily && (
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                የ<span className="text-amber-600 underline decoration-amber-400 decoration-wavy">{currentFamily.base_character}</span> ቤተሰብ (The {currentFamily.base_character} Family)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-semibold">
                {activeMode === 'explore'
                  ? 'ፊደሉን በመጫን ድምፁን አዳምጥ (Tap any card to hear its sound)'
                  : 'የሰማኸውን ድምፅ ትክክለኛ ፊደል ምረጥ (Listen carefully and pick the matching letter)'}
              </p>
            </div>
          )}

          {/* Family Carousel Navigation (if more than 1 family in lesson) */}
          {families.length > 1 && (
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                disabled={currentFamilyIndex === 0}
                onClick={() => {
                  setCurrentFamilyIndex((i) => i - 1);
                  setSelectedFormId(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 border border-amber-200 text-amber-900 text-xs font-bold shadow-sm hover:bg-white disabled:opacity-30 transition-all active:scale-95"
              >
                <MdArrowBack />
                <span>ቀዳሚ (Previous)</span>
              </button>
              <span className="text-xs font-black text-amber-900 bg-amber-100/70 px-3 py-1 rounded-full">
                {currentFamilyIndex + 1} / {families.length}
              </span>
              <button
                disabled={currentFamilyIndex === families.length - 1}
                onClick={() => {
                  setCurrentFamilyIndex((i) => i + 1);
                  setSelectedFormId(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/90 border border-amber-200 text-amber-900 text-xs font-bold shadow-sm hover:bg-white disabled:opacity-30 transition-all active:scale-95"
              >
                <span>ቀጣይ (Next)</span>
                <MdArrowForward />
              </button>
            </div>
          )}
        </div>

        {/* ── MODE 1: EXPLORE & LISTEN ── */}
        {activeMode === 'explore' && (
          <div className="space-y-6">
            {/* The 7 Forms Interactive Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 sm:gap-4 md:gap-5">
              {currentForms.map((form) => {
                const isSelected = selectedFormId === form.id;
                const isFormPlaying = isPlaying && isSelected;
                const listenData = progressMap[form.id];
                const hasListened = listenData && listenData.listen_count > 0;

                return (
                  <button
                    type="button"
                    key={form.id}
                    onClick={() => handleFormClick(form)}
                    className={`h-40 sm:h-44 md:h-52 rounded-3xl p-3 sm:p-4 flex flex-col items-center justify-between border-4 transition-all duration-200 transform active:scale-95 shadow-md hover:shadow-xl ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500 to-amber-600 border-amber-300 text-white scale-105 shadow-amber-500/40 ring-4 ring-amber-300/60'
                        : hasListened
                        ? 'bg-white hover:bg-amber-50 border-amber-200 text-slate-800'
                        : 'bg-white/90 hover:bg-amber-50/70 border-slate-200 text-slate-700'
                    }`}
                  >
                    {/* Top Order Badge */}
                    <div className="w-full flex items-center justify-between text-[11px] font-black">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {form.display_order}ኛ
                      </span>
                      {hasListened && (
                        <span
                          className={`text-xs ${
                            isSelected ? 'text-amber-200' : 'text-emerald-500'
                          }`}
                          title={`Listened ${listenData.listen_count} times`}
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Big Fidel Character */}
                    <div
                      className={`text-5xl sm:text-6xl md:text-7xl font-black transition-transform ${
                        isSelected ? 'scale-110 drop-shadow-md' : 'group-hover:scale-105'
                      }`}
                    >
                      {form.character}
                    </div>

                    {/* Bottom Order Name & Speaker Icon */}
                    <div className="w-full flex items-center justify-between pt-1">
                      <span
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-amber-100' : 'text-slate-500'
                        }`}
                      >
                        {form.character_name}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isFormPlaying
                            ? 'bg-white text-amber-600 animate-bounce'
                            : isSelected
                            ? 'bg-white/30 text-white'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isFormPlaying ? (
                          <MdMusicNote className="text-sm" />
                        ) : (
                          <MdVolumeUp className="text-sm" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Playback Controls & Feedback */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-amber-200/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleReplay}
                  disabled={isLoadingAudio}
                  className="w-14 h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-amber-600/30 text-2xl transition-all disabled:opacity-50"
                  title="Replay Pronunciation"
                >
                  {isLoadingAudio ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <MdPause />
                  ) : (
                    <MdVolumeUp />
                  )}
                </button>
                <div>
                  <span className="text-xs font-black text-amber-700 uppercase tracking-wider block">
                    ድምፅ አጫውት (Listen & Repeat)
                  </span>
                  <p className="text-sm font-bold text-slate-800">
                    {selectedFormId
                      ? `Now Playing: ${
                          currentForms.find((f) => f.id === selectedFormId)?.character
                        } (${
                          currentForms.find((f) => f.id === selectedFormId)?.character_name
                        })`
                      : 'Tap any fidel card above to listen'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 block">
                    Explored: {listenedCountInFamily} of {currentForms.length} forms
                  </span>
                  <div className="w-32 bg-slate-100 rounded-full h-2.5 overflow-hidden mt-1">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round((listenedCountInFamily / Math.max(1, currentForms.length)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={startPracticeMode}
                  className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                >
                  <MdSportsEsports className="text-lg" />
                  <span>Start Practice Game</span>
                </button>
              </div>
            </div>

            {playbackError && (
              <div className="p-3 rounded-2xl bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-semibold text-center">
                {playbackError}
              </div>
            )}
          </div>
        )}

        {/* ── MODE 2: PRACTICE GAME (LISTEN & IDENTIFY CHALLENGE) ── */}
        {activeMode === 'practice' && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            {!challengeCompleted ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border-4 border-amber-300 shadow-xl space-y-6 text-center">
                {/* Round Progress Header */}
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <span className="text-xs font-black text-amber-800 uppercase tracking-widest">
                    Round {challengeRoundsCompleted + 1} of {Math.min(5, currentForms.length)}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                    <MdStar className="text-lg" />
                    <span>Score: {challengeScore}</span>
                  </div>
                </div>

                {/* Big Speaker Replay Button */}
                <div className="py-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (challengeTargetForm) {
                        const fullUrl = resolveFileUrl(challengeTargetForm.audio_url);
                        audioRef.current.src = fullUrl;
                        audioRef.current.play().catch(() => {});
                        setIsPlaying(true);
                      }
                    }}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-4xl mx-auto shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all animate-pulse"
                    title="Hear sound again"
                  >
                    <MdVolumeUp />
                  </button>
                  <p className="text-sm font-extrabold text-slate-700">
                    ድምፁን አዳምጥ (Tap speaker to hear again)
                  </p>
                </div>

                {/* Feedback message */}
                {challengeFeedback && (
                  <div
                    className={`p-3 rounded-2xl text-sm font-bold animate-bounce ${
                      challengeFeedback.type === 'success'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {challengeFeedback.message}
                  </div>
                )}

                {/* 4 Choices Grid */}
                <div>
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-3">
                    ትክክለኛውን ፊደል ምረጥ (Select the correct letter):
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    {challengeChoices.map((choice) => (
                      <button
                        type="button"
                        key={choice.id}
                        onClick={() => handleChallengeAnswer(choice)}
                        className="h-28 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-slate-900 font-black text-4xl sm:text-5xl flex items-center justify-center shadow-md active:scale-95 transition-all hover:border-amber-500"
                      >
                        {choice.character}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Challenge Completion Celebration View */
              <div className="bg-white rounded-3xl p-8 border-4 border-emerald-400 shadow-2xl text-center space-y-6 animate-fadeIn">
                <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-5xl mx-auto shadow-inner animate-bounce">
                  <MdEmojiEvents />
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900">
                    እንኳን ደስ አለህ! Congratulations!
                  </h3>
                  <p className="text-sm text-slate-600 font-semibold max-w-md mx-auto">
                    You mastered the {currentFamily?.base_character} family practice activity! Your learning progress is saved in your learning passport.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 inline-block text-amber-900 font-black text-base">
                  ⭐ Score: {challengeScore} / {Math.min(5, currentForms.length)} Perfect!
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveMode('explore')}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
                  >
                    Back to Explore Forms
                  </button>
                  <button
                    onClick={() => {
                      if (currentFamilyIndex < families.length - 1) {
                        setCurrentFamilyIndex((i) => i + 1);
                        startPracticeMode();
                      } else {
                        navigate(
                          lessonData?.course_id
                            ? `/child/courses/${lessonData.course_id}`
                            : '/child/courses'
                        );
                      }
                    }}
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all active:scale-95"
                  >
                    {currentFamilyIndex < families.length - 1
                      ? 'Next Family Practice →'
                      : 'Finish Lesson & Return to Course'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-4 text-xs font-semibold text-amber-900/60 border-t border-amber-200/50 bg-white/40">
        Brana Youth Children Learning Hub • Amharic Fidel Literacy with Microsoft Neural Speech
      </footer>
    </div>
  );
}
