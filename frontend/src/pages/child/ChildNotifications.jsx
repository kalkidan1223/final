import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildNotifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/child/notifications');
      setNotifications(response.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await axiosClient.patch(`/child/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      // Silent fail
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markRead(n.id)));
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading notifications... 🔔</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
        <p className="text-red-700 font-medium flex items-center gap-2">
          <span>⚠️</span> {error}
        </p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-1">Notifications 🔔</h1>
          <p className="text-white/90">
            {unreadCount > 0 ? `You have ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}!` : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition"
          >
            Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <span className="text-6xl block mb-4">🔔</span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Notifications</h2>
          <p className="text-gray-600 text-lg">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`w-full text-left bg-white rounded-2xl shadow-md p-5 border transition ${
                n.is_read ? 'border-gray-100' : 'border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${n.is_read ? 'bg-gray-100' : 'bg-blue-100'}`}>
                  <span className="text-xl">{(n.type || 'general') === 'quiz' ? '📝' : (n.type || 'general') === 'activity' ? '🎯' : '🔔'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={`font-bold truncate ${n.is_read ? 'text-gray-500' : 'text-gray-800'}`}>
                      {n.title || 'Notification'}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(n.created_at)}</span>
                  </div>
                  <p className={`text-sm ${n.is_read ? 'text-gray-400' : 'text-gray-600'}`}>{n.message || n.body || ''}</p>
                </div>
                {!n.is_read && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}