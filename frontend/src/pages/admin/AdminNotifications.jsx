import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const TYPE_COLORS = {
  info: 'bg-sky-100 text-sky-700',
  alert: 'bg-rose-100 text-rose-700',
  reminder: 'bg-amber-100 text-amber-700',
  feedback: 'bg-emerald-100 text-emerald-700',
  message: 'bg-violet-100 text-violet-700',
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/admin/notifications');
      setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadNotifications(); }, []);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">🔔 Notifications</h1>
        <p className="text-slate-500 mb-8">View all system notifications across users.</p>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading notifications…</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${TYPE_COLORS[n.type] || 'bg-slate-100 text-slate-700'}`}>
                        {n.type}
                      </span>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-800">{n.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500 ml-4">
                    <p>{n.user_name}</p>
                    <p className="mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-center text-slate-500 py-10">No notifications.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}