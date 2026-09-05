import { useEffect, useState } from 'react';
import { MdNotifications, MdCheck, MdDoneAll } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const TYPE_ICONS = {
  assignment: '📋',
  submission: '📬',
  message:    '💬',
  feedback:   '⭐',
  system:     '🔔',
  ai:         '🤖',
  default:    '📣',
};

export default function InstructorNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');

  useEffect(() => {
    axiosClient.get('/instructor/notifications')
      .then(({ data }) => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id) {
    await axiosClient.patch(`/instructor/notifications/${id}/read`).catch(() => null);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await axiosClient.patch('/instructor/notifications/read-all').catch(() => null);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <InstructorLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <MdNotifications className="text-indigo-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              <MdDoneAll /> Mark all read
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['all', 'unread'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loading && (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <MdNotifications className="text-5xl text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-medium">No notifications</p>
              <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
            </div>
          )}

          {filtered.map((n, i) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-4 py-4 ${i !== filtered.length - 1 ? 'border-b border-slate-100' : ''} ${!n.is_read ? 'bg-indigo-50/60' : ''} transition`}
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {TYPE_ICONS[n.type] || TYPE_ICONS.default}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                  {n.message || n.title}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition"
                  title="Mark as read"
                >
                  <MdCheck className="text-lg" />
                </button>
              )}
              {n.is_read && <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><MdCheck className="text-slate-400 text-sm" /></div>}
            </div>
          ))}
        </div>
      </div>
    </InstructorLayout>
  );
}
