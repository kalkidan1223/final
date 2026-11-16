import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdVolumeUp, MdReplay, MdArrowBack, MdArrowForward,
  MdCheckCircle, MdStars, MdPlayArrow, MdPause, MdFullscreen
} from 'react-icons/md';
import { resolveFileUrl } from '../../utils/fileUrl';
import useVoiceGuide from '../../hooks/useVoiceGuide';
import axiosClient from '../../api/axiosClient';

export default function BasicChildLessonExperience({
  lesson,
  resources = [],
  progress,
  onResourceCompleted,
  onFinishLesson,
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [celebrating, setCelebrating] = useState(false);
  const [activityAnswer, setActivityAnswer] = useState(null);
  const [activityFeedback, setActivityFeedback] = useState(null); // { correct: boolean, message: string }
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const voice = useVoiceGuide({ lang: 'am' });

  // Initialize completed steps from resources
  useEffect(() => {
    const completed = new Set();
    resources.forEach((r, idx) => {
      if (r.status === 'completed' || r.progress_percentage >= 100) {
        completed.add(idx);
      }
    });
    setCompletedSteps(completed);

    // If starting on a specific step
    const firstIncomplete = resources.findIndex(
      (r) => r.status !== 'completed' && (r.progress_percentage || 0) < 100
    );
    if (firstIncomplete !== -1) {
      setCurrentIndex(firstIncomplete);
    }
  }, [resources]);

  const currentResource = resources[currentIndex] || null;
  const isLastStep = currentIndex === resources.length - 1;
  const currentStepCompleted = completedSteps.has(currentIndex);

  // Play audio or speak text
  const speakCurrent = (textToSpeak) => {
    if (textToSpeak) {
      voice.speak(textToSpeak, { lang: /[\u1200-\u137F]/.test(textToSpeak) ? 'am' : 'en' });
    }
  };

  const markStepDone = async (indexToMark = currentIndex) => {
    setCompletedSteps((prev) => new Set([...prev, indexToMark]));
    const res = resources[indexToMark];
    if (res && onResourceCompleted) {
      onResourceCompleted(res.id);
    }

    // Call backend progress if material or video
    if (res && res.resource_type === 'material') {
      try {
        await axiosClient.post(`/child/learning/progress/material/${res.resource_id}`, {
          view_percentage: 100,
        });
      } catch (err) {
        // silent
      }
    }
  };

  const handleNext = () => {
    // If not marked done yet, mark it done as child moves forward
    markStepDone(currentIndex);

    if (isLastStep) {
      setCelebrating(true);
      if (onFinishLesson) onFinishLesson();
    } else {
      setActivityAnswer(null);
      setActivityFeedback(null);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setActivityAnswer(null);
      setActivityFeedback(null);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Sound effects using Web Audio API
  const playSoundEffect = (type = 'success') => {
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(260, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch {
      // AudioContext unavailable
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-2 animate-fade-in font-sans">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-indigo-100 bg-white/95 p-4 shadow-md backdrop-blur-md">
        <Link
          to={`/child/courses/${lesson?.course_id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
        >
          <MdArrowBack className="text-xl" />
          <span>Back to Course</span>
        </Link>

        {/* Step Counter */}
        <div className="flex items-center gap-2">
          <span className="flex h-9 items-center gap-1.5 rounded-full bg-amber-100 px-4 text-xs font-black text-amber-900 shadow-sm">
            <MdStars className="text-amber-600 text-base animate-pulse" />
            <span>
              Step {currentIndex + 1} of {Math.max(1, resources.length)}
            </span>
          </span>
        </div>

        {/* Listen Button */}
        <button
          onClick={() => {
            const prompt =
              currentResource?.content?.activity_instructions ||
              currentResource?.content?.text_content ||
              currentResource?.description ||
              currentResource?.title;
            speakCurrent(prompt);
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-emerald-600 active:scale-95"
          title="Read step aloud"
        >
          <MdVolumeUp className="text-xl" />
          <span>Listen</span>
        </button>
      </header>

      {/* Progress Bar */}
      <div className="space-y-1 px-2">
        <div className="flex justify-between text-xs font-extrabold text-slate-500">
          <span>{lesson?.title}</span>
          <span>
            {Math.round(
              ((completedSteps.size + (currentStepCompleted ? 0 : 0.5)) /
                Math.max(1, resources.length)) *
                100
            )}
            % Completed
          </span>
        </div>
        <div className="h-3.5 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500 transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                Math.round(
                  ((completedSteps.size + (currentStepCompleted ? 1 : 0)) /
                    Math.max(1, resources.length)) *
                    100
                )
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Main Interactive Stage */}
      <main className="min-h-[460px] rounded-[2.5rem] border-4 border-indigo-200 bg-white p-6 shadow-2xl sm:p-10 flex flex-col justify-between relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" />

        {resources.length === 0 ? (
          <div className="my-auto text-center space-y-4 py-16">
            <span className="text-7xl block animate-bounce">🎨</span>
            <h2 className="text-2xl font-black text-slate-800">Learning Area Ready!</h2>
            <p className="text-slate-500 max-w-md mx-auto font-medium">
              Your instructor is preparing joyful learning cards and activities for this lesson. Check back very soon!
            </p>
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            {/* Step Header */}
            <div className="text-center space-y-1">
              <span className="inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-black uppercase tracking-wider text-indigo-700">
                {currentResource?.resource_type === 'material'
                  ? currentResource?.content?.material_type === 'audio'
                    ? 'Audio & Pronunciation'
                    : currentResource?.content?.metadata?.card_type
                    ? 'Learning Card'
                    : 'Read & Discover'
                  : currentResource?.resource_type === 'video'
                  ? 'Video Demonstration'
                  : currentResource?.resource_type === 'activity'
                  ? 'Interactive Practice'
                  : 'Quiz & Review'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {currentResource?.title}
              </h2>
              {currentResource?.description && (
                <p className="text-sm font-semibold text-slate-600 max-w-xl mx-auto">
                  {currentResource.description}
                </p>
              )}
            </div>

            {/* Content Renderer by Resource Type */}
            <div className="pt-2">
              {/* 1. LEARNING CARD (Character, Number, Vocabulary, or Picture Card) */}
              {currentResource?.content?.metadata?.card_type ||
              currentResource?.content?.metadata?.symbol ||
              currentResource?.content?.metadata?.number ||
              currentResource?.content?.metadata?.word ? (
                <LearningCardStage
                  card={currentResource.content.metadata}
                  content={currentResource.content}
                  speakCurrent={speakCurrent}
                  onDone={() => markStepDone(currentIndex)}
                />
              ) : currentResource?.resource_type === 'material' ? (
                <MaterialStage
                  resource={currentResource}
                  speakCurrent={speakCurrent}
                  onDone={() => markStepDone(currentIndex)}
                />
              ) : currentResource?.resource_type === 'video' ? (
                <VideoStage
                  resource={currentResource}
                  onDone={() => markStepDone(currentIndex)}
                />
              ) : currentResource?.resource_type === 'activity' ? (
                <ActivityStage
                  resource={currentResource}
                  activityAnswer={activityAnswer}
                  setActivityAnswer={setActivityAnswer}
                  activityFeedback={activityFeedback}
                  setActivityFeedback={setActivityFeedback}
                  playSoundEffect={playSoundEffect}
                  onDone={() => markStepDone(currentIndex)}
                />
              ) : currentResource?.resource_type === 'quiz' ? (
                <QuizStage
                  resource={currentResource}
                  playSoundEffect={playSoundEffect}
                  onDone={() => markStepDone(currentIndex)}
                />
              ) : (
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-8 text-center text-slate-600 font-medium">
                  {currentResource?.title}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <footer className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4 relative z-10">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <MdArrowBack className="text-lg" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStepCompleted && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <MdCheckCircle className="text-emerald-600 text-sm" /> Step Finished!
              </span>
            )}
          </div>

          <button
            onClick={handleNext}
            className={`inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-sm font-black text-white shadow-lg transition active:scale-95 ${
              isLastStep
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-200'
            }`}
          >
            <span>{isLastStep ? 'Finish Lesson 🎉' : 'Next Step'}</span>
            {!isLastStep && <MdArrowForward className="text-lg" />}
          </button>
        </footer>
      </main>

      {/* Completion Modal */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border-4 border-amber-300 bg-white p-8 text-center shadow-2xl space-y-6">
            <span className="text-7xl block animate-bounce">🏆</span>
            <div>
              <h3 className="text-3xl font-black text-slate-900">Amazing Job!</h3>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                You finished all learning steps in{' '}
                <span className="font-bold text-indigo-700">{lesson?.title}</span>!
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-around">
              <div>
                <span className="block text-2xl font-black text-amber-700">⭐ +50</span>
                <span className="text-xs font-bold text-amber-900">Learning XP</span>
              </div>
              <div className="h-8 w-px bg-amber-200" />
              <div>
                <span className="block text-2xl font-black text-emerald-700">✓ 100%</span>
                <span className="text-xs font-bold text-emerald-900">Mastery</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to={`/child/courses/${lesson?.course_id}`}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 text-center text-sm font-black text-white shadow-lg transition hover:bg-indigo-700"
              >
                Back to Course
              </Link>
              <button
                onClick={() => {
                  setCelebrating(false);
                  setCurrentIndex(0);
                }}
                className="w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Review Lesson Again 🔄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// LEARNING CARD STAGE (Fidel, Number, Vocabulary, or Picture card)
// ----------------------------------------------------------------------------
function LearningCardStage({ card, content, speakCurrent, onDone }) {
  const symbol = card?.symbol || card?.character || card?.number || card?.word || '';
  const sound = card?.sound || card?.romanized || card?.pronunciation || '';
  const english = card?.english || card?.meaning || '';
  const amharic = card?.amharic || '';
  const imageUrl = resolveFileUrl(card?.image_url || content?.thumbnail_url || content?.file_url);
  const audioUrl = resolveFileUrl(card?.audio_url || content?.file_url);

  const handleHear = () => {
    if (audioUrl && (audioUrl.endsWith('.mp3') || audioUrl.endsWith('.wav') || audioUrl.endsWith('.ogg'))) {
      const a = new Audio(audioUrl);
      a.play().catch(() => speakCurrent(symbol || sound));
    } else {
      speakCurrent(symbol || sound);
    }
    if (onDone) onDone();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4">
      {/* Visual Card */}
      <div className="group relative flex w-full max-w-sm flex-col items-center justify-center rounded-3xl border-4 border-indigo-200 bg-gradient-to-b from-indigo-50/50 via-white to-purple-50/40 p-8 text-center shadow-xl transition hover:border-indigo-300">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={symbol || 'Learning item'}
            className="mb-4 h-36 w-36 object-contain rounded-2xl shadow-sm"
          />
        )}

        {symbol && (
          <span className="text-7xl sm:text-8xl font-black text-indigo-900 tracking-wider drop-shadow-sm select-none">
            {symbol}
          </span>
        )}

        {sound && (
          <span className="mt-2 text-xl font-black text-indigo-600 uppercase tracking-widest">
            {sound}
          </span>
        )}

        {(english || amharic) && (
          <div className="mt-3 rounded-xl bg-white/80 px-4 py-1.5 border border-slate-200 text-sm font-bold text-slate-700">
            {amharic && <span className="mr-2 font-black text-slate-900">{amharic}</span>}
            {english && <span>{english}</span>}
          </div>
        )}

        {/* Large audio trigger */}
        <button
          onClick={handleHear}
          className="mt-6 flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-black text-white shadow-lg transition hover:bg-indigo-700 active:scale-95"
        >
          <MdVolumeUp className="text-2xl" />
          <span>Say It!</span>
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// MATERIAL STAGE (Text, PDF, Document, Audio)
// ----------------------------------------------------------------------------
function MaterialStage({ resource, speakCurrent, onDone }) {
  const content = resource.content || {};
  const matType = content.material_type || 'other';
  const fileUrl = resolveFileUrl(content.file_url);
  const textContent = content.text_content || resource.description;

  return (
    <div className="space-y-6">
      {/* Audio player */}
      {matType === 'audio' ? (
        <div className="mx-auto max-w-md rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center shadow-md space-y-4">
          <span className="text-6xl block animate-bounce">🎧</span>
          <p className="text-sm font-bold text-emerald-800">Tap below to listen and practice pronunciation!</p>
          {fileUrl ? (
            <audio
              controls
              src={fileUrl}
              className="w-full rounded-2xl shadow-sm"
              onEnded={onDone}
            />
          ) : (
            <button
              onClick={() => {
                speakCurrent(resource.title);
                if (onDone) onDone();
              }}
              className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-700 active:scale-95"
            >
              🔊 Play Voice Guide
            </button>
          )}
        </div>
      ) : matType === 'image' || fileUrl?.match(/\.(png|jpe?g|webp|gif|svg)$/i) ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <img
            src={fileUrl}
            alt={resource.title}
            className="max-h-80 w-auto rounded-3xl border-4 border-slate-100 object-contain shadow-lg"
          />
          {textContent && (
            <p className="max-w-xl text-center text-base font-bold text-slate-700">{textContent}</p>
          )}
        </div>
      ) : (
        /* Rich Text / Instruction / Explanation */
        <div className="mx-auto max-w-2xl rounded-3xl border-2 border-indigo-100 bg-indigo-50/40 p-6 sm:p-8 space-y-4">
          <div className="prose prose-indigo max-w-none text-base sm:text-lg font-medium leading-relaxed text-slate-800 whitespace-pre-line">
            {textContent || resource.description}
          </div>
          {fileUrl && (
            <div className="pt-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
              >
                Open Attached Document 📄
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// VIDEO STAGE (YouTube or Uploaded video)
// ----------------------------------------------------------------------------
function VideoStage({ resource, onDone }) {
  const content = resource.content || {};
  const videoUrl = content.video_url || '';
  const fileUrl = resolveFileUrl(videoUrl);

  const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  const ytId = ytMatch ? ytMatch[1] : null;

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border-4 border-slate-200 bg-black aspect-video shadow-2xl relative">
      {ytId ? (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?rel=0`}
          title={resource.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      ) : fileUrl ? (
        <video
          controls
          src={fileUrl}
          className="h-full w-full"
          onEnded={onDone}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white font-bold text-sm">
          Video source not configured
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// ACTIVITY STAGE (Interactive Exercise: Matching, MCQ, Counting, Drag&Drop)
// ----------------------------------------------------------------------------
function ActivityStage({
  resource,
  activityAnswer,
  setActivityAnswer,
  activityFeedback,
  setActivityFeedback,
  playSoundEffect,
  onDone,
}) {
  const content = resource.content || {};
  const config = content.activity_config || {};
  const activityType = content.activity_type || 'multiple_choice';
  const instructions = content.instructions || resource.description || 'Answer the exercise!';

  // Multiple Choice / True False
  if (activityType === 'multiple_choice' || activityType === 'true_false') {
    const question = config.question || config.prompt || resource.title;
    const options = config.options || ['Option A', 'Option B', 'Option C'];
    const correctAnswer = config.correctAnswer || config.correct_answer || options[0];

    const handleSelectOption = async (option) => {
      setActivityAnswer(option);
      const isCorrect = String(option).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();

      if (isCorrect) {
        playSoundEffect('success');
        setActivityFeedback({ correct: true, message: '🎉 Excellent! That is correct!' });
        if (onDone) onDone();

        // Submit to backend
        try {
          await axiosClient.post(`/child/activities/${resource.resource_id}/submit`, {
            submission_text: String(option),
            score: content.max_score || 100,
            auto_graded: true,
          });
        } catch {
          // silent
        }
      } else {
        playSoundEffect('error');
        setActivityFeedback({ correct: false, message: '🤔 Not quite. Try again!' });
      }
    };

    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-2xl bg-indigo-50/80 p-5 text-center font-bold text-indigo-950 text-lg border border-indigo-100">
          {question}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option, idx) => {
            const isSelected = activityAnswer === option;
            const isCorrect = activityFeedback?.correct && isSelected;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(option)}
                className={`rounded-2xl border-2 p-4 text-center font-black text-base transition active:scale-95 shadow-sm ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-100 text-emerald-950'
                    : isSelected && !activityFeedback?.correct
                    ? 'border-rose-400 bg-rose-50 text-rose-900'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {activityFeedback && (
          <div
            className={`rounded-2xl p-4 text-center font-black text-sm animate-fade-in ${
              activityFeedback.correct
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}
          >
            {activityFeedback.message}
          </div>
        )}
      </div>
    );
  }

  // Matching Activity (e.g. Word to Picture or Letter to Sound)
  if (activityType === 'matching' || activityType === 'drag_and_drop') {
    const pairs = config.pairs || [
      { left: 'ሀ', right: 'ሀብት' },
      { left: 'ለ', right: 'ሎሚ' },
      { left: 'ሐ', right: 'ሐምሌ' },
    ];

    return (
      <InteractiveMatchingPlayer
        pairs={pairs}
        activityId={resource.resource_id}
        maxScore={content.max_score || 100}
        playSoundEffect={playSoundEffect}
        onDone={onDone}
      />
    );
  }

  // Counting Activity
  if (activityType === 'counting') {
    const targetCount = Number(config.targetCount || config.count || 5);
    const itemEmoji = config.itemEmoji || '🍎';
    const options = [targetCount - 1, targetCount, targetCount + 2, targetCount + 1].sort(
      () => Math.random() - 0.5
    );

    return (
      <InteractiveCountingPlayer
        targetCount={targetCount}
        itemEmoji={itemEmoji}
        options={options}
        activityId={resource.resource_id}
        maxScore={content.max_score || 100}
        playSoundEffect={playSoundEffect}
        onDone={onDone}
      />
    );
  }

  // Generic Practice View
  return (
    <div className="mx-auto max-w-lg rounded-3xl border-2 border-indigo-100 bg-indigo-50/50 p-8 text-center space-y-4">
      <span className="text-5xl block animate-bounce">🎯</span>
      <h3 className="text-xl font-black text-slate-900">{resource.title}</h3>
      <p className="text-sm font-semibold text-slate-600 leading-relaxed">{instructions}</p>
      <button
        onClick={() => {
          playSoundEffect('success');
          if (onDone) onDone();
        }}
        className="rounded-2xl bg-indigo-600 px-6 py-3 font-black text-white shadow-md hover:bg-indigo-700 active:scale-95"
      >
        ✓ Complete Practice
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// INTERACTIVE MATCHING COMPONENT
// ----------------------------------------------------------------------------
function InteractiveMatchingPlayer({ pairs, activityId, maxScore, playSoundEffect, onDone }) {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [feedback, setFeedback] = useState(null);

  const leftItems = pairs.map((p, idx) => ({ id: idx, text: p.left || p.character || p.source }));
  const rightItems = pairs.map((p, idx) => ({ id: idx, text: p.right || p.target || p.word }));

  const handleSelectLeft = (id) => {
    if (matched.has(id)) return;
    setSelectedLeft(id);
  };

  const handleSelectRight = async (id) => {
    if (selectedLeft === null || matched.has(id)) return;
    if (selectedLeft === id) {
      playSoundEffect('success');
      const updated = new Set([...matched, id]);
      setMatched(updated);
      setSelectedLeft(null);

      if (updated.size === pairs.length) {
        setFeedback('🌟 You matched all items correctly! Fantastic job!');
        if (onDone) onDone();
        try {
          await axiosClient.post(`/child/activities/${activityId}/submit`, {
            submission_text: JSON.stringify({ completed: true }),
            score: maxScore,
            auto_graded: true,
          });
        } catch {
          // silent
        }
      }
    } else {
      playSoundEffect('error');
      setSelectedLeft(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <p className="text-center text-sm font-extrabold text-slate-500">
        Tap an item on the left, then tap its match on the right!
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-3">
          {leftItems.map((item) => {
            const isDone = matched.has(item.id);
            const isSelected = selectedLeft === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectLeft(item.id)}
                disabled={isDone}
                className={`w-full rounded-2xl border-2 p-4 text-center font-black text-xl transition active:scale-95 shadow-sm ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-60'
                    : isSelected
                    ? 'border-indigo-600 bg-indigo-100 text-indigo-900 ring-2 ring-indigo-300'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300'
                }`}
              >
                {item.text} {isDone && '✓'}
              </button>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {rightItems.map((item) => {
            const isDone = matched.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectRight(item.id)}
                disabled={isDone}
                className={`w-full rounded-2xl border-2 p-4 text-center font-black text-xl transition active:scale-95 shadow-sm ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-60'
                    : selectedLeft !== null
                    ? 'border-indigo-300 bg-white hover:bg-indigo-50 text-slate-800'
                    : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                {item.text} {isDone && '✓'}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-100 p-4 text-center font-black text-sm text-emerald-950 animate-fade-in">
          {feedback}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// INTERACTIVE COUNTING COMPONENT
// ----------------------------------------------------------------------------
function InteractiveCountingPlayer({ targetCount, itemEmoji, options, activityId, maxScore, playSoundEffect, onDone }) {
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const emojis = Array.from({ length: targetCount }, (_, i) => i);

  const handleSelect = async (num) => {
    setSelected(num);
    if (num === targetCount) {
      playSoundEffect('success');
      setFeedback('🎉 Correct! You counted them accurately!');
      if (onDone) onDone();
      try {
        await axiosClient.post(`/child/activities/${activityId}/submit`, {
          submission_text: String(num),
          score: maxScore,
          auto_graded: true,
        });
      } catch {
        // silent
      }
    } else {
      playSoundEffect('error');
      setFeedback('Count carefully and try again!');
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-3xl border-2 border-amber-200 bg-amber-50/50 p-6 shadow-inner">
        {emojis.map((idx) => (
          <span key={idx} className="text-5xl animate-bounce" style={{ animationDelay: `${idx * 80}ms` }}>
            {itemEmoji}
          </span>
        ))}
      </div>

      <p className="text-base font-black text-slate-800">How many do you see?</p>

      <div className="grid grid-cols-4 gap-3">
        {options.map((opt, idx) => {
          const isSelected = selected === opt;
          const isCorrect = isSelected && opt === targetCount;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`rounded-2xl border-2 py-4 text-center font-black text-2xl transition active:scale-95 shadow-sm ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                  : isSelected
                  ? 'border-rose-400 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-amber-300'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3.5 text-center font-black text-sm text-indigo-900">
          {feedback}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// QUIZ STAGE (Child-friendly quiz questions)
// ----------------------------------------------------------------------------
function QuizStage({ resource, playSoundEffect, onDone }) {
  const quiz = resource.content?.quiz || {};
  const questions = quiz.questions || [];
  const [qIndex, setQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQ = questions[qIndex];

  if (!currentQ || questions.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-8 text-center text-slate-600 font-bold">
        Practice quiz complete!
      </div>
    );
  }

  const options = Array.isArray(currentQ.options)
    ? currentQ.options
    : typeof currentQ.options === 'object'
    ? Object.values(currentQ.options)
    : ['True', 'False'];

  const handleAnswer = (option) => {
    setSelectedAnswer(option);
    playSoundEffect('success');

    setTimeout(() => {
      if (qIndex + 1 < questions.length) {
        setSelectedAnswer(null);
        setQIndex((prev) => prev + 1);
      } else {
        setFinished(true);
        if (onDone) onDone();
      }
    }, 600);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="text-xs font-black uppercase tracking-wider text-purple-600">
        Question {qIndex + 1} of {questions.length}
      </div>
      <h3 className="text-xl font-black text-slate-900">{currentQ.question_text}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAnswer(opt)}
            className={`rounded-2xl border-2 p-4 text-center font-black text-base transition active:scale-95 shadow-sm ${
              selectedAnswer === opt
                ? 'border-purple-600 bg-purple-100 text-purple-950'
                : 'border-slate-200 bg-white text-slate-800 hover:border-purple-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

