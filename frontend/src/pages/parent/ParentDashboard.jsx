import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import {
  MdFamilyRestroom, MdSchool, MdAssignment, MdTrendingUp,
  MdNotifications, MdChildCare, MdArrowForward, MdCheckCircle,
  MdPending, MdWarning
} from 'react-icons/md';

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-slate-500 text-sm font-medium mb-1">{label}</div>
          <div className="text-3xl font-bold text-slate-800">{value}</div>
        </div>
        <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center`}>
          <Icon className="text-white text-2xl" />
        </div>
      </div>
    </div>
  );
}

function ChildSummaryCard({ child, onClick }) {
  const age = calculateAge(child.date_of_birth);
  const progress = child.avg_progress || 0;
  const lastActivity = child.last_activity
    ? new Date(child.last_activity).toLocaleDateString()
    : 'No activity yet';

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Profile Picture */}
        <div className="flex-shrink-0">
          {child.profile_picture ? (
            <img
              src={child.profile_picture}
              alt={child.full_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
              {child.full_name?.charAt(0) || 'C'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
            {child.full_name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-600">
            <span>Age: {age}</span>
            <span>•</span>
            <span>{child.age_group_name || 'N/A'}</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500">Learning Progress</span>
              <span className="text-xs font-semibold text-blue-600">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Last Activity */}
          <div className="mt-2 text-xs text-slate-500">
            Last activity: {lastActivity}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 self-center">
          <MdArrowForward className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const response = await axiosClient.get('/api/parent/dashboard-stats');
      setStats(response.data.stats);
      setChildren(response.data.children_summary || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-slate-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const totalChildren = stats?.children?.total_children || 0;
  const parentManaged = stats?.children?.parent_managed || 0;
  const studentAccounts = stats?.children?.student_accounts || 0;
  const pendingActivities = stats?.activities?.pending_activities || 0;
  const avgProgress = stats?.progress?.avg_progress || 0;
  const unreadNotifications = stats?.notifications?.unread_count || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <MdFamilyRestroom className="text-4xl" />
          <h1 className="text-3xl font-bold">Welcome back, {user?.full_name?.split(' ')[0] || 'Parent'}!</h1>
        </div>
        <p className="text-blue-100 text-lg">
          Managing {totalChildren} {totalChildren === 1 ? 'child' : 'children'}'s learning journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={MdFamilyRestroom}
          label="Total Children"
          value={totalChildren}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          icon={MdChildCare}
          label="Parent-Managed"
          value={parentManaged}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard
          icon={MdSchool}
          label="Student Accounts"
          value={studentAccounts}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          icon={MdAssignment}
          label="Pending Activities"
          value={pendingActivities}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatCard
          icon={MdTrendingUp}
          label="Average Progress"
          value={`${avgProgress}%`}
          color="bg-gradient-to-br from-teal-500 to-teal-600"
        />
        <StatCard
          icon={MdNotifications}
          label="Unread Notifications"
          value={unreadNotifications}
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
      </div>

      {/* Children Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">My Children</h2>
          <Link
            to="/parent/children"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
          >
            View All <MdArrowForward />
          </Link>
        </div>

        {children.length === 0 ? (
          <div className="text-center py-12">
            <MdChildCare className="text-6xl text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Children Registered</h3>
            <p className="text-slate-500 mb-4">Get started by registering your first child</p>
            <Link
              to="/parent/register-child"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <MdSchool /> Register Child
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {children.map((child) => (
              <ChildSummaryCard
                key={child.id}
                child={child}
                onClick={() => window.location.href = `/parent/children/${child.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/parent/register-child"
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <MdSchool className="text-3xl text-slate-400 group-hover:text-blue-600 mb-2" />
            <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 text-center">
              Register Child
            </span>
          </Link>

          <Link
            to="/parent/activities"
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <MdAssignment className="text-3xl text-slate-400 group-hover:text-green-600 mb-2" />
            <span className="text-sm font-medium text-slate-600 group-hover:text-green-600 text-center">
              View Activities
            </span>
          </Link>

          <Link
            to="/parent/progress"
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-purple-500 hover:bg-purple-50 transition-all group"
          >
            <MdTrendingUp className="text-3xl text-slate-400 group-hover:text-purple-600 mb-2" />
            <span className="text-sm font-medium text-slate-600 group-hover:text-purple-600 text-center">
              Track Progress
            </span>
          </Link>

          <Link
            to="/parent/messages"
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50 transition-all group"
          >
            <MdNotifications className="text-3xl text-slate-400 group-hover:text-orange-600 mb-2" />
            <span className="text-sm font-medium text-slate-600 group-hover:text-orange-600 text-center">
              Messages
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
