import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/child/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Oops! We could not load your learning space. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl animate-bounce">🎨</div>
        <div className="text-xl font-extrabold text-purple-700 animate-pulse">
          Opening your fun learning world... ✨
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center max-w-lg mx-auto my-12 shadow-sm">
        <span className="text-4xl block mb-2">🎈</span>
        <h3 className="text-lg font-black text-rose-800 mb-2">Oops! Something went wrong</h3>
        <p className="text-sm text-rose-600 mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-md hover:scale-105 transition active:scale-95"
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  const child = data?.child || {};
  const stats = data?.stats || {};
  const continueLearning = data?.continue_learning;
  const courses = data?.courses || [];
  const todaysActivities = data?.todays_activities || [];
  const streakDays = data?.learning_streak || 0;
  const achievements = data?.achievements || [];

  // Age group check: 5-9 = Early Learner, 10-12 = Independent Student
  const isEarlyLearner = child.is_early_learner !== undefined ? child.is_early_learner : (child.age ? child.age <= 9 : true);
  const totalStars = (stats.completed_activities || 0) * 10 + (stats.completed_quizzes || 0) * 20 + ((stats.watched_videos || 0) * 5) + 15;

  // =========================================================================
  // VIEW A: EARLY LEARNER DASHBOARD (AGES 5 - 9)
  // Simplified, teacher-guided, voice-assisted, playful touch-friendly design
  // for Ethiopian young children
  // =========================================================================
  if (isEarlyLearner) {
    const recommendedLesson = continueLearning || (courses.length > 0 && courses[0]?.lessons?.[0] ? courses[0].lessons[0] : null);
    const recommendedCourse = courses.length > 0 ? courses[0] : null;

    return (
      <div className="space-y-8 pb-16 animate-fade-in">
        {/* Parent Proxy Guided Mode Pill */}
        {child.is_parent_managed && (
          <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">👨‍👩‍👧</span>
              <span>የወላጅ መመሪያ ሁነታ (Parent Guided Mode): ከልጅዎ ጋር አብረው እየተማሩ ነው! (ዕድሜ 5–9)</span>
            </div>
            <span className="bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full text-xs font-black">
              ኮከብ ተማሪ
            </span>
          </div>
        )}

        {/* 1. Playful Hero Greeting with Voice Assistant (Ethiopian Context) */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 rounded-3xl p-6 sm:p-10 text-white shadow-2xl">
          {/* Fun floating emoji graphics */}
          <div className="absolute top-2 right-4 text-7xl opacity-25 pointer-events-none select-none animate-pulse">⭐</div>
          <div className="absolute -bottom-4 right-32 text-8xl opacity-20 pointer-events-none select-none">🦁</div>
          <div className="absolute top-1/2 left-2/3 text-7xl opacity-15 pointer-events-none select-none">📜</div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider text-yellow-200">
                <span>🇪🇹</span> የኢትዮጵያ ህፃናት መማሪያ • Brana Kids (ዕድሜ {child.age || '5–9'})
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                ሰላም, {child.full_name || 'ትንሹ ኮከብ'}! 👋
              </h1>
              <p className="text-base sm:text-lg text-amber-100 font-bold max-w-xl">
                እንኳን ወደ ብራና የህፃናት መማሪያ በደህና መጣህ/ሽ! ዛሬ የአማርኛ ፊደላትና የግዕዝ ቁጥሮችን አብረን እንማር!
              </p>

              {/* Text to Speech Read Aloud Button */}
              <button
                onClick={() => speakText(`Selam ${child.full_name || 'Little Star'}! Welcome to Brana Ethiopian Children Learning Hub! Let us learn Fidels, numbers, and enjoy fun games today!`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-800 hover:bg-amber-50 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs sm:text-sm"
              >
                <span>{isSpeaking ? '🔊 እያነበበ ነው...' : '🔊 ድምፅ አሰማ (Read To Me)'}</span>
              </button>
            </div>

            {/* Visual Star Jar & Streak Counter */}
            <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto">
              <div className="flex-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-lg min-w-[200px]">
                <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                  ⭐
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-200">የኔ ኮከቦች (Stars)</div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{totalStars}</div>
                  <div className="text-[11px] text-amber-100 font-semibold">የተሰበሰቡ ኮከቦች!</div>
                </div>
              </div>

              <div className="flex-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-lg min-w-[200px]">
                <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl shadow-inner">
                  🔥
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-200">የትምህርት ጥረት (Streak)</div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{streakDays} ቀናት</div>
                  <div className="text-[11px] text-amber-100 font-semibold">የየዕለት ጥናት!</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MAIN CENTERPIECE: INSTRUCTOR'S PRESCRIBED LESSON OF THE DAY */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🌟</span>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800">የዛሬው ልዩ ትምህርት (Today's Guided Lesson)</h2>
                <p className="text-xs sm:text-sm font-bold text-slate-500">በመምህርህ የተመረጠ የዛሬ ትምህርት</p>
              </div>
            </div>
          </div>

          {continueLearning ? (
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-white">
              <div className="space-y-3 z-10 max-w-xl text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider text-yellow-100">
                  <span>👨‍🏫</span> በመምህርህ የተመረጠ (Teacher's Pick)
                </div>
                <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-snug">
                  {continueLearning.title}
                </h3>
                <p className="text-base sm:text-lg font-bold text-amber-100">
                  ትምህርት (Course): {continueLearning.course_title}
                </p>

                <div className="flex items-center gap-3 justify-center md:justify-start pt-1">
                  <button
                    onClick={() => speakText(`Today's lesson is ${continueLearning.title}. Let's learn together!`)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <span>🔊 አድምጥ (Listen)</span>
                  </button>
                  <span className="text-xs font-black bg-white/20 px-3 py-1.5 rounded-xl">
                    የተጠናቀቀው: {continueLearning.lesson_progress || 0}%
                  </span>
                </div>
              </div>

              {/* Giant Play Button */}
              <Link
                to={`/child/lessons/${continueLearning.id}`}
                className="z-10 px-8 py-5 bg-white text-orange-600 hover:bg-amber-50 font-black rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl sm:text-2xl flex items-center gap-3 border-4 border-amber-200 animate-pulse flex-shrink-0"
              >
                <span>▶ ትምህርቱን ጀምር (START)</span>
                <span className="text-2xl">🚀</span>
              </Link>
            </div>
          ) : recommendedCourse ? (
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-white">
              <div className="space-y-3 z-10 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider text-yellow-200">
                  <span>✨</span> በመምህር የተዘጋጀ (Assigned Course)
                </div>
                <h3 className="text-2xl sm:text-4xl font-black">
                  {recommendedCourse.title}
                </h3>
                <p className="text-base sm:text-lg font-bold text-emerald-100">
                  መምህር: {recommendedCourse.instructor_name || 'የክፍሉ መምህር'}
                </p>
              </div>

              <Link
                to={`/child/courses/${recommendedCourse.id}`}
                className="z-10 px-8 py-5 bg-white text-emerald-700 hover:bg-emerald-50 font-black rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl sm:text-2xl flex items-center gap-3 border-4 border-emerald-200 flex-shrink-0"
              >
                <span>▶ ጀምር (EXPLORE)</span>
                <span className="text-2xl">🎨</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border-2 border-purple-100 shadow-sm space-y-3">
              <span className="text-6xl block animate-bounce">🎈</span>
              <h3 className="text-xl font-black text-slate-800">መምህርህ አስደሳች ትምህርቶችን በማዘጋጀት ላይ ነው!</h3>
              <p className="text-sm font-bold text-slate-500">
                እባክህ ትንሽ ቆይተህ ተመልከት። አዳዲስ የአማርኛና የሂሳብ ትምህርቶች እዚህ ይደርሱሃል!
              </p>
            </div>
          )}
        </section>

        {/* 3. PLAYFUL ACTIVITIES SECTION (Oversized Ethiopian Game Tiles) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🎮</span>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800">የልጆች አስደሳች ጨዋታዎች (Fun Learning Games)</h2>
                <p className="text-xs font-bold text-slate-500">ፊደላትንና ቁጥሮችን በጨዋታ እንማር</p>
              </div>
            </div>
            <Link
              to="/child/activities"
              className="text-sm font-black text-emerald-700 hover:underline"
            >
              ሁሉንም እይ (See All) ➔
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Writing & Drawing Fun (Fidel Tracing) */}
            <Link
              to="/child/activities"
              className="bg-gradient-to-b from-emerald-50 to-teal-100 border-2 border-emerald-200 rounded-3xl p-6 text-center shadow-sm hover:shadow-xl hover:scale-105 transition transform flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-4xl shadow-md group-hover:rotate-6 transition font-black">
                ሀ
              </div>
              <h3 className="text-lg font-black text-emerald-950">የፊደል መጻፊያ (Writing)</h3>
              <p className="text-xs font-bold text-emerald-700">የአማርኛ ፊደላትን (ሀ፣ ለ፣ ሐ...) በስክሪኑ ላይ ጻፍ!</p>
              <span className="mt-2 px-4 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-xl shadow">
                ጻፍ ✏️
              </span>
            </Link>

            {/* Matching Game (Geez Numbers & Pictures) */}
            <Link
              to="/child/activities"
              className="bg-gradient-to-b from-amber-50 to-orange-100 border-2 border-amber-200 rounded-3xl p-6 text-center shadow-sm hover:shadow-xl hover:scale-105 transition transform flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-4xl shadow-md group-hover:-rotate-6 transition font-black">
                ፩
              </div>
              <h3 className="text-lg font-black text-amber-950">ስዕልና ቁጥር ማዛመድ</h3>
              <p className="text-xs font-bold text-amber-700">የግዕዝ ቁጥሮችን (፩ ፪ ፫) እና ፊደላትን አዛምድ!</p>
              <span className="mt-2 px-4 py-1.5 bg-amber-600 text-white text-xs font-black rounded-xl shadow">
                አዛምድ 🧩
              </span>
            </Link>

            {/* Listen & Learn (Ethiopian Folk Tales) */}
            <Link
              to="/child/activities"
              className="bg-gradient-to-b from-indigo-50 to-purple-100 border-2 border-indigo-200 rounded-3xl p-6 text-center shadow-sm hover:shadow-xl hover:scale-105 transition transform flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-4xl shadow-md group-hover:rotate-6 transition">
                🎧
              </div>
              <h3 className="text-lg font-black text-indigo-950">ተረት ማዳመጥ (Stories)</h3>
              <p className="text-xs font-bold text-indigo-700">የብልጡ ጥንቸልና የአንበሳውን አጭር ተረት አዳምጥ!</p>
              <span className="mt-2 px-4 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow">
                አዳምጥ 🎵
              </span>
            </Link>

            {/* Quiz Star Time */}
            <Link
              to="/child/quizzes"
              className="bg-gradient-to-b from-rose-50 to-pink-100 border-2 border-rose-200 rounded-3xl p-6 text-center shadow-sm hover:shadow-xl hover:scale-105 transition transform flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-4xl shadow-md group-hover:scale-110 transition">
                ✨
              </div>
              <h3 className="text-lg font-black text-rose-950">የኮከብ ፈተና (Quiz)</h3>
              <p className="text-xs font-bold text-rose-700">ቀላል ጥያቄዎችን በመመለስ የኮከብ ሽልማት አግኝ!</p>
              <span className="mt-2 px-4 py-1.5 bg-rose-600 text-white text-xs font-black rounded-xl shadow">
                ፈትን ⭐
              </span>
            </Link>
          </div>
        </section>

        {/* 4. ETHIOPIAN BADGES & REWARDS */}
        <section className="bg-gradient-to-r from-amber-100 via-emerald-50 to-teal-50 rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏆</span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-950">የኔ የክብር ባጆች (Star Badges)</h2>
            </div>
            <Link
              to="/child/achievements"
              className="text-xs sm:text-sm font-black text-amber-800 hover:underline"
            >
              ሁሉንም ባጆች እይ ➔
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-4 text-center shadow-sm border border-amber-200 flex flex-col items-center gap-2">
              <div className="text-5xl animate-bounce">🦁</div>
              <div className="text-sm font-black text-slate-800">የአንበሳ ጀግና</div>
              <div className="text-xs font-bold text-amber-600">ፊደላትን አወቀ</div>
            </div>
            <div className="bg-white rounded-3xl p-4 text-center shadow-sm border border-amber-200 flex flex-col items-center gap-2">
              <div className="text-5xl">📜</div>
              <div className="text-sm font-black text-slate-800">የብራና አዋቂ</div>
              <div className="text-xs font-bold text-emerald-600">ተረቶችን ያዳመጠ</div>
            </div>
            <div className="bg-white rounded-3xl p-4 text-center shadow-sm border border-amber-200 flex flex-col items-center gap-2">
              <div className="text-5xl">🎨</div>
              <div className="text-sm font-black text-slate-800">የቀለም ባለሙያ</div>
              <div className="text-xs font-bold text-pink-600">ፊደል የጻፈ</div>
            </div>
            <div className="bg-white rounded-3xl p-4 text-center shadow-sm border border-amber-200 flex flex-col items-center gap-2">
              <div className="text-5xl">⭐</div>
              <div className="text-sm font-black text-slate-800">የኮከብ ተማሪ</div>
              <div className="text-xs font-bold text-indigo-600">{streakDays} ቀናት ጥረት</div>
            </div>
          </div>
        </section>
      </div>
    );
  }



  // =========================================================================
  // VIEW B: INDEPENDENT STUDENT DASHBOARD (AGES 10 - 12)
  // Full student dashboard with course cards, progress bars, and metrics
  // =========================================================================
  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        {/* Floating background decorative bubbles */}
        <div className="absolute top-2 right-4 text-7xl opacity-20 pointer-events-none select-none">⭐</div>
        <div className="absolute -bottom-4 right-28 text-8xl opacity-15 pointer-events-none select-none">🚀</div>
        <div className="absolute top-1/2 left-2/3 text-6xl opacity-15 pointer-events-none select-none">🌈</div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span>🎓</span> Independent Student (Age {child.age || '10–12'})
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Hello, {child.full_name || 'Student'}! 👋
            </h1>
            <p className="text-base sm:text-lg text-purple-100 font-medium max-w-xl">
              Track your courses, complete assignments, and master your subjects at your own pace!
            </p>
          </div>

          {/* Learning Streak Widget */}
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-lg min-w-[220px]">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-3xl shadow-inner animate-pulse">
              🔥
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-200">Learning Streak</div>
              <div className="text-2xl sm:text-3xl font-black text-white">{streakDays} Days</div>
              <div className="text-xs text-purple-100 font-medium">Keep learning daily!</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Continue Learning Hero Card (If exists) */}
      {continueLearning && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5 z-10">
            <div className="inline-flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              <span>▶</span> Continue Learning
            </div>
            <h2 className="text-xl sm:text-2xl font-black">{continueLearning.course_title}</h2>
            <p className="text-sm font-semibold text-orange-100">
              Lesson {continueLearning.order_index}: {continueLearning.title}
            </p>
            <div className="w-48 sm:w-64 bg-black/20 h-3 rounded-full overflow-hidden mt-2">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(continueLearning.lesson_progress || 10, 15)}%` }}
              />
            </div>
          </div>

          <Link
            to={`/child/lessons/${continueLearning.id}`}
            className="z-10 px-6 py-3 bg-white text-orange-600 font-black rounded-2xl shadow-md hover:bg-orange-50 hover:scale-105 active:scale-95 transition flex items-center gap-2 text-sm sm:text-base flex-shrink-0"
          >
            <span>Continue Lesson</span>
            <span className="text-lg">➔</span>
          </Link>
        </div>
      )}

      {/* 3. Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-purple-100 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
            📚
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.total_courses || 0}</div>
            <div className="text-xs font-bold text-slate-500">My Courses</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-purple-100 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
            🎯
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.completed_activities || 0}</div>
            <div className="text-xs font-bold text-slate-500">Activities Done</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-purple-100 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl">
            📝
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.completed_quizzes || 0}</div>
            <div className="text-xs font-bold text-slate-500">Quizzes Taken</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-purple-100 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl">
            🎬
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.watched_videos || 0}</div>
            <div className="text-xs font-bold text-slate-500">Videos Watched</div>
          </div>
        </div>
      </div>

      {/* 4. Main Section: My Courses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">My Courses</h2>
          </div>
          <Link
            to="/child/courses"
            className="text-xs sm:text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:underline"
          >
            See All Courses ➔
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-purple-100 shadow-sm">
            <span className="text-5xl block mb-2">📚</span>
            <h3 className="text-lg font-black text-slate-800 mb-1">No courses assigned yet</h3>
            <p className="text-sm text-slate-500">Your teachers will assign your courses soon. Check back shortly!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-purple-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group transform hover:-translate-y-1"
              >
                {/* Course Header Banner */}
                <div className="h-36 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 relative flex items-center justify-center p-4 text-white overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-6xl group-hover:scale-110 transition-transform">📚</span>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-purple-700 font-extrabold text-xs px-2.5 py-1 rounded-full shadow-sm">
                    {course.age_group_name || 'Age Appropriate'}
                  </div>
                </div>

                {/* Course Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 group-hover:text-purple-600 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Instructor: <strong className="text-slate-700">{course.instructor_name || 'Teacher'}</strong>
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-2">
                      {course.description || 'Interactive learning journey with lessons, videos, and fun activities!'}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-purple-50">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Progress</span>
                      <span className="text-purple-600 font-black">{course.overall_progress || 0}%</span>
                    </div>
                    <div className="h-2.5 bg-purple-100 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${course.overall_progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    to={`/child/courses/${course.id}`}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-center text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>Continue Learning</span>
                    <span>➔</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Today's Learning & Activities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">Today's Activities</h2>
          </div>
          <Link
            to="/child/activities"
            className="text-xs sm:text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 hover:underline"
          >
            View All Activities ➔
          </Link>
        </div>

        {todaysActivities.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center border border-purple-100 shadow-sm flex items-center justify-center gap-3">
            <span className="text-3xl">🎉</span>
            <p className="text-sm font-bold text-slate-700">
              Awesome work! You have finished your scheduled activities for now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysActivities.map((act) => (
              <div
                key={act.id}
                className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {act.activity_type === 'writing' ? '✏️' :
                     act.activity_type === 'matching' ? '🔗' :
                     act.activity_type === 'reading' ? '📖' :
                     act.activity_type === 'listening' ? '🎧' : '📝'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-800 truncate">{act.title}</h4>
                    <p className="text-xs text-purple-600 font-semibold truncate">{act.course_title}</p>
                  </div>
                </div>

                <Link
                  to={`/child/activities/${act.id}/${act.activity_type === 'writing' ? 'write' : act.activity_type === 'matching' ? 'match' : act.activity_type === 'reading' ? 'read' : act.activity_type === 'listening' ? 'listen' : 'worksheet'}`}
                  className="px-3.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-xl text-xs transition flex-shrink-0"
                >
                  Start ➔
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Achievements Badge Showcase */}
      {achievements.length > 0 && (
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <h2 className="text-xl font-black text-amber-900">Your Badges & Achievements</h2>
            </div>
            <Link
              to="/child/achievements"
              className="text-xs sm:text-sm font-bold text-amber-800 hover:underline"
            >
              See All Badges ➔
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-white rounded-2xl p-4 text-center shadow-sm border border-amber-100 flex flex-col items-center gap-1.5 transform hover:scale-105 transition"
              >
                <div className="text-4xl animate-bounce">{ach.icon}</div>
                <div className="text-xs font-black text-slate-800 mt-1">{ach.name}</div>
                <div className="text-[11px] text-slate-500 line-clamp-2">{ach.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}