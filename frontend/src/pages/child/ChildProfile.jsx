import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

export default function ChildProfile() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/child/profile');
      setProfile(response.data.child || response.data.student);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading profile... 👤</p>
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

  if (!profile) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const details = [
    { label: 'Name', value: profile.full_name, icon: '👧' },
    { label: 'Age Group', value: profile.age_group_name, icon: '🎂' },
    { label: 'Date of Birth', value: formatDate(profile.date_of_birth), icon: '📅' },
    { label: 'Grade', value: profile.grade || '—', icon: '🏫' },
    { label: 'Class / Section', value: profile.section || '—', icon: '📚' },
    { label: 'Gender', value: profile.gender || '—', icon: '🧑' },
    { label: 'Preferred Language', value: profile.preferred_language || 'English', icon: '🗣️' },
    { label: 'School', value: profile.previous_school || '—', icon: '🏫' },
    { label: 'Academic Year', value: profile.academic_year || '—', icon: '🗓️' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 rounded-3xl p-8 shadow-xl text-center">
        <div className="w-28 h-28 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden ring-4 ring-white/40">
          {profile.profile_image_url ? (
            <img src={profile.profile_image_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">🧒</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">{profile.full_name}</h1>
        <p className="text-white/90">{profile.age_group_name} • Age Group</p>
        <div className="flex justify-center gap-3 mt-4">
          <span className="px-4 py-2 bg-white/20 text-white rounded-xl font-bold text-sm">{profile.grade || 'Grade —'}</span>
          <span className="px-4 py-2 bg-white/20 text-white rounded-xl font-bold text-sm">{profile.section || 'Section —'}</span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {details.map((d) => (
            <div key={d.label} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <span className="text-2xl" aria-hidden="true">{d.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{d.label}</p>
                <p className="font-semibold text-gray-800 truncate">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Account</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <span className="text-2xl" aria-hidden="true">📧</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
              <p className="font-semibold text-gray-800 truncate">{profile.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <span className="text-2xl" aria-hidden="true">📱</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
              <p className="font-semibold text-gray-800 truncate">{profile.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <span className="text-2xl" aria-hidden="true">📝</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Username</p>
              <p className="font-semibold text-gray-800 truncate">{user?.username || user?.email || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-lg hover:from-red-600 hover:to-red-700 transition"
      >
        Logout
      </button>
    </div>
  );
}