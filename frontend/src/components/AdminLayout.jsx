import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/approval', label: 'Approvals', icon: '✅' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/parents', label: 'Parents', icon: '👨‍👩‍👧' },
  { to: '/admin/instructors', label: 'Instructors', icon: '👨‍🏫' },
  { to: '/admin/courses', label: 'Courses', icon: '📚' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 fixed top-0 left-0 h-full flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-violet-700">Brana Youth Academy</h1>
          <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-700 truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-400 truncate mb-3">{user?.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 p-6 lg:p-8">{children}</main>
    </div>
  );
}

export default AdminLayout;
