import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  MdPerson, MdSchool, MdCalendarToday, MdEmail, MdCheckCircle,
  MdPending, MdCancel, MdAccountCircle, MdChildCare, MdArrowForward,
  MdAdd, MdFilterList, MdSearch
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

function getAccountTypeLabel(child) {
  if (child.user_id) {
    return 'Student Account';
  }
  return 'Parent Managed';
}

function getAccountStatusBadge(child) {
  if (!child.user_id) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <MdChildCare className="text-sm" /> Parent Managed
      </span>
    );
  }

  const status = child.account_status;
  
  if (status === 'approved' || status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <MdCheckCircle className="text-sm" /> Active
      </span>
    );
  }
  
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <MdPending className="text-sm" /> Pending Approval
      </span>
    );
  }
  
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <MdCancel className="text-sm" /> Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
      <MdAccountCircle className="text-sm" /> {status || 'Unknown'}
    </span>
  );
}

function ChildCard({ child, onClick }) {
  const age = calculateAge(child.date_of_birth);
  const progress = child.avg_progress || 0;
  const completedLessons = child.completed_lessons || 0;
  const lastActivity = child.last_activity
    ? new Date(child.last_activity).toLocaleDateString()
    : 'No activity yet';

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Profile Picture */}
        <div className="flex-shrink-0">
          {child.profile_picture ? (
            <img
              src={child.profile_picture}
              alt={child.full_name}
              className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 group-hover:border-blue-300 transition-colors"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl border-4 border-blue-100 group-hover:border-blue-300 transition-colors">
              {child.full_name?.charAt(0) || 'C'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
            {child.full_name}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-sm text-slate-600">
              <MdCalendarToday className="text-base" /> Age: {age}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-sm text-slate-600">{child.age_group_name || 'N/A'}</span>
          </div>

          {child.grade_name && (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <MdSchool className="text-base" /> {child.grade_name}
                {child.section_name && ` - ${child.section_name}`}
              </span>
            </div>
          )}

          {child.student_email && (
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <MdEmail className="text-base" /> {child.student_email}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Account Status Badge */}
      <div className="mb-4">
        {getAccountStatusBadge(child)}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Learning Progress</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-t border-b border-slate-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{completedLessons}</div>
          <div className="text-xs text-slate-500 mt-1">Completed Lessons</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{child.completed_lessons || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Activities Done</div>
        </div>
      </div>

      {/* Last Activity */}
      <div className="text-sm text-slate-500 mb-4">
        Last activity: <span className="font-medium text-slate-700">{lastActivity}</span>
      </div>

      {/* Action Button */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium group-hover:shadow-md"
      >
        Open Learning Space <MdArrowForward />
      </button>

      {/* Rejection Reason (if any) */}
      {child.account_status === 'rejected' && child.account_rejection_reason && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-xs font-semibold text-red-700 mb-1">Rejection Reason:</div>
          <div className="text-sm text-red-600">{child.account_rejection_reason}</div>
        </div>
      )}
    </div>
  );
}

export default function ParentChildren() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [filteredChildren, setFilteredChildren] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, parent_managed, student_account

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [children, searchQuery, filterType]);

  async function fetchChildren() {
    try {
      setLoading(true);
      const response = await axiosClient.get('/api/parent/children');
      setChildren(response.data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...children];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(child =>
        child.full_name?.toLowerCase().includes(query) ||
        child.student_email?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType === 'parent_managed') {
      filtered = filtered.filter(child => !child.user_id);
    } else if (filterType === 'student_account') {
      filtered = filtered.filter(child => child.user_id);
    }

    setFilteredChildren(filtered);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-slate-600">Loading children...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Children</h1>
          <p className="text-slate-600 mt-1">Manage and monitor your children's learning</p>
        </div>
        <Link
          to="/parent/register-child"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          <MdAdd className="text-xl" /> Register Child
        </Link>
      </div>

      {/* Filters */}
      {children.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter by Type */}
            <div className="flex items-center gap-2">
              <MdFilterList className="text-slate-500 text-xl" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Children</option>
                <option value="parent_managed">Parent Managed (Ages 5-9)</option>
                <option value="student_account">Student Accounts (Ages 10-12)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Children Grid */}
      {filteredChildren.length === 0 && children.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <MdChildCare className="text-6xl text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Children Registered</h3>
          <p className="text-slate-500 mb-6">Get started by registering your first child</p>
          <Link
            to="/parent/register-child"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <MdAdd /> Register Child
          </Link>
        </div>
      ) : filteredChildren.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <MdSearch className="text-6xl text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Children Found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-600 mb-4">
            Showing {filteredChildren.length} of {children.length} {children.length === 1 ? 'child' : 'children'}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredChildren.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onClick={() => navigate(`/parent/children/${child.id}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
