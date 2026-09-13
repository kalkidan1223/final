import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  MdNotifications,
  MdCheckCircle,
  MdInfo,
  MdDoneAll,
  MdAccessTime,
} from 'react-icons/md';

export default function ParentNotifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await axiosClient.get('/parent/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      await axiosClient.patch(`/parent/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => axiosClient.patch(`/parent/notifications/${n.id}/read`)));
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.is_read : true));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdNotifications className="text-blue-600 text-3xl" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Stay updated with account reviews, instructor grading, and your children's milestones.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <MdDoneAll className="text-base text-blue-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading notifications...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm text-slate-500 space-y-2">
          <span className="text-4xl block">🔔</span>
          <h3 className="font-bold text-slate-800 text-base">No notifications</h3>
          <p className="text-xs text-slate-400">You are all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
              className={`p-4 sm:p-5 rounded-2xl border transition flex items-start justify-between gap-4 cursor-pointer ${
                notif.is_read
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-blue-50/60 border-blue-200 text-slate-900 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                    notif.is_read ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white shadow-sm'
                  }`}
                >
                  <MdInfo />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm">{notif.title || 'Notification'}</h4>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                    <MdAccessTime className="text-xs" />
                    <span>{notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</span>
                  </div>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notif.id);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex-shrink-0 whitespace-nowrap"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
