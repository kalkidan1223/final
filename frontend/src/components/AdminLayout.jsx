import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/parents', label: 'Parents', icon: '👨‍👩‍👧' },
  { to: '/admin/instructors', label: 'Instructors', icon: '👨‍🏫' },
  { to: '/admin/courses', label: 'Courses', icon: '📚' },
  { to: '/admin/age-groups', label: 'Age Groups', icon: '🔢' },
  { to: '/admin/reports', label: 'Reports', icon: '📋' },
  { to: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

function AdminLayout({ children }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-50 to-fuchsia-50">
      <aside className="w-64 bg-white border-r border-violet-100 shadow-sm fixed top-0 left-0 h-full overflow-y-auto">
        <div className="p-6 border-b border-violet-100">
          <h1 className="text-xl font-bold text-violet-700">🎓 Admin Panel</h1>
          <p className="text-xs text-violet-400 mt-1">Brana Uz Academy</p>
        </div>
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                location.pathname === item.to
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;