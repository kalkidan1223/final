import { useEffect, useState, useCallback, useRef } from 'react';
import { MdGroups, MdSearch, MdRefresh, MdPerson, MdPause, MdPlayArrow, MdStar, MdEdit, MdNavigateNext } from 'react-icons/md';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 12;

function StatusBadge({ isActive }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function ViewModal({ instructor, onClose }) {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    axiosClient.get(`/admin/courses?instructor_id=${instructor.id}`)
      .then(({ data }) => setCourses(data.courses || []))
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, [instructor.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg">{instructor.full_name?.[0] || 'I'}</div>
            <div>
              <h3 className="font-semibold text-slate-800">{instructor.full_name}</h3>
              <p className="text-xs text-slate-500">{instructor.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-5">
          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Professional Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Full Name', instructor.full_name],
                ['Email', instructor.email],
                ['Phone', instructor.phone || '—'],
                ['Status', <StatusBadge key="s" isActive={instructor.is_active} />],
                ['Qualification', instructor.qualification || '—'],
                ['Specialty', instructor.specialty || '—'],
                ['Joined', new Date(instructor.created_at).toLocaleDateString()],
                ['Last Login', instructor.last_login_at ? new Date(instructor.last_login_at).toLocaleDateString() : 'Never'],
              ].map(([label, val]) => (
                <div key={label}><p className="text-xs text-slate-400 mb-0.5">{label}</p><p className="text-slate-700">{val || '—'}</p></div>
              ))}
            </div>
            {instructor.bio && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">Bio</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{instructor.bio}</p>
              </div>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Assigned Courses ({courses.length})</h4>
            {loadingCourses ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : courses.length === 0 ? (
              <p className="text-sm text-slate-400">No courses assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {courses.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{c.title}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === 'published' ? 'bg-emerald-100 text-emerald-700' : c.status === 'draft' ? 'bg-slate-100 text-slate-500' : 'bg-violet-100 text-violet-600'}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EditAssignmentsModal({ instructor, onClose, onSave, ageGroups }) {
  const [assignedAgeGroups, setAssignedAgeGroups] = useState(
    instructor.assigned_age_groups?.map(ag => ag.id) || []
  );
  const [assignedCourses, setAssignedCourses] = useState(
    instructor.assigned_courses?.map(c => c.id) || []
  );
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load available courses when age groups change
  useEffect(() => {
    async function loadAvailableCoursesForSelectedAgeGroups() {
      if (assignedAgeGroups.length === 0) {
        setAvailableCourses([]);
        return;
      }

      setLoadingCourses(true);
      try {
        const coursePromises = assignedAgeGroups.map(ageGroupId =>
          axiosClient.get(`/admin/age-groups/${ageGroupId}/available-courses`)
        );
        const responses = await Promise.all(coursePromises);
        
        const allAvailableCourses = responses.flatMap((res, idx) => 
          (res.data.available_courses || [])
            .filter(c => c.is_active)
            .map(c => ({
              id: `${assignedAgeGroups[idx]}_${c.id}`,
              age_group_id: assignedAgeGroups[idx],
              title: c.course_title,
              description: c.course_description,
              available_course_id: c.id
            }))
        );
        setAvailableCourses(allAvailableCourses);
      } catch (err) {
        console.error('Failed to load available courses:', err);
      } finally {
        setLoadingCourses(false);
      }
    }

    loadAvailableCoursesForSelectedAgeGroups();
  }, [assignedAgeGroups]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave(instructor.id, { assigned_age_groups: assignedAgeGroups, assigned_courses: assignedCourses });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update assignments');
    } finally {
      setSaving(false);
    }
  }

  const toggleAgeGroup = (groupId) => {
    setAssignedAgeGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleCourse = (courseId) => {
    setAssignedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Edit Assignments: {instructor.full_name}</h3>
            <p className="text-xs text-slate-500">Assign age groups and courses to this instructor</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Age Groups Selection */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Assigned Age Groups</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ageGroups?.map(group => {
                const isSelected = assignedAgeGroups.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleAgeGroup(group.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition ${
                      isSelected
                        ? 'border-violet-600 bg-violet-50 text-violet-900 font-medium'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded text-violet-600 focus:ring-violet-500"
                    />
                    <span className="truncate">{group.name || group.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Courses */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Available Courses {loadingCourses && <span className="text-xs font-normal text-slate-400">(Loading...)</span>}
            </h4>
            {assignedAgeGroups.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 p-4 rounded-xl text-center">
                Select one or more age groups to view and assign courses.
              </p>
            ) : availableCourses.length === 0 && !loadingCourses ? (
              <p className="text-sm text-slate-400 bg-slate-50 p-4 rounded-xl text-center">
                No courses found for the selected age groups.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableCourses.map(course => {
                  const isSelected = assignedCourses.includes(course.available_course_id || course.id);
                  return (
                    <div
                      key={course.id}
                      onClick={() => toggleCourse(course.available_course_id || course.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-violet-600 bg-violet-50 text-violet-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mt-1 rounded text-violet-600 focus:ring-violet-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{course.title}</p>
                        {course.description && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{course.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewInst, setViewInst] = useState(null);
  const [editInst, setEditInst] = useState(null);
  const debounce = useRef(null);
  
  // For edit assignments modal
  const [ageGroups, setAgeGroups] = useState([]);

  // Load age groups and courses when editing
  useEffect(() => {
    if (editInst) {
      loadOptions();
    }
  }, [editInst]);

  async function loadOptions() {
    try {
      const ageGroupsRes = await axiosClient.get('/age-groups');
      setAgeGroups(ageGroupsRes.data.age_groups || []);
    } catch (err) {
      console.error('Failed to load options:', err);
      setError('Failed to load age groups');
    }
  }

  const loadInstructors = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (activeFilter) params.set('is_active', activeFilter);
      params.set('limit', '200');
      const { data } = await axiosClient.get(`/admin/instructors?${params}`);
      let all = data.instructors || [];
      if (search) {
        const q = search.toLowerCase();
        all = all.filter(i => i.full_name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) || i.specialty?.toLowerCase().includes(q));
      }
      setTotal(all.length);
      setInstructors(all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, search, page]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadInstructors(); }, 350);
    return () => clearTimeout(debounce.current);
  }, [search, activeFilter]);

  useEffect(() => { loadInstructors(); }, [page]);

  async function handleToggle(id, isActive) {
    try {
      await axiosClient.patch(`/admin/instructors/${id}/${isActive ? 'deactivate' : 'activate'}`);
      setSuccess(isActive ? 'Instructor deactivated' : 'Instructor activated');
      setTimeout(() => setSuccess(''), 2500);
      loadInstructors(true);
    } catch (err) { setError(err.response?.data?.error || 'Action failed'); }
  }

  async function handleEditAssignments(instructorId, assignments) {
    try {
      await axiosClient.patch(`/admin/instructors/${instructorId}/assignments`, assignments);
      setSuccess('Instructor assignments updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadInstructors(true);
    } catch (err) {
      throw err; // Let the modal handle the error
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600 p-2.5"><MdGroups className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Instructors</h1>
              <p className="text-sm text-slate-500">Manage approved instructor accounts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadInstructors(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              <MdRefresh className={refreshing ? 'animate-spin' : ''} />Refresh
            </button>
            <Link to="/admin/approval" className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-semibold transition">
              Approve Instructors
            </Link>
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex justify-between">{error}<button onClick={() => setError('')}>&times;</button></div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Search + Filter */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by name, email, specialty…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
          </div>
          {[{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }].map(o => (
            <button key={o.v} onClick={() => { setActiveFilter(o.v); setPage(1); }}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${activeFilter === o.v ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {o.l}
            </button>
          ))}
          <p className="w-full text-xs text-slate-400">{total} instructor{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-48 animate-pulse" />)}
          </div>
        ) : instructors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <MdGroups className="text-5xl text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 mb-2">No instructors found</p>
            <p className="text-sm text-slate-400 mb-4">Instructors must be approved through the Admin Approvals page.</p>
            <Link to="/admin/approval" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white px-5 py-2 text-sm font-semibold hover:bg-amber-600 transition">
              Go to Approvals <MdNavigateNext />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {instructors.map(inst => (
              <div key={inst.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold flex-shrink-0">
                      {inst.full_name?.[0] || 'I'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{inst.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{inst.email}</p>
                    </div>
                  </div>
                  <StatusBadge isActive={inst.is_active} />
                </div>
                <div className="space-y-1.5 text-sm text-slate-600 flex-1">
                  {inst.qualification && <p className="truncate"><span className="font-medium text-slate-500">Qual:</span> {inst.qualification}</p>}
                  {inst.specialty && (
                    <p className="flex items-center gap-1"><MdStar className="text-amber-400 flex-shrink-0" /><span className="truncate">{inst.specialty}</span></p>
                  )}
                  {inst.phone && <p className="text-xs text-slate-400">{inst.phone}</p>}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                  <button onClick={() => setViewInst(inst)} className="flex-1 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-600 py-1.5 text-xs font-medium transition flex items-center justify-center gap-1">
                    <MdPerson className="text-sm" /> View
                  </button>
                  <button onClick={() => setEditInst(inst)} className="flex-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 py-1.5 text-xs font-medium transition flex items-center justify-center gap-1">
                    <MdEdit className="text-sm" /> Edit
                  </button>
                  <button onClick={() => handleToggle(inst.id, inst.is_active)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition flex items-center justify-center gap-1 ${inst.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                    {inst.is_active ? <><MdPause className="text-sm" />Deactivate</> : <><MdPlayArrow className="text-sm" />Activate</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
      {viewInst && <ViewModal instructor={viewInst} onClose={() => setViewInst(null)} />}
      {editInst && (
        <EditAssignmentsModal 
          instructor={editInst} 
          onClose={() => setEditInst(null)} 
          onSave={handleEditAssignments}
          ageGroups={ageGroups}
        />
      )}
    </AdminLayout>
  );
}
