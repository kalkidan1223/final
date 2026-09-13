import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard,
  MdFamilyRestroom,
  MdTrendingUp,
  MdAssignment,
  MdQuiz,
  MdFeedback,
  MdNotifications,
  MdPerson,
  MdHelp,
  MdLogout,
  MdMenu,
  MdClose,
  MdPlayCircleFilled,
  MdArrowDropDown,
  MdCheckCircle,
} from 'react-icons/md';
import axiosClient, { setActiveChildId, getActiveChildId } from '../api/axiosClient';

// Exactly the 10 prompt-specified sidebar items
const NAV_ITEMS = [
  { to: '/parent/dashboard', label: 'Dashboard', icon: MdDashboard },
  { to: '/parent/children', label: 'My Children', icon: MdFamilyRestroom },
  { to: '/parent/progress', label: 'Learning Progress', icon: MdTrendingUp },
  { to: '/parent/activities', label: 'Activities', icon: MdAssignment },
  { to: '/parent/quizzes', label: 'Quiz Results', icon: MdQuiz },
  { to: '/parent/feedback', label: 'Instructor Feedback', icon: MdFeedback },
  { to: '/parent/notifications', label: 'Notifications', icon: MdNotifications, badge: 'notifications' },
  { to: '/parent/profile', label: 'Profile', icon: MdPerson },
  { to: '/parent/help', label: 'Help / Support', icon: MdHelp },
];

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Multi-child switcher state
  const [childrenList, setChildrenList] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(getActiveChildId() || '');
  const [childDropdownOpen, setChildDropdownOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const [notifRes, childRes] = await Promise.all([
        axiosClient.get('/parent/notifications').catch(() => ({ data: { unread_count: 0 } })),
        axiosClient.get('/parent/children').catch(() => ({ data: { children: [] } })),
      ]);

      setUnreadNotifications(notifRes.data?.unread_count || 0);
      const kids = childRes.data?.children || [];
      setChildrenList(kids);

      // Auto-select first child if none selected
      const currentActive = getActiveChildId();
      if (!currentActive && kids.length > 0) {
        setSelectedChildId(kids[0].id.toString());
        setActiveChildId(kids[0].id.toString());
      } else if (currentActive) {
        setSelectedChildId(currentActive.toString());
      }
    } catch (err) {
      console.error('Failed to load parent layout data:', err);
    }
  }

  const handleSelectChild = (childId) => {
    setSelectedChildId(childId);
    setActiveChildId(childId);
    setChildDropdownOpen(false);
    // Dispatch storage event so open pages can react if needed
    window.dispatchEvent(new CustomEvent('activeChildChanged', { detail: { childId } }));
  };

  const handleLaunchChildPortal = (childId) => {
    const idToUse = childId || selectedChildId || (childrenList[0]?.id ? childrenList[0].id.toString() : '');
    if (idToUse) {
      setActiveChildId(idToUse);
    }
    navigate('/child');
  };

  const selectedChild = childrenList.find((c) => c.id.toString() === selectedChildId.toString()) || childrenList[0];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 z-30 shadow-xl border-r border-slate-800 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          {!collapsed ? (
            <Link to="/parent/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
                👨‍👧‍👦
              </div>
              <div>
                <div className="font-extrabold text-sm text-white tracking-tight leading-none">
                  Learning Hub
                </div>
                <div className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase mt-0.5">
                  Parent Portal
                </div>
              </div>
            </Link>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xl">
              👨‍👧‍👦
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <MdMenu className="text-xl" />
          </button>
        </div>

        {/* Navigation Items (The 10 items) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== '/parent/dashboard' && location.pathname.startsWith(item.to));
            const hasBadge = item.badge === 'notifications' && unreadNotifications > 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`text-xl flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {hasBadge && (
                  <span
                    className={`ml-auto bg-red-500 text-white font-black text-xs px-1.5 py-0.5 rounded-full ${
                      collapsed ? 'absolute -top-1 -right-1 text-[10px]' : ''
                    }`}
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Launch Child Portal Widget in Sidebar */}
        {!collapsed && selectedChild && (
          <div className="p-3 mx-3 mb-3 bg-gradient-to-br from-indigo-900/60 to-purple-900/40 border border-indigo-700/50 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🎮</span>
              <span className="text-xs font-bold text-indigo-200">Learn Together</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-1 mb-2.5">
              Practice lessons with <strong className="text-white">{selectedChild.full_name?.split(' ')[0]}</strong>
            </p>
            <button
              onClick={() => handleLaunchChildPortal(selectedChild.id)}
              className="w-full py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <MdPlayCircleFilled className="text-base text-slate-900" />
              <span>Launch Child Portal</span>
            </button>
          </div>
        )}

        {/* Logout (Item 10) */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
            title="Logout"
          >
            <MdLogout className="text-xl flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content Wrapper ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shadow-sm flex-shrink-0">
          {/* Left: Mobile Toggle & Greeting */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <MdMenu className="text-2xl" />
            </button>

            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight">
                Welcome, {user?.full_name || 'Parent'} 👋
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                Children Learning Hub • Family Learning Space
              </p>
            </div>
          </div>

          {/* Right: Child Selector & Quick Portal Launch & Notifications */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Multi-Child Quick Switcher */}
            {childrenList.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setChildDropdownOpen(!childDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 transition"
                >
                  <span className="text-base">🧒</span>
                  <span className="max-w-[110px] sm:max-w-[150px] truncate">
                    {selectedChild ? selectedChild.full_name : 'Select Child'}
                  </span>
                  <MdArrowDropDown className="text-lg text-slate-500" />
                </button>

                {/* Dropdown Menu */}
                {childDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in"
                    onMouseLeave={() => setChildDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Switch Child
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1 space-y-1">
                      {childrenList.map((c) => {
                        const isSelected = c.id.toString() === selectedChildId.toString();
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleSelectChild(c.id.toString())}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-semibold transition ${
                              isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-lg">
                                {c.gender === 'female' ? '👧' : '👦'}
                              </span>
                              <div className="truncate">
                                <div className="font-bold truncate">{c.full_name}</div>
                                <div className="text-[11px] text-slate-400">
                                  {c.age_group_name || 'Age 5-12'} • {c.user_id ? 'Independent' : 'Parent-Managed'}
                                </div>
                              </div>
                            </div>
                            {isSelected && <MdCheckCircle className="text-blue-600 text-base flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <Link
                        to="/parent/children"
                        onClick={() => setChildDropdownOpen(false)}
                        className="block text-center py-1.5 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Manage All Children ➔
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Button: Launch Child Portal */}
            <button
              type="button"
              onClick={() => handleLaunchChildPortal()}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-xl font-black text-xs shadow-sm transition"
              title="Launch interactive learning portal for the selected child"
            >
              <MdPlayCircleFilled className="text-base" />
              <span>Learn with Child</span>
            </button>

            {/* Notifications Bell */}
            <Link
              to="/parent/notifications"
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              title="Notifications"
            >
              <MdNotifications className="text-2xl" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </Link>

            {/* Profile Avatar */}
            <Link
              to="/parent/profile"
              className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm hover:scale-105 transition"
              title="Parent Profile"
            >
              {user?.full_name?.charAt(0) || 'P'}
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Outlet context={{ selectedChildId, selectedChild, childrenList, refreshChildren: fetchInitialData }} />
        </main>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-slate-900 text-slate-200 h-full flex flex-col p-4 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍👧‍👦</span>
                <span className="font-bold text-white text-base">Parent Portal</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                <MdClose className="text-2xl" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                      active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="text-xl" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition mt-auto"
            >
              <MdLogout className="text-xl" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
