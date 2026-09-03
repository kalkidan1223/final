import { useEffect, useState } from 'react';
import { MdAdd, MdClose, MdDelete, MdEdit, MdSchool } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

function EstablishCoursesModal({ ageGroup, onClose, onSave }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState({ course_title: '', course_description: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/admin/age-groups/${ageGroup.id}/available-courses`);
      setCourses(data.available_courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCourse(e) {
    e.preventDefault();
    if (!newCourse.course_title.trim()) return;
    
    setAdding(true);
    setError('');
    try {
      const { data } = await axiosClient.post(
        `/admin/age-groups/${ageGroup.id}/available-courses`,
        newCourse
      );
      setCourses(prev => [...prev, data.available_course]);
      setNewCourse({ course_title: '', course_description: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add course');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteCourse(courseId) {
    if (!window.confirm('Remove this course from this age group?')) return;
    try {
      await axiosClient.delete(`/admin/age-groups/${ageGroup.id}/available-courses/${courseId}`);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleActive(course) {
    try {
      const { data } = await axiosClient.patch(
        `/admin/age-groups/${ageGroup.id}/available-courses/${course.id}`,
        { is_active: !course.is_active }
      );
      setCourses(prev => prev.map(c => c.id === course.id ? data.available_course : c));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <MdSchool className="text-violet-600" />
              Establish Courses for {ageGroup.name}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Define which courses are available for this age group ({ageGroup.min_age}-{ageGroup.max_age} years)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            <MdClose />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Course Form */}
          <form onSubmit={handleAddCourse} className="bg-violet-50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-violet-900">Add New Course</h4>
            <input
              type="text"
              placeholder="Course title (e.g., 'Amharic Basics', 'English Reading')"
              value={newCourse.course_title}
              onChange={e => setNewCourse(prev => ({ ...prev, course_title: e.target.value }))}
              className="w-full rounded-lg border border-violet-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              required
            />
            <textarea
              placeholder="Course description (optional)"
              value={newCourse.course_description}
              onChange={e => setNewCourse(prev => ({ ...prev, course_description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-violet-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={adding || !newCourse.course_title.trim()}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              <MdAdd /> {adding ? 'Adding...' : 'Add Course'}
            </button>
          </form>

          {/* Existing Courses List */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Established Courses ({courses.length})
            </h4>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No courses established yet for this age group.
                <br />
                Add courses above to define what this age group can learn.
              </div>
            ) : (
              <div className="space-y-2">
                {courses.map(course => (
                  <div key={course.id} className={`flex items-start justify-between gap-3 rounded-xl border p-4 transition ${course.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-slate-800 truncate">{course.course_title}</h5>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${course.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {course.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {course.course_description && (
                        <p className="text-sm text-slate-500 mt-1">{course.course_description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(course)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${course.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        title={course.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {course.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 p-1.5 transition"
                        title="Delete"
                      >
                        <MdDelete className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => { onSave(); onClose(); }}
            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 text-sm font-semibold transition"
          >
            Done
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAgeGroups() {
  const [ageGroups, setAgeGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [establishingCourses, setEstablishingCourses] = useState(null);
  const [form, setForm] = useState({ name: '', min_age: '', max_age: '', requires_account: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadAgeGroups() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/admin/age-groups');
      setAgeGroups(data.age_groups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAgeGroups(); }, []);

  function resetForm() {
    setForm({ name: '', min_age: '', max_age: '', requires_account: false });
    setEditing(null);
    setShowForm(false);
    setError('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/age-groups', {
        ...form,
        min_age: Number(form.min_age),
        max_age: Number(form.max_age),
      });
      resetForm();
      loadAgeGroups();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create age group');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.put(`/admin/age-groups/${editing}`, {
        ...form,
        min_age: Number(form.min_age),
        max_age: Number(form.max_age),
      });
      resetForm();
      loadAgeGroups();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update age group');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this age group?')) return;
    try {
      await axiosClient.delete(`/admin/age-groups/${id}`);
      loadAgeGroups();
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(ag) {
    setEditing(ag.id);
    setForm({
      name: ag.name,
      min_age: String(ag.min_age),
      max_age: String(ag.max_age),
      requires_account: ag.requires_account,
    });
    setShowForm(true);
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">🔢 Age Group Management</h1>
            <p className="text-slate-500 mt-1">Define age groups and whether they require a login account.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-600 transition"
          >
            + Add Age Group
          </button>
        </div>

        {showForm && (
          <form onSubmit={editing ? handleUpdate : handleCreate} className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              {editing ? 'Edit Age Group' : 'Create Age Group'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                required
                placeholder="Name (e.g. 5-7)"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-base"
              />
              <input
                required
                type="number"
                placeholder="Min age"
                value={form.min_age}
                onChange={(e) => setForm((f) => ({ ...f, min_age: e.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-base"
              />
              <input
                required
                type="number"
                placeholder="Max age"
                value={form.max_age}
                onChange={(e) => setForm((f) => ({ ...f, max_age: e.target.value }))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-base"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.requires_account}
                  onChange={(e) => setForm((f) => ({ ...f, requires_account: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Requires Account
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-violet-500 px-5 py-2.5 font-semibold text-white hover:bg-violet-600 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading age groups…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ageGroups.map((ag) => (
              <div key={ag.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-800">{ag.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${ag.requires_account ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {ag.requires_account ? 'Needs Account' : 'Parent-managed'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-4">Ages {ag.min_age} – {ag.max_age}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEstablishingCourses(ag)}
                    className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 flex items-center gap-1"
                  >
                    <MdSchool className="text-sm" /> Establish Courses
                  </button>
                  <button
                    onClick={() => startEdit(ag)}
                    className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                  >
                    <MdEdit className="inline text-sm" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ag.id)}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  >
                    <MdDelete className="inline text-sm" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {ageGroups.length === 0 && (
              <p className="col-span-full text-center text-slate-500 py-10">No age groups defined yet.</p>
            )}
          </div>
        )}
      </div>
      {establishingCourses && (
        <EstablishCoursesModal
          ageGroup={establishingCourses}
          onClose={() => setEstablishingCourses(null)}
          onSave={() => loadAgeGroups()}
        />
      )}
    </AdminLayout>
  );
}