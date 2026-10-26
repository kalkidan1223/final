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
  { path: '/child/questions', label: 'My Questions', icon: '🙋', sound: 'question' },
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

  useEffect(() => {
    const handleNotifUpdate = (e) => {
      if (typeof e.detail?.unreadCount === 'number') {
        setUnreadCount(e.detail.unreadCount);
      } else {
        fetchUnreadCount();
      }
    };
    window.addEventListener('childNotificationsUpdated', handleNotifUpdate);
    window.addEventListener('notificationsUpdated', handleNotifUpdate);
    return () => {
      window.removeEventListener('childNotificationsUpdated', handleNotifUpdate);
      window.removeEventListener('notificationsUpdated', handleNotifUpdate);
    };
  }, []);

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

  const childName = child?.full_name || (user?.role === 'parent' ? 'Your Child' : 'Student');

  // Keep the main navigation focused; secondary destinations live under More.
  const navItems = [
    { path: '/child', label: 'Home', icon: '🏠' },
    { path: '/child/courses', label: 'Courses', icon: '📚' },
    { path: '/child/activities', label: 'Activities', icon: '🎯' },
    { path: '/child/progress', label: 'Progress', icon: '📊' },
  ];
  const moreItems = [
    { path: '/child/quizzes', label: 'Quizzes', icon: '📝' },
    { path: '/child/results', label: 'Results', icon: '🏆' },
    { path: '/child/achievements', label: 'Achievements', icon: '🏆' },
    { path: '/child/questions', label: 'My Questions', icon: '🙋' },
    { path: '/child/notifications', label: 'Notifications', icon: '🔔' },
    { path: '/child/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Parent Mode Top Ribbon */}
      {user?.role === 'parent' && (
        <aside aria-label="Parent assistance controls" className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white px-4 py-2 text-sm shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-lg">👨‍👩‍👧</span>
            <span>Parent guided mode: learning with <strong>{childName}</strong>{child?.grade_level_name ? ` • ${child.grade_level_name}` : ''}</span>
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
                      {c.full_name}{c.grade_level_name ? ` (${c.grade_level_name})` : ''}
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
      <nav aria-label="Child portal navigation" className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Logo and User Actions Row */}
          <div className="flex items-center justify-between mb-3">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/child')}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-2xl text-white shadow-sm">
                📜
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 block">
                  Brana Kids Hub
                </span>
                <h1 className="text-lg font-black text-slate-900">Learning space</h1>
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
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
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
                      ? 'bg-emerald-700 text-white shadow-sm border-emerald-700'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 border-transparent hover:border-emerald-200'
                    }
                  `}
                  aria-current={active ? 'page' : undefined}
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
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-purple-50 hover:text-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700">
                <span aria-hidden="true">•••</span><span>More</span>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 grid min-w-52 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {moreItems.map((item) => {
                  const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  return (
                    <NavLink key={item.path} to={item.path} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-50'}`} aria-current={active ? 'page' : undefined}>
                      <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                      {item.path === '/child/notifications' && unreadCount > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </details>
          </div>
        </div>
      </nav>

      {/* Main Child View Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full" role="main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg animate-bounce">🎈</span>
            <span className="font-semibold text-emerald-800">Brana Kids Hub</span>
            <span>— Learn, Play, Grow!</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
