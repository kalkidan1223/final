import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

function RoleBadge({ role }) {
  const colors = {
    admin: 'bg-violet-100 text-violet-700',
    instructor: 'bg-sky-100 text-sky-700',
    parent: 'bg-emerald-100 text-emerald-700',
    student: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[role] || 'bg-slate-100 text-slate-700'}`}>
      {role}
    </span>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {isActive ? 'Active' : 'Deactivated'}
    </span>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (search) params.set('search', search);
      const { data } = await axiosClient.get(`/admin/users?${params.toString()}`);
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 400);
    return () => clearTimeout(timer);
  }, [roleFilter, search]);

  async function handleToggleStatus(userId, currentStatus) {
    try {
      if (currentStatus) {
        await axiosClient.patch(`/admin/users/${userId}/deactivate`);
      } else {
        await axiosClient.patch(`/admin/users/${userId}/activate`);
      }
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('Are you sure you want to deactivate this user? This action can be reversed.')) return;
    await handleToggleStatus(userId, true);
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">👥 User Management</h1>
        <p className="text-slate-500 mb-8">Manage all user accounts, activate or deactivate them as needed.</p>

        <div className="flex flex-wrap gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading users…</p>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-violet-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">User</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Role</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Last Login</th>
                    <th className="px-6 py-4 text-sm font-semibold text-violet-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-violet-50/50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{user.full_name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-6 py-4"><StatusBadge isActive={user.is_active} /></td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                            user.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}