import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient, { setActiveChildId, getActiveChildId } from '../api/axiosClient';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { path: '/child', label: 'Home', icon: '🏠' },
  { path: '/child/courses', label: 'My Courses', icon: '📚' },
  { path: '/child/activities', label: 'Activities', icon: '🎯' },
  { path: '/child/quizzes', label: 'Quizzes', icon: '📝' },
  { path: '/child/progress', label: 'My Progress', icon: '⭐' },
  { path: '/child/achievements', label: 'Achievements', icon: '🏆' },
  { path: '/child/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/child/profile', label: 'Profile', icon: '👤' },
];

export default function ChildLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [child, setChild] = useState(null);
  const [siblingChildren, setSiblingChildren] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const childName = child?.full_name || (user?.role === 'student' ? user.full_name : 'Young Learner');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 via-purple-50/40 to-pink-50/30 text-slate-800">
      {/* Parent Mode Top Ribbon */}
      {user?.role === 'parent' && (
        <aside aria-label="Parent assistance controls" className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 py-2 text-sm shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-lg">👨‍👩‍👧</span>
            <span>Parent Mode: Learning with <strong>{childName}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            {siblingChildren.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg">
                <span className="text-xs">Switch Child:</span>
                <select
                  value={child?.id || getActiveChildId() || ''}
                  onChange={handleSwitchChild}
                  className="bg-white text-slate-800 text-xs font-semibold rounded px-2 py-1 outline-none cursor-pointer"
                >
                  {siblingChildren.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => navigate('/parent/dashboard')}
              className="bg-white text-amber-800 hover:bg-amber-50 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Back to Parent Portal ↩
            </button>
          </div>
        </aside>
      )}

      {/* Main Child Header */}
      <header className={`bg-white/95 backdrop-blur-md shadow-sm border-b border-purple-100 ${user?.role === 'parent' ? '' : 'sticky top-0'} z-40 transition-all`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/child')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-300 via-pink-400 to-purple-500 flex items-center justify-center text-2xl shadow-md transform hover:rotate-6 transition-transform">
              🚀
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-purple-600 block">
                Children Learning Hub
              </span>
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                Child Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Friendly Greeting Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full shadow-inner">
              <span className="text-lg">👋</span>
              <span className="text-sm font-bold text-purple-800">
                Hi, {childName}!
              </span>
              {child?.age_group_name && (
                <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {child.age_group_name}
                </span>
              )}
            </div>

            {/* Sound toggle button */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Sounds On' : 'Sounds Muted'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-lg transition"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl text-xs font-bold hover:shadow-md transition active:scale-95"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar - Icon + Text specifically for young learners */}
      <nav aria-label="Child portal navigation" className="bg-white/90 backdrop-blur-md border-b border-purple-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 py-2 overflow-x-auto no-scrollbar" role="tablist">
            {NAV_ITEMS.map((item) => {
              const isExact = location.pathname === item.path;
              const isChild = item.path !== '/child' && location.pathname.startsWith(item.path);
              const active = isExact || isChild;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`
                    relative flex items-center sm:flex-col gap-1.5 sm:gap-0.5 px-3 py-2 sm:py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex-shrink-0
                    ${active
                      ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 scale-105'
                      : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                    }
                  `}
                  role="tab"
                  aria-selected={active}
                >
                  <span className="text-xl sm:text-2xl" aria-hidden="true">{item.icon}</span>
                  <span className="tracking-wide">{item.label}</span>
                  {item.path === '/child/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
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

      {/* Playful Footer */}
      <footer className="bg-white/80 border-t border-purple-100 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">🎈</span>
            <span className="font-semibold text-purple-700">Brana Uz Children Learning Hub</span>
            <span>— Learn, Play, Grow!</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-purple-600">
            <NavLink to="/child/courses" className="hover:underline">My Courses</NavLink>
            <span>•</span>
            <NavLink to="/child/activities" className="hover:underline">Activities</NavLink>
            <span>•</span>
            <NavLink to="/child/quizzes" className="hover:underline">Quizzes</NavLink>
            <span>•</span>
            <NavLink to="/child/progress" className="hover:underline">My Progress</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}