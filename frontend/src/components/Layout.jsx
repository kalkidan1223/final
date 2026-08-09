import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LINKS = {
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard' },
    { label: 'Users', to: '/admin/users' },
    { label: 'Students', to: '/admin/students' },
    { label: 'Parents', to: '/admin/parents' },
    { label: 'Instructors', to: '/admin/instructors' },
    { label: 'Courses', to: '/admin/courses' },
    { label: 'Age Groups', to: '/admin/age-groups' },
    { label: 'Reports', to: '/admin/reports' },
    { label: 'Notifications', to: '/admin/notifications' },
    { label: 'Analytics', to: '/admin/analytics' },
    { label: 'Approvals', to: '/admin/approval' },
  ],
  instructor: [{ label: 'Dashboard', to: '/instructor/dashboard' }, { label: 'My Courses', to: '/instructor/courses' }],
  parent: [
    { label: 'Dashboard', to: '/parent/dashboard' },
    { label: 'Courses', to: '/courses' },
  ],
  student: [
    { label: 'Dashboard', to: '/student/dashboard' },
    { label: 'Courses', to: '/courses' },
  ],
};

const ROLE_ACCENT = {
  admin: 'bg-violet-500',
  instructor: 'bg-sky-500',
  parent: 'bg-emerald-500',
  student: 'bg-amber-500',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const links = user ? ROLE_LINKS[user.role] || [] : [];
  const accent = user ? ROLE_ACCENT[user.role] : 'bg-slate-500';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <span className={`h-3 w-3 rounded-full ${accent}`} />
              Brana Uz Learning Hub
            </span>
            <nav className="flex gap-4">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{user.full_name}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
