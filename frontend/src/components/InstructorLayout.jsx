import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdAssignment, MdPeople, MdMenuBook,
  MdVideoLibrary, MdQuiz, MdFactCheck, MdCalendarToday,
  MdTrendingUp, MdMessage, MdNotifications, MdPerson,
  MdLogout, MdMenu, MdClose, MdSchool, MdChevronRight,
  MdHelp
} from 'react-icons/md';

const NAV_ITEMS = [
  { label: 'Dashboard',       to: '/instructor/dashboard',     icon: MdDashboard,     end: true },
  { label: 'My Assignments',  to: '/instructor/assignments',   icon: MdAssignment },
  { label: 'My Students',     to: '/instructor/students',      icon: MdPeople },
  { label: 'Lessons',         to: '/instructor/lessons',       icon: MdMenuBook },
  { label: 'Materials',       to: '/instructor/materials',     icon: MdVideoLibrary },
  { label: 'Activities',      to: '/instructor/activities',    icon: MdFactCheck },
  { label: 'Quizzes',         to: '/instructor/quizzes',       icon: MdQuiz },
  { label: 'Submissions',     to: '/instructor/submissions',   icon: MdAssignment },
  { label: 'Attendance',      to: '/instructor/attendance',    icon: MdCalendarToday },
  { label: 'Progress',        to: '/instructor/progress',      icon: MdTrendingUp },
  { label: 'Messages',        to: '/instructor/messages',      icon: MdMessage },
  { label: 'Notifications',   to: '/instructor/notifications', icon: MdNotifications },
  { label: 'Profile',         to: '/instructor/profile',       icon: MdPerson },
];

function NavItem({ item, active, onClick }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <item.icon className={`text-xl flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span className="truncate">{item.label}</span>
      {active && <MdChevronRight className="ml-auto text-white/60 text-sm" />}
    </Link>
  );
}

function Sidebar({ open, onClose }) {
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
            <div className="font-bold text-sm text-slate-800 leading-tight">Children Learning Hub</div>
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
          <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.full_name?.charAt(0) || 'I'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</div>
              <div className="text-xs text-indigo-500">Instructor</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              active={item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-slate-100 space-y-0.5">
          <Link
            to="/instructor/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <MdHelp className="text-xl text-slate-400" /> Help
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
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
  const location = useLocation();
  const { user } = useAuth();

  // Get current page title from nav items
  const currentItem = NAV_ITEMS.find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
