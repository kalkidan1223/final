import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdFamilyRestroom, MdPeople, MdSchool, MdMenuBook,
  MdBook, MdAssignment, MdQuiz, MdBarChart, MdSmartToy,
  MdCampaign, MdNotifications, MdAssessment, MdSecurity,
  MdSettings, MdLogout, MdMenu, MdClose, MdSearch,
  MdCheckCircle, MdClass, MdGroups, MdLibraryBooks,
  MdVideoLibrary, MdTrendingUp, MdMessage, MdTranslate
} from 'react-icons/md';
import axiosClient from '../api/axiosClient';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: MdDashboard },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/approval', label: 'Approvals', icon: MdCheckCircle, badge: 'pending' },
      { to: '/admin/parents', label: 'Parents & Guardians', icon: MdFamilyRestroom },
      { to: '/admin/students', label: 'Students', icon: MdSchool },
      { to: '/admin/instructors', label: 'Instructors', icon: MdGroups },
      { to: '/admin/users', label: 'All Users', icon: MdPeople },
    ],
  },
  {
    label: 'Academic',
    items: [
      { to: '/admin/age-groups', label: 'Age Groups', icon: MdClass },
      { to: '/admin/courses', label: 'Courses', icon: MdBook },
      { to: '/admin/lessons', label: 'Lessons', icon: MdMenuBook },
      { to: '/admin/reference', label: 'Early Childhood Data', icon: MdTranslate },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/admin/progress', label: 'Student Progress', icon: MdTrendingUp },
      { to: '/admin/ai-recommendations', label: 'AI Recommendations', icon: MdSmartToy },
      { to: '/admin/analytics', label: 'Analytics', icon: MdBarChart },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/admin/announcements', label: 'Announcements', icon: MdCampaign },
      { to: '/admin/notifications', label: 'Notifications', icon: MdNotifications, badge: 'notifications' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: MdAssessment },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: MdSecurity },
    ],
  },
];

function NavItem({ item, pendingCount, unreadNotifCount, collapsed }) {
  const location = useLocation();
  const active = location.pathname === item.to ||
    (item.to !== '/admin/dashboard' && location.pathname.startsWith(item.to));
  const Icon = item.icon;
  const isPendingBadge = item.badge === 'pending' && pendingCount > 0;
  const isNotifBadge = item.badge === 'notifications' && unreadNotifCount > 0;
  const showBadge = isPendingBadge || isNotifBadge;
  const count = isPendingBadge ? pendingCount : unreadNotifCount;
  const badgeStyle = isPendingBadge ? 'bg-amber-400 text-slate-900' : 'bg-rose-500 text-white';

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group ${
        active
          ? 'bg-violet-600 text-white shadow-sm'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <Icon className={`flex-shrink-0 text-lg ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {showBadge && (
        <span className={`ml-auto rounded-full ${badgeStyle} text-xs font-bold px-1.5 py-0.5 min-w-[20px] text-center ${collapsed ? 'absolute -top-1 -right-1 text-[10px]' : ''}`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
      {collapsed && !showBadge && (
        <span className="absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
          {item.label}
        </span>
      )}
    </Link>
  );
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const searchDebounce = useRef(null);

  // Load pending approvals and unread notifications count
  useEffect(() => {
    async function loadStats() {
      try {
        const { data } = await axiosClient.get('/admin/dashboard');
        const total = data.total_pending_approvals ?? ((data.pending_parent_registrations || 0) + (data.pending_student_registrations || 0) + (data.pending_instructor_registrations || 0));
        setPendingCount(total);
        setUnreadNotifCount(data.unread_notifications_count || 0);
      } catch { /* silent */ }
    }
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Global search with debounce
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [users, courses] = await Promise.all([
          axiosClient.get(`/admin/users?search=${encodeURIComponent(search)}`),
          axiosClient.get(`/admin/courses?search=${encodeURIComponent(search)}`),
        ]);
        const results = [
          ...(users.data.users || []).slice(0, 4).map(u => ({
            label: u.full_name, sub: u.email, tag: u.role,
            to: u.role === 'parent' ? '/admin/parents' : u.role === 'instructor' ? '/admin/instructors' : u.role === 'student' ? '/admin/students' : '/admin/users',
          })),
          ...(courses.data.courses || []).slice(0, 3).map(c => ({
            label: c.title, sub: c.instructor_name, tag: 'course', to: '/admin/courses',
          })),
        ];
        setSearchResults(results);
      } catch { /* silent */ }
      finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(searchDebounce.current);
  }, [search]);

  // Close search and notifs on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearch('');
        setSearchResults([]);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function toggleNotifMenu() {
    if (!showNotifMenu) {
      try {
        const { data } = await axiosClient.get('/admin/notifications/unread');
        setRecentNotifs(data.notifications || []);
      } catch { /* silent */ }
    }
    setShowNotifMenu(v => !v);
  }

  async function handleQuickMarkRead(id, e) {
    if (e) e.stopPropagation();
    try {
      await axiosClient.patch(`/admin/notifications/${id}/read`);
      setRecentNotifs(prev => prev.filter(n => n.id !== id));
      setUnreadNotifCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  }

  async function handleQuickMarkAllRead() {
    try {
      await axiosClient.patch('/admin/notifications/read-all');
      setRecentNotifs([]);
      setUnreadNotifCount(0);
    } catch { /* silent */ }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const sidebarContent = (isMobile = false) => (
    <div className={`flex flex-col h-full ${isMobile ? 'w-72' : collapsed ? 'w-16' : 'w-64'} bg-slate-800 transition-all duration-300`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-700 ${collapsed && !isMobile ? 'justify-center' : ''}`}>
        <div className="h-8 w-8 rounded-lg bg-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">B</div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">Brana Youth Academy</p>
            <p className="text-xs text-slate-400">Admin Portal</p>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(v => !v)}
            className="ml-auto text-slate-400 hover:text-white transition flex-shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <MdMenu className="text-lg" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-2' : ''}>
            {group.label && (!collapsed || isMobile) && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
            )}
            {group.label && (collapsed && !isMobile) && gi > 0 && (
              <div className="border-t border-slate-700 mb-2 mx-2" />
            )}
            {group.items.map(item => (
              <NavItem
                key={item.to}
                item={item}
                pendingCount={pendingCount}
                unreadNotifCount={unreadNotifCount}
                collapsed={collapsed && !isMobile}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className={`border-t border-slate-700 p-3 ${collapsed && !isMobile ? 'flex flex-col items-center gap-2' : ''}`}>
        {(!collapsed || isMobile) ? (
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold mb-2" title={user?.full_name}>
            {user?.full_name?.[0] || 'A'}
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Log out"
          className={`flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition text-sm font-medium ${collapsed && !isMobile ? 'p-2 justify-center w-full' : 'px-3 py-2 w-full'}`}
        >
          <MdLogout className="flex-shrink-0" />
          {(!collapsed || isMobile) && 'Log out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen">
        {sidebarContent(false)}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            {sidebarContent(true)}
          </div>
          <button className="absolute top-4 right-4 text-white z-20" onClick={() => setMobileOpen(false)}>
            <MdClose className="text-2xl" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center gap-4">
          {/* Mobile menu button */}
          <button className="lg:hidden text-slate-600 hover:text-slate-900" onClick={() => setMobileOpen(true)}>
            <MdMenu className="text-2xl" />
          </button>

          {/* Global Search */}
          <div ref={searchRef} className="relative flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
              <MdSearch className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search users, courses…"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
              />
              {searchLoading && <div className="h-3 w-3 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex-shrink-0" />}
            </div>
            {showSearch && search && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { navigate(r.to); setShowSearch(false); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50 text-left transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
                      <p className="text-xs text-slate-500 truncate">{r.sub}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 capitalize flex-shrink-0">{r.tag}</span>
                  </button>
                ))}
              </div>
            )}
            {showSearch && search && !searchLoading && searchResults.length === 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 z-50">
                No results for "{search}"
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Pending badge */}
            {pendingCount > 0 && (
              <Link
                to="/admin/approval"
                className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {pendingCount} pending
              </Link>
            )}

            {/* Notifications Popover */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={toggleNotifMenu}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Notifications"
                aria-label="View notifications"
              >
                <MdNotifications className="text-xl" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-50 animate-pop">
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">Notifications</span>
                      {unreadNotifCount > 0 && (
                        <span className="bg-rose-100 text-rose-700 font-extrabold text-xs px-2 py-0.5 rounded-full">
                          {unreadNotifCount} unread
                        </span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleQuickMarkAllRead}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {recentNotifs.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">
                        <MdNotifications className="text-3xl mx-auto mb-1 text-slate-300" />
                        No unread notifications
                      </div>
                    ) : (
                      recentNotifs.map(n => (
                        <div
                          key={n.id}
                          className="p-3.5 hover:bg-slate-50 transition flex items-start gap-3 text-left"
                        >
                          <span className="mt-1 h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                            <div className="mt-2 flex items-center gap-2">
                              {n.title?.toLowerCase().includes('registration') || n.title?.toLowerCase().includes('approval') || n.message?.toLowerCase().includes('register') ? (
                                <Link
                                  to="/admin/approval"
                                  onClick={() => { setShowNotifMenu(false); handleQuickMarkRead(n.id); }}
                                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 bg-violet-50 px-2 py-0.5 rounded-md"
                                >
                                  Review Approvals ➔
                                </Link>
                              ) : null}
                              <button
                                onClick={(e) => handleQuickMarkRead(n.id, e)}
                                className="text-[11px] text-slate-400 hover:text-slate-600"
                              >
                                Mark read
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <Link
                      to="/admin/notifications"
                      onClick={() => setShowNotifMenu(false)}
                      className="text-xs font-bold text-violet-600 hover:text-violet-800"
                    >
                      View all notifications ➔
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Admin avatar */}
            <div className="flex items-center gap-2 rounded-lg px-2 py-1 bg-slate-50 border border-slate-200">
              <div className="h-7 w-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.full_name?.[0] || 'A'}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.full_name?.split(' ')[0]}</span>
              <span className="text-xs rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 font-medium hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
