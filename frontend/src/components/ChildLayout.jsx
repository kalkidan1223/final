import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient, { setActiveChildId, getActiveChildId } from '../api/axiosClient';
import { useEffect, useState } from 'react';
import { pickVoice, readVoicePreference, writeVoicePreference } from '../hooks/useVoiceGuide';

const NAV_ITEMS = [
  { path: '/child', label: 'Home', icon: '🏠', sound: 'home' },
  { path: '/child/courses', label: 'My Courses', icon: '📚', sound: 'books' },
  { path: '/child/activities', label: 'Activities', icon: '🎯', sound: 'target' },
  { path: '/child/quizzes', label: 'Quizzes', icon: '📝', sound: 'writing' },
  { path: '/child/results', label: 'Results', icon: '🏆', sound: 'trophy' },
  { path: '/child/progress', label: 'My Progress', icon: '⭐', sound: 'star' },
  { path: '/child/achievements', label: 'Achievements', icon: '�', sound: 'medal' },
  { path: '/child/notifications', label: 'Notifications', icon: '🔔', sound: 'bell' },
  { path: '/child/profile', label: 'Profile', icon: '👤', sound: 'profile' },
];

/** Short Amharic confirmation, spoken with the same Amharic-first voice. */
function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'am';
  utterance.rate = 0.85;
  const voice = pickVoice(
    window.speechSynthesis.getVoices().filter((v) => (v.lang || '').toLowerCase().startsWith('am'))
  );
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

/** Play a fun click sound for interactive elements */
function playClickSound() {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not supported, silently fail
  }
}

/** Play a success sound */
function playSuccessSound() {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 523.25; // C5
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio not supported, silently fail
  }
}

export default function ChildLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [child, setChild] = useState(null);
  const [siblingChildren, setSiblingChildren] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(readVoicePreference);

  useEffect(() => {
    fetchChildInfo();
    fetchUnreadCount();
  }, [location.pathname]);

  const fetchChildInfo = async () => {
    try {
      const res = await axiosClient.get('/child/profile');
      if (res.data?.child) {
        setChild(res.data.child);
        if (res.data.available_children) {
          setSiblingChildren(res.data.available_children);
        }
        if (user?.role === 'parent' && res.data.child.id) {
          setActiveChildId(res.data.child.id);
        }
      }
    } catch (e) {
      console.warn('Child profile fetch warning:', e);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axiosClient.get('/child/notifications');
      const count = res.data?.notifications?.filter((n) => !n.is_read).length || 0;
      setUnreadCount(count);
    } catch (e) {
      setUnreadCount(0);
    }
  };

  const handleSwitchChild = (e) => {
    const newChildId = e.target.value;
    if (newChildId) {
      setActiveChildId(newChildId);
      window.location.reload();
    }
  };

  const isEarlyLearner = child?.is_early_learner !== undefined ? child.is_early_learner : (child?.age ? child.age <= 9 : true);
  const childName = child?.full_name || (user?.role === 'parent' ? 'Your Child' : 'Student');

  // Navigation items - horizontal top navigation like the reference
  const navItems = [
    { path: '/child', label: 'Home', icon: '🏠' },
    { path: '/child/courses', label: 'Courses', icon: '📚' },
    { path: '/child/activities', label: 'Activities', icon: '🎯' },
    { path: '/child/quizzes', label: 'Quizzes', icon: '📝' },
    { path: '/child/progress', label: 'Progress', icon: '📊' },
    { path: '/child/achievements', label: 'Achievements', icon: '🏆' },
    { path: '/child/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/child/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-50/60 via-pink-50/40 to-orange-50/30 text-slate-800">
      {/* Parent Mode Top Ribbon */}
      {user?.role === 'parent' && (
        <aside aria-label="Parent assistance controls" className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white px-4 py-2 text-sm shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-lg">👨‍👩‍👧</span>
            <span>የወላጅ ሁነታ (Parent Guided Mode): ከ<strong>{childName}</strong> ጋር አብረው እየተማሩ ነው! (ዕድሜ {child?.age || '5–9'})</span>
          </div>

          <div className="flex items-center gap-3">
            {siblingChildren.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg">
                <span className="text-xs">ልጅ ቀይር:</span>
                <select
                  value={child?.id || getActiveChildId() || ''}
                  onChange={handleSwitchChild}
                  className="bg-white text-slate-800 text-xs font-semibold rounded px-2 py-1 outline-none cursor-pointer"
                >
                  {siblingChildren.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.age ? `ዕድሜ ${c.age}` : '5–9'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => navigate('/parent/dashboard')}
              className="bg-white text-purple-900 hover:bg-purple-50 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm"
            >
              ወደ ወላጅ ገጽ ተመለስ ↩
            </button>
          </div>
        </aside>
      )}

      {/* Top Navigation Bar - Child-friendly, no scrolling */}
      <nav aria-label="Child portal navigation" className="bg-white/95 backdrop-blur-md border-b-4 border-purple-200 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Logo and User Actions Row */}
          <div className="flex items-center justify-between mb-3">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/child')}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-2xl shadow-xl animate-bounce">
                📜
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-black uppercase tracking-wider text-purple-700 block">
                  Brana Kids Hub
                </span>
                <h1 className="text-lg font-black text-purple-900">Student Portal</h1>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              {/* Sound toggle */}
              <button
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  writeVoicePreference(next);
                  if (next) {
                    playClickSound();
                    speak('ድምፅ ተከፍቷል።');
                  }
                }}
                aria-pressed={soundEnabled}
                title={soundEnabled ? 'Sound On' : 'Sound Off'}
                className={`p-2 rounded-xl text-lg transition border-2 cursor-pointer hover:scale-110 active:scale-95 ${
                  soundEnabled ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-md' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to log out?')) {
                    logout();
                  }
                }}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-bold hover:shadow-md transition active:scale-95 hidden sm:block cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Navigation Links - Full width, no scrolling */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap" role="tablist">
            {navItems.map((item) => {
              const isExact = location.pathname === item.path;
              const isChild = item.path !== '/child' && location.pathname.startsWith(item.path);
              const active = isExact || isChild;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => soundEnabled && playClickSound()}
                  className={`
                    relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2
                    ${active
                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-lg scale-105 border-purple-400'
                      : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:scale-105 border-transparent hover:border-purple-200'
                    }
                  `}
                  role="tab"
                  aria-selected={active}
                >
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.path === '/child/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Child View Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full" role="main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-purple-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg animate-bounce">🎈</span>
            <span className="font-semibold text-purple-700">Brana Kids Hub</span>
            <span>— Learn, Play, Grow!</span>
          </div>
        </div>
      </footer>
    </div>
  );
}