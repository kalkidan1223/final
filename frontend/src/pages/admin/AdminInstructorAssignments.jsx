import { useEffect, useState } from 'react';
import {
  MdAssignment, MdAdd, MdDelete, MdEdit, MdSearch,
  MdSchool, MdClose, MdSave, MdInfoOutline, MdRefresh
} from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

/* ─── Helpers ─── */
const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  archived: 'bg-amber-100 text-amber-700 border-amber-200',
};

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <p className="text-slate-700 font-medium mb-5 text-center">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-5 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold">Delete</button>
        </div>
      </div>
    </div>
  );
}

function AssignmentFormModal({ existing, instructors, courses, ageGroups, academicYears, onSave, onClose }) {
  const [form, setForm] = useState({
    instructor_id:    existing?.instructor_id || '',
    course_id:        existing?.course_id || '',
    age_group_id:     existing?.age_group_id || '',
    academic_year_id: existing?.academic_year_id || '',
    grade:            existing?.grade || '',
    section:          existing?.section || '',
    status:           existing?.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">
            {existing ? 'Edit Assignment' : 'New Instructor Assignment'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><MdClose className="text-xl" /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">⚠️ {error}</div>
          )}

          {/* Instructor select */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Instructor <span className="text-red-500">*</span></label>
            <select
              required
              value={form.instructor_id}
              onChange={e => update('instructor_id', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select instructor…</option>
              {instructors.map(i => (
                <option key={i.instructor_id} value={i.instructor_id}>{i.full_name} — {i.email}</option>
              ))}
            </select>
          </div>

          {/* Course select */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Course <span className="text-red-500">*</span></label>
            <select
              required
              value={form.course_id}
              onChange={e => update('course_id', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select course…</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Age group select */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Age Group <span className="text-red-500">*</span></label>
            <select
              required
              value={form.age_group_id}
              onChange={e => update('age_group_id', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select age group…</option>
              {ageGroups.map(ag => (
                <option key={ag.id} value={ag.id}>{ag.name} ({ag.min_age}–{ag.max_age} yrs)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Grade */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Grade</label>
              <input
                value={form.grade}
                onChange={e => update('grade', e.target.value)}
                placeholder="e.g. Grade 1"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Section</label>
              <input
                value={form.section}
                onChange={e => update('section', e.target.value)}
                placeholder="e.g. A, B"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Academic Year</label>
              <select
                value={form.academic_year_id}
                onChange={e => update('academic_year_id', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="">—</option>
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>{ay.label} {ay.is_current ? '(Current)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => update('status', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
              <MdSave /> {saving ? 'Saving…' : existing ? 'Update' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function AdminInstructorAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError]             = useState('');

  // Lookup data
  const [instructors, setInstructors]   = useState([]);
  const [courses, setCourses]           = useState([]);
  const [ageGroups, setAgeGroups]       = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [aRes, iRes, cRes, agRes, ayRes] = await Promise.all([
        axiosClient.get('/admin/instructor-assignments'),
        axiosClient.get('/admin/instructors'),
        axiosClient.get('/admin/courses'),
        axiosClient.get('/admin/age-groups'),
        axiosClient.get('/admin/academic-years').catch(() => ({ data: { academic_years: [] } })),
      ]);
      setAssignments(aRes.data.assignments || []);
      setInstructors(iRes.data.instructors || []);
      setCourses(cRes.data.courses || []);
      setAgeGroups(agRes.data.age_groups || []);
      setAcademicYears(ayRes.data.academic_years || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(form) {
    if (editing) {
      const { data } = await axiosClient.patch(`/admin/instructor-assignments/${editing.id}`, form);
      setAssignments(prev => prev.map(a => a.id === editing.id ? data.assignment : a));
    } else {
      const { data } = await axiosClient.post('/admin/instructor-assignments', form);
      // Reload to get full join data
      loadAll();
    }
  }

  async function handleDelete(id) {
    await axiosClient.delete(`/admin/instructor-assignments/${id}`);
    setAssignments(prev => prev.filter(a => a.id !== id));
    setConfirmDelete(null);
  }

  const filtered = assignments.filter(a => {
    const matchSearch = !search ||
      a.instructor_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.course_title?.toLowerCase().includes(search.toLowerCase()) ||
      a.age_group_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:      assignments.length,
    active:   assignments.filter(a => a.status === 'active').length,
    inactive: assignments.filter(a => a.status === 'inactive').length,
    archived: assignments.filter(a => a.status === 'archived').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <MdAssignment className="text-indigo-600" /> Instructor Assignments
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Assign instructors to specific courses, age groups, grades, and sections.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
              title="Refresh"
            >
              <MdRefresh className="text-xl" />
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition shadow-lg"
            >
              <MdAdd className="text-lg" /> New Assignment
            </button>
          </div>
        </div>

        {/* Info notice */}
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 flex items-start gap-3 text-sm text-indigo-700">
          <MdInfoOutline className="text-indigo-500 text-lg flex-shrink-0 mt-0.5" />
          <p>
            Assignments control which instructor can access which course workspace. An instructor
            only sees students, lessons, and activities within their assigned course, age group,
            grade, and section.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">⚠️ {error}</div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by instructor, course, or age group…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex gap-2">
            {Object.entries(counts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filterStatus === status ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <MdSchool className="text-5xl text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">
                {assignments.length === 0 ? 'No Assignments Yet' : 'No Results Found'}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {assignments.length === 0
                  ? 'Click "New Assignment" to assign an instructor to a course.'
                  : 'Try a different search or filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Instructor', 'Course', 'Age Group', 'Grade / Sec', 'Academic Year', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-800">{a.instructor_name}</p>
                          <p className="text-xs text-slate-400">{a.instructor_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{a.course_title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium border border-indigo-100">
                          {a.age_group_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.grade ? `Grade ${a.grade}` : '—'}
                        {a.section ? ` · Sec ${a.section}` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{a.academic_year || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[a.status] || STATUS_COLORS.inactive}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditing(a); setShowForm(true); }}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition"
                            title="Edit"
                          >
                            <MdEdit className="text-base" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(a)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                            title="Delete"
                          >
                            <MdDelete className="text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <AssignmentFormModal
          existing={editing}
          instructors={instructors}
          courses={courses}
          ageGroups={ageGroups}
          academicYears={academicYears}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmModal
          message={`Remove "${confirmDelete.instructor_name}" from "${confirmDelete.course_title}"?`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AdminLayout>
  );
}
