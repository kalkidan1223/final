import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdPeople, MdMenuBook,
  MdMessage, MdNotifications, MdPerson,
  MdLogout, MdMenu, MdClose, MdSchool, MdChevronRight,
  MdHelp, MdChildCare, MdTranslate,
  MdAutoStories, MdLibraryBooks, MdExtension, MdQuiz,
  MdGrading, MdTrendingUp, MdQuestionAnswer
} from 'react-icons/md';
import axiosClient from '../api/axiosClient';

const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/instructor/dashboard', icon: MdDashboard, end: true },
    ]
  },
  {
    title: 'Teaching & Content',
    items: [
      { label: 'Courses', to: '/instructor/courses', icon: MdMenuBook },
      { label: 'Lessons', to: '/instructor/lessons', icon: MdAutoStories },
      { label: 'Materials', to: '/instructor/materials', icon: MdLibraryBooks },
      { label: 'Activities', to: '/instructor/activities', icon: MdExtension },
      { label: 'Quizzes', to: '/instructor/quizzes', icon: MdQuiz },
    ]
  },
  {
    title: 'Students & Grading',
    items: [
      { label: 'Student Questions', to: '/instructor/questions', icon: MdQuestionAnswer },
      { label: 'Submissions', to: '/instructor/submissions', icon: MdGrading, hasBadge: true },
      { label: 'Student Progress', to: '/instructor/progress', icon: MdTrendingUp },
      { label: 'Results & Analytics', to: '/instructor/results', icon: MdSchool },
      { label: 'My Students', to: '/instructor/students', icon: MdPeople },
    ]
  },
  {
    title: 'Kids Learning Hub',
    items: [
      { label: 'Child Home (Preview)', to: '/instructor/child-home', icon: MdChildCare },
      { label: 'Vocabulary Bank', to: '/instructor/vocabulary', icon: MdTranslate },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'Messages', to: '/instructor/messages', icon: MdMessage },
      { label: 'Notifications', to: '/instructor/notifications', icon: MdNotifications },
      { label: 'Profile', to: '/instructor/profile', icon: MdPerson },
    ]
  }
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

function NavItem({ item, active, onClick, badgeCount }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <item.icon className={`text-xl flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span className="truncate">{item.label}</span>
      {item.hasBadge && badgeCount > 0 && (
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white animate-pulse'}`}>
          {badgeCount}
        </span>
      )}
      {active && !item.hasBadge && <MdChevronRight className="ml-auto text-white/60 text-sm" />}
    </Link>
  );
}

function Sidebar({ open, onClose, pendingCount }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 shadow-xl z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:shadow-none`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <MdSchool className="text-white text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-slate-800 leading-tight">Brana Kids Hub</div>
            <div className="text-xs text-indigo-600 font-medium">Instructor Portal</div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* User mini card */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3 bg-indigo-50/80 rounded-xl px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
              {user?.full_name?.charAt(0) || 'I'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</div>
              <div className="text-xs text-indigo-600 font-medium">Certified Instructor</div>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                {group.title}
              </div>
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  badgeCount={pendingCount}
                  active={item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)}
                  onClick={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-slate-100 space-y-0.5">
          <Link
            to="/instructor/help"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <MdHelp className="text-xl text-slate-400" /> Help & Guides
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <MdLogout className="text-xl" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default function InstructorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    axiosClient.get('/instructor/submissions?status=pending')
      .then(res => {
        if (mounted) setPendingCount(res.data.submissions?.length || 0);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [location.pathname]);

  // Get current page title from nav items
  const currentItem = NAV_ITEMS.find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      {/* Main content area — offset for sidebar on desktop */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Open menu"
          >
            <MdMenu className="text-xl" />
          </button>

          <div className="flex-1">
            <h1 className="text-base font-semibold text-slate-800">
              {currentItem?.label || 'Instructor Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/instructor/notifications"
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <MdNotifications className="text-xl" />
            </Link>
            <Link to="/instructor/profile" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.full_name?.charAt(0) || 'I'}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
