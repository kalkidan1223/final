import { useEffect, useState, useCallback, useRef } from 'react';
import { MdGroups, MdSearch, MdRefresh, MdAdd, MdPerson, MdPause, MdPlayArrow, MdStar, MdEdit } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import FormField, { inputClass } from '../../components/FormField';
import axiosClient from '../../api/axiosClient';

const PAGE_SIZE = 12;
const EMPTY_FORM = { 
  full_name: '', 
  email: '', 
  phone: '', 
  password: '', 
  qualification: '', 
  specialty: '', 
  bio: '',
  assigned_age_groups: [], // New: Array of age group IDs
  assigned_courses: []      // New: Array of course IDs
};

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

function validate(form) {
  const errors = {};
  if (!form.full_name.trim() || form.full_name.trim().length < 2) errors.full_name = 'Full name required (min 2 chars)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Valid email required';
  if (!/^\d{10,15}$/.test(form.phone)) errors.phone = 'Phone: 10–15 digits only';
  if (form.password && (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))) errors.password = 'Min 8 chars, one letter + one number';
  if (!form.qualification.trim()) errors.qualification = 'Qualification required';
  if (!form.specialty.trim()) errors.specialty = 'Specialty required';
  if (form.bio.trim() && form.bio.trim().length < 10) errors.bio = 'Bio must be ≥ 10 chars if provided';
  return errors;
}

function EditAssignmentsModal({ instructor, onClose, onSave, ageGroups, allCourses, loadingOptions }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Edit Assignments</h3>
            <p className="text-sm text-slate-500">{instructor.full_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        
        <div className="p-6 space-y-6">
          {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {/* Age Groups */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Assigned Age Groups
              <span className="block text-xs font-normal text-slate-400 mt-1">Select the age groups this instructor can teach</span>
            </label>
            {loadingOptions ? (
              <div className="text-sm text-slate-400">Loading age groups...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ageGroups.map(ag => (
                  <label key={ag.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${assignedAgeGroups.includes(ag.id) ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={assignedAgeGroups.includes(ag.id)}
                      onChange={(e) => {
                        setAssignedAgeGroups(prev => 
                          e.target.checked 
                            ? [...prev, ag.id]
                            : prev.filter(id => id !== ag.id)
                        );
                      }}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm font-medium">{ag.name} ({ag.min_age}-{ag.max_age} years)</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Courses */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Assigned Courses
              <span className="block text-xs font-normal text-slate-400 mt-1">Select established courses this instructor can teach</span>
            </label>
            {loadingCourses ? (
              <div className="text-sm text-slate-400">Loading available courses...</div>
            ) : assignedAgeGroups.length === 0 ? (
              <div className="text-sm text-slate-400 bg-amber-50 border border-amber-200 rounded-lg p-4">
                ⚠️ Please select age groups first. Courses are specific to age groups.
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="text-sm text-slate-400 bg-blue-50 border border-blue-200 rounded-lg p-4">
                ℹ️ No courses have been established for the selected age groups yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {availableCourses.map(course => (
                  <label key={course.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${assignedCourses.includes(course.available_course_id) ? 'bg-violet-50 border-violet-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={assignedCourses.includes(course.available_course_id)}
                      onChange={(e) => {
                        setAssignedCourses(prev =>
                          e.target.checked 
                            ? [...prev, course.available_course_id]
                            : prev.filter(id => id !== course.available_course_id)
                        );
                      }}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${assignedCourses.includes(course.available_course_id) ? 'text-violet-700' : 'text-slate-700'}`}>
                        {course.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {ageGroups.find(ag => ag.id === course.age_group_id)?.name || 'Unknown age group'}
                        {course.description && ` • ${course.description}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={handleSave} disabled={saving} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-60 transition">
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef(null);
  
  // New: For course and age group selection
  const [ageGroups, setAgeGroups] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Load age groups and courses when form is shown OR when editing
  useEffect(() => {
    if (showForm || editInst) {
      loadOptions();
    }
  }, [showForm, editInst]);

  async function loadOptions() {
    setLoadingOptions(true);
    try {
      const ageGroupsRes = await axiosClient.get('/age-groups');
      setAgeGroups(ageGroupsRes.data.age_groups || []);
      // Don't load courses here - they'll be loaded per age group
      setAllCourses([]);
    } catch (err) {
      console.error('Failed to load options:', err);
      setError('Failed to load age groups');
    } finally {
      setLoadingOptions(false);
    }
  }

  // Load available courses when age groups are selected
  useEffect(() => {
    async function loadAvailableCoursesForSelectedAgeGroups() {
      if (form.assigned_age_groups.length === 0) {
        setAllCourses([]);
        return;
      }

      setLoadingOptions(true);
      try {
        // Fetch available courses for each selected age group
        const coursePromises = form.assigned_age_groups.map(ageGroupId =>
          axiosClient.get(`/admin/age-groups/${ageGroupId}/available-courses`)
        );
        const responses = await Promise.all(coursePromises);
        
        // Combine all available courses from all selected age groups
        const allAvailableCourses = responses.flatMap((res, idx) => 
          (res.data.available_courses || [])
            .filter(c => c.is_active)
            .map(c => ({
              id: `${form.assigned_age_groups[idx]}_${c.id}`, // Unique ID combining age group and course
              age_group_id: form.assigned_age_groups[idx],
              title: c.course_title,
              description: c.course_description,
              available_course_id: c.id
            }))
        );
        setAllCourses(allAvailableCourses);
      } catch (err) {
        console.error('Failed to load available courses:', err);
      } finally {
        setLoadingOptions(false);
      }
    }

    if (showForm || editInst) {
      loadAvailableCoursesForSelectedAgeGroups();
    }
  }, [form.assigned_age_groups, showForm, editInst]);

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

  async function handleCreate(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/instructors', { ...form, email: form.email.toLowerCase().trim(), full_name: form.full_name.trim(), qualification: form.qualification.trim(), specialty: form.specialty.trim(), bio: form.bio.trim() || undefined });
      setSuccess('Instructor account created');
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
      loadInstructors(true);
    } catch (err) {
      const apiErrs = err.response?.data?.errors || [err.response?.data?.error || 'Failed to create'];
      setError(apiErrs.join('. '));
    } finally { setSubmitting(false); }
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
              <p className="text-sm text-slate-500">Create and manage instructor accounts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadInstructors(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              <MdRefresh className={refreshing ? 'animate-spin' : ''} />Refresh
            </button>
            <button onClick={() => { setShowForm(v => !v); setError(''); setFieldErrors({}); }} className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm font-semibold transition">
              <MdAdd />{showForm ? 'Cancel' : 'Add Instructor'}
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex justify-between">{error}<button onClick={() => setError('')}>&times;</button></div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-800">New Instructor Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required error={fieldErrors.full_name}>
                <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} placeholder="Sara Bekele" className={inputClass(fieldErrors.full_name)} />
              </FormField>
              <FormField label="Email" required error={fieldErrors.email}>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="teacher@school.edu" className={inputClass(fieldErrors.email)} />
              </FormField>
              <FormField label="Phone" required error={fieldErrors.phone} hint="10–15 digits">
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value.replace(/\D/g,'')}))} placeholder="0912345678" className={inputClass(fieldErrors.phone)} />
              </FormField>
              <FormField label="Temporary Password" required error={fieldErrors.password} hint="Min 8 chars, letter + number">
                <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Teacher@123" className={inputClass(fieldErrors.password)} />
              </FormField>
              <FormField label="Qualification" required error={fieldErrors.qualification}>
                <input value={form.qualification} onChange={e => setForm(f => ({...f, qualification: e.target.value}))} placeholder="B.Ed. Primary Education" className={inputClass(fieldErrors.qualification)} />
              </FormField>
              <FormField label="Teaching Specialty" required error={fieldErrors.specialty}>
                <input value={form.specialty} onChange={e => setForm(f => ({...f, specialty: e.target.value}))} placeholder="Mathematics, English…" className={inputClass(fieldErrors.specialty)} />
              </FormField>
              <FormField label="Bio" error={fieldErrors.bio} className="sm:col-span-2">
                <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} placeholder="Optional teacher background…" className={`${inputClass(fieldErrors.bio)} resize-y`} />
              </FormField>

              {/* Age Groups Assignment */}
              <FormField label="Assigned Age Groups" className="sm:col-span-2" hint="Select the age groups this instructor can teach">
                {loadingOptions ? (
                  <div className="text-sm text-slate-400">Loading age groups...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {ageGroups.map(ag => (
                      <label key={ag.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${form.assigned_age_groups.includes(ag.id) ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          checked={form.assigned_age_groups.includes(ag.id)}
                          onChange={(e) => {
                            setForm(f => ({
                              ...f,
                              assigned_age_groups: e.target.checked 
                                ? [...f.assigned_age_groups, ag.id]
                                : f.assigned_age_groups.filter(id => id !== ag.id)
                            }));
                          }}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm font-medium">{ag.name} ({ag.min_age}-{ag.max_age} years)</span>
                      </label>
                    ))}
                  </div>
                )}
              </FormField>

              {/* Courses Assignment */}
              <FormField label="Assigned Courses" className="sm:col-span-2" hint="Select established courses this instructor can teach">
                {loadingOptions ? (
                  <div className="text-sm text-slate-400">Loading available courses...</div>
                ) : form.assigned_age_groups.length === 0 ? (
                  <div className="text-sm text-slate-400 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    ⚠️ Please select age groups first. Courses are specific to age groups.
                  </div>
                ) : allCourses.length === 0 ? (
                  <div className="text-sm text-slate-400 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    ℹ️ No courses have been established for the selected age groups yet.
                    <br />
                    <span className="text-xs">Go to <strong>Age Groups</strong> page and click <strong>"Establish Courses"</strong> to define available courses first.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3">
                    {allCourses.map(course => (
                      <label key={course.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${form.assigned_courses.includes(course.available_course_id) ? 'bg-violet-50 border-violet-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          checked={form.assigned_courses.includes(course.available_course_id)}
                          onChange={(e) => {
                            setForm(f => ({
                              ...f,
                              assigned_courses: e.target.checked 
                                ? [...f.assigned_courses, course.available_course_id]
                                : f.assigned_courses.filter(id => id !== course.available_course_id)
                            }));
                          }}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${form.assigned_courses.includes(course.available_course_id) ? 'text-violet-700' : 'text-slate-700'}`}>
                            {course.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {ageGroups.find(ag => ag.id === course.age_group_id)?.name || 'Unknown age group'}
                            {course.description && ` • ${course.description}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </FormField>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-60 transition">
                {submitting ? 'Creating…' : 'Create Instructor'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFieldErrors({}); }} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            </div>
          </form>
        )}

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
            <p className="text-slate-500 mb-4">No instructors found</p>
            <button onClick={() => setShowForm(true)} className="rounded-xl bg-violet-600 text-white px-5 py-2 text-sm font-semibold hover:bg-violet-700 transition">Add first instructor</button>
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
          allCourses={allCourses}
          loadingOptions={loadingOptions}
        />
      )}
    </AdminLayout>
  );
}
