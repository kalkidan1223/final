import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdFamilyRestroom, MdPersonAdd, MdSchool,
  MdAssignment, MdTrendingUp, MdEventAvailable, MdFeedback,
  MdSmartToy, MdMessage, MdNotifications, MdCalendarToday,
  MdPerson, MdSettings, MdHelp, MdLogout, MdMenu, MdClose,
  MdSearch, MdEmojiEvents
} from 'react-icons/md';
import axiosClient from '../api/axiosClient';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/parent/dashboard', label: 'Dashboard', icon: MdDashboard },
    ],
  },
  {
    label: 'Children',
    items: [
      { to: '/parent/children', label: 'My Children', icon: MdFamilyRestroom },
      { to: '/parent/register-child', label: 'Register Child', icon: MdPersonAdd },
    ],
  },
  {
    label: 'Learning',
    items: [
      { to: '/parent/learning', label: 'Learning Materials', icon: MdSchool },
      { to: '/parent/activities', label: 'Activities', icon: MdAssignment },
      { to: '/parent/progress', label: 'Progress', icon: MdTrendingUp },
      { to: '/parent/attendance', label: 'Attendance', icon: MdEventAvailable },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/parent/feedback', label: 'Teacher Feedback', icon: MdFeedback },
      { to: '/parent/ai-recommendations', label: 'AI Recommendations', icon: MdSmartToy },
      { to: '/parent/messages', label: 'Messages', icon: MdMessage, badge: 'messages' },
      { to: '/parent/notifications', label: 'Notifications', icon: MdNotifications, badge: 'notifications' },
    ],
  },
  {
    label: 'More',
    items: [
      { to: '/parent/calendar', label: 'Calendar', icon: MdCalendarToday },
      { to: '/parent/achievements', label: 'Achievements', icon: MdEmojiEvents },
      { to: '/parent/profile', label: 'Profile', icon: MdPerson },
      { to: '/parent/settings', label: 'Settings', icon: MdSettings },
      { to: '/parent/help', label: 'Help & Support', icon: MdHelp },
    ],
  },
];

function NavItem({ item, unreadMessages, unreadNotifications, collapsed }) {
  const location = useLocation();
  const active = location.pathname === item.to ||
    (item.to !== '/parent/dashboard' && location.pathname.startsWith(item.to));
  const Icon = item.icon;

  let badgeCount = 0;
  if (item.badge === 'messages') badgeCount = unreadMessages;
  if (item.badge === 'notifications') badgeCount = unreadNotifications;

  const showBadge = badgeCount > 0;

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <Icon className={`flex-shrink-0 text-lg ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {showBadge && (
        <span className={`ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 min-w-[20px] text-center ${collapsed ? 'absolute -top-1 -right-1 text-[10px]' : ''}`}>
          {badgeCount > 99 ? '99+' : badgeCount}
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

export default function ParentLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchUnreadCounts();
  }, []);

  async function fetchUnreadCounts() {
    try {
      const [notifRes] = await Promise.all([
        axiosClient.get('/api/notifications?is_read=false&limit=1'),
      ]);
      // For now, set messages to 0 since messaging system may not be fully implemented
      setUnreadMessages(0);
      setUnreadNotifications(notifRes.data.notifications?.length || 0);
    } catch (err) {
      console.error('Failed to fetch unread counts:', err);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/parent/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSearch(false);
    }
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-slate-800 text-slate-100">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <MdFamilyRestroom className="text-white text-lg" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white truncate">Parent Portal</div>
            <div className="text-xs text-slate-400 truncate">{user?.full_name || 'Parent'}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx}>
            {group.label && !collapsed && (
              <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  unreadMessages={unreadMessages}
                  unreadNotifications={unreadNotifications}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle (Desktop only) */}
      <div className="hidden lg:block border-t border-slate-700 p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* Logout */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600 hover:text-white transition-colors group"
        >
          <MdLogout className="flex-shrink-0 text-lg text-slate-400 group-hover:text-white" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 shadow-xl`}>
        {sidebar}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 lg:hidden shadow-2xl">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            {/* Mobile Menu + Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              >
                {mobileOpen ? <MdClose className="text-xl" /> : <MdMenu className="text-xl" />}
              </button>
              <h1 className="text-lg lg:text-xl font-bold text-slate-800 hidden sm:block">
                Welcome, {user?.full_name?.split(' ')[0] || 'Parent'}!
              </h1>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Search */}
              <div className="relative">
                {showSearch ? (
                  <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-40 sm:w-64 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                      }}
                      className="p-2 text-slate-500 hover:text-slate-700"
                    >
                      <MdClose />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowSearch(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative"
                    title="Search"
                  >
                    <MdSearch className="text-xl" />
                  </button>
                )}
              </div>

              {/* Notifications */}
              <Link
                to="/parent/notifications"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative"
                title="Notifications"
              >
                <MdNotifications className="text-xl" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>

              {/* Messages */}
              <Link
                to="/parent/messages"
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative"
                title="Messages"
              >
                <MdMessage className="text-xl" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <Link
                to="/parent/profile"
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.full_name?.charAt(0) || 'P'}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden lg:block">
                  {user?.full_name?.split(' ')[0] || 'Parent'}
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
