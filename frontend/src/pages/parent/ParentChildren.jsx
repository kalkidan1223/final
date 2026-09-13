import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient, { setActiveChildId } from '../../api/axiosClient';
import {
  MdPerson,
  MdSchool,
  MdCalendarToday,
  MdEmail,
  MdCheckCircle,
  MdPending,
  MdCancel,
  MdAccountCircle,
  MdChildCare,
  MdArrowForward,
  MdAdd,
  MdSearch,
  MdPlayCircleFilled,
  MdClose,
  MdLock,
  MdInfo,
  MdLightbulb,
} from 'react-icons/md';

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function ParentChildren() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, parent_managed, student_account, pending

  // Add Child Modal state
  const [showAddModal, setShowAddModal] = useState(searchParams.get('action') === 'add');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'female',
    date_of_birth: '',
    grade_id: '',
    section_id: '',
    previous_school: '',
    preferred_language: 'Amharic',
    student_email: '',
    password: '',
    confirm_password: '',
  });

  const calculatedAge = calculateAge(formData.date_of_birth);

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    try {
      setLoading(true);
      const res = await axiosClient.get('/parent/children');
      setChildren(res.data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLaunchChildPortal = (childId) => {
    setActiveChildId(childId);
    navigate('/child');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleAddChildSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.first_name.trim()) {
      setFormError('Please enter the child’s first name.');
      return;
    }

    if (!formData.date_of_birth) {
      setFormError('Please select the child’s date of birth.');
      return;
    }

    if (calculatedAge === null || calculatedAge < 5 || calculatedAge > 12) {
      setFormError('The Children Learning Hub currently supports children aged 5 to 12.');
      return;
    }

    // Validation for ages 10-12
    if (calculatedAge >= 10) {
      if (!formData.student_email.trim()) {
        setFormError('Student email is required for children aged 10–12.');
        return;
      }
      if (!formData.password) {
        setFormError('Student password is required for children aged 10–12.');
        return;
      }
      if (formData.password.length < 8) {
        setFormError('Password must be at least 8 characters long.');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setFormError('Password and Confirm Password do not match.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await axiosClient.post('/parent/children', formData);
      setFormSuccess(res.data.message || 'Child added successfully!');
      fetchChildren();

      // Reset after short delay or close
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
        setFormData({
          first_name: '',
          middle_name: '',
          last_name: '',
          gender: 'female',
          date_of_birth: '',
          grade_id: '',
          section_id: '',
          previous_school: '',
          preferred_language: 'Amharic',
          student_email: '',
          password: '',
          confirm_password: '',
        });
      }, 1800);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add child. Please verify the information.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter children
  const filteredChildren = children.filter((child) => {
    const matchesSearch =
      child.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.student_email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'parent_managed') return !child.user_id;
    if (filterType === 'student_account') return Boolean(child.user_id);
    if (filterType === 'pending') return child.account_status === 'pending';

    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>My Children</span>
            <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-extrabold">
              {children.length}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your children's profiles, monitor their learning progress, and launch their portals.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
        >
          <MdAdd className="text-xl" />
          <span>+ Add Child</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
          <input
            type="text"
            placeholder="Search by child name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({children.length})
          </button>
          <button
            onClick={() => setFilterType('parent_managed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'parent_managed'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Parent Managed ({children.filter((c) => !c.user_id).length})
          </button>
          <button
            onClick={() => setFilterType('student_account')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'student_account'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Independent Accounts ({children.filter((c) => c.user_id).length})
          </button>
          <button
            onClick={() => setFilterType('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Approval ({children.filter((c) => c.account_status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Children Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading your children...</span>
        </div>
      ) : filteredChildren.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <span className="text-5xl block">🎈</span>
          <h3 className="text-lg font-bold text-slate-800">No children found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchQuery ? 'No child matches your search term.' : "You haven't added any children yet."}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition"
          >
            + Add Child Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChildren.map((child) => {
            const age = calculateAge(child.date_of_birth);
            const isParentManaged = !child.user_id;
            const isPending = child.account_status === 'pending';
            const isRejected = child.account_status === 'rejected';

            return (
              <div
                key={child.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-5"
              >
                <div>
                  {/* Top Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
                      {child.profile_picture ? (
                        <img
                          src={child.profile_picture}
                          alt={child.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{child.gender === 'female' ? '👧' : '👦'}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-lg text-slate-900 truncate">{child.full_name}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Age: <strong className="text-slate-800">{age ?? '—'}</strong> •{' '}
                        <span>{child.age_group_name || 'Primary'}</span>
                      </div>

                      {child.student_email && (
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <MdEmail className="text-xs" /> {child.student_email}
                        </div>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {isParentManaged ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">
                            <MdChildCare /> Parent Managed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                            <MdSchool /> Independent Student
                          </span>
                        )}

                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <MdPending /> Pending Approval
                          </span>
                        )}

                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                            <MdCancel /> Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pending Notice */}
                  {isPending && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <MdInfo className="text-base text-amber-600" />
                        <span>Awaiting Administrator Approval</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        This child registration has been submitted and is waiting for administrator approval. Once approved, you will be able to access courses and learning activities.
                      </p>
                    </div>
                  )}

                  {isRejected && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <MdCancel className="text-base text-red-600" />
                        <span>Registration Not Approved</span>
                      </div>
                      <p className="text-[11px] text-red-700 leading-relaxed">
                        Reason: {child.account_rejection_reason || 'Information could not be verified.'}
                      </p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Learning Progress</span>
                      <span className="font-black text-blue-600">{child.avg_progress || 0}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${child.avg_progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Counters */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <div className="text-base font-black text-slate-800">{child.total_assigned_courses || 0}</div>
                      <div className="text-[11px] font-bold text-slate-500">Courses</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <div className="text-base font-black text-emerald-600">{child.completed_lessons || 0}</div>
                      <div className="text-[11px] font-bold text-slate-500">Lessons Completed</div>
                    </div>
                  </div>
                </div>

                {/* Dual Action Buttons */}
                <div className="space-y-2 pt-2">
                  {isPending ? (
                    <div className="w-full py-2.5 px-3 bg-amber-50 border border-amber-300 text-amber-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 text-center select-none">
                      <MdPending className="text-base text-amber-600 animate-pulse" />
                      <span>Waiting for Admin Approval</span>
                    </div>
                  ) : isRejected ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          first_name: child.full_name?.split(' ')[0] || '',
                          middle_name: child.full_name?.split(' ')[1] || '',
                          last_name: child.full_name?.split(' ').slice(2).join(' ') || '',
                          gender: child.gender || 'female',
                          date_of_birth: child.date_of_birth?.split('T')[0] || '',
                          grade_id: '',
                          section_id: '',
                          previous_school: '',
                          preferred_language: child.preferred_language || 'Amharic',
                          student_email: child.student_email || '',
                          password: '',
                          confirm_password: '',
                        });
                        setShowAddModal(true);
                      }}
                      className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                    >
                      <span>Re-submit Registration</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleLaunchChildPortal(child.id)}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                      >
                        <MdPlayCircleFilled className="text-base text-slate-900" />
                        <span>Learn with Child (Child Portal)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/parent/children/${child.id}`)}
                        className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <span>View Learning & Records</span>
                        <MdArrowForward className="text-sm text-slate-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Child Modal (Section 6-9, 51-53) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧒</span>
                <div>
                  <h3 className="font-extrabold text-lg">Add a Child</h3>
                  <p className="text-xs text-blue-100">Enroll your child in the Children Learning Hub</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleAddChildSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2">
                  <MdCancel className="text-lg text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <MdCheckCircle className="text-lg text-emerald-600 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  1. Child Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleFormChange}
                      placeholder="e.g. Kal"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleFormChange}
                      placeholder="Middle Name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleFormChange}
                      placeholder="Last Name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date of Birth with live age calculator */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {calculatedAge !== null && (
                      <div className="mt-1 text-xs">
                        {calculatedAge >= 5 && calculatedAge <= 12 ? (
                          <span className="font-bold text-blue-600">
                            Calculated Age: {calculatedAge} years old
                          </span>
                        ) : (
                          <span className="font-bold text-red-600">
                            Age {calculatedAge}: outside 5–12 program range
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="female">Female (Girl 👧)</option>
                      <option value="male">Male (Boy 👦)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Language</label>
                    <select
                      name="preferred_language"
                      value={formData.preferred_language}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Amharic">Amharic</option>
                      <option value="English">English</option>
                      <option value="Afaan Oromo">Afaan Oromo</option>
                      <option value="Tigrinya">Tigrinya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Previous School / Notes</label>
                    <input
                      type="text"
                      name="previous_school"
                      value={formData.previous_school}
                      onChange={handleFormChange}
                      placeholder="School name (optional)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Account Type Block based on Age */}
              {calculatedAge !== null && calculatedAge >= 5 && calculatedAge <= 9 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-900 font-extrabold text-sm">
                    <MdChildCare className="text-xl text-purple-600" />
                    <span>Ages 5–9: Parent-Managed Child (Pending Admin Review)</span>
                  </div>
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Because your child is <strong>{calculatedAge} years old</strong>, no separate login credentials are required. Once submitted, the registration will be placed in <strong>Pending Approval</strong> for administrator review. You will be able to start learning together as soon as it is approved.
                  </p>
                </div>
              )}

              {calculatedAge !== null && calculatedAge >= 10 && calculatedAge <= 12 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
                      <MdSchool className="text-xl text-blue-600" />
                      <span>Ages 10–12: Independent Student Account</span>
                    </div>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Children aged 10–12 can sign in independently. Please provide their login email and password below. After submission, their account will be placed in <strong>Pending Approval</strong> until confirmed by an Administrator.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Child Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="student_email"
                        value={formData.student_email}
                        onChange={handleFormChange}
                        placeholder="child.name@example.com"
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Child Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleFormChange}
                          placeholder="Min. 8 characters"
                          required
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleFormChange}
                          placeholder="Repeat password"
                          required
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Submitting Request...' : 'Submit for Admin Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
