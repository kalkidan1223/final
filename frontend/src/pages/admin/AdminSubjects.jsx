import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/AdminLayout';
import {
  MdMenuBook,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdCancel,
  MdSave,
  MdSchool,
} from 'react-icons/md';

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    language: 'English',
    is_active: true,
  });

  const [assignmentData, setAssignmentData] = useState({
    subject_id: null,
    grade_level_id: null,
  });

  useEffect(() => {
    fetchSubjects();
    fetchGradeLevels();
    fetchAssignments();
  }, []);

  async function fetchSubjects() {
    try {
      setLoading(true);
      const res = await axiosClient.get('/subjects');
      setSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGradeLevels() {
    try {
      const res = await axiosClient.get('/grades');
      setGradeLevels(res.data.grade_levels || []);
    } catch (err) {
      console.error('Failed to fetch grade levels:', err);
    }
  }

  async function fetchAssignments() {
    try {
      const res = await axiosClient.get('/subject-grade-assignments');
      setAssignments(res.data.assignments || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }

  const handleAdd = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      language: 'English',
      is_active: true,
    });
    setShowAddModal(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      description: subject.description || '',
      language: subject.language || 'English',
      is_active: subject.is_active,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    try {
      await axiosClient.delete(`/subjects/${subjectId}`);
      setSuccess('Subject deleted successfully');
      fetchSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete subject');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (editingSubject) {
        await axiosClient.put(`/subjects/${editingSubject.id}`, formData);
        setSuccess('Subject updated successfully');
      } else {
        await axiosClient.post('/subjects', formData);
        setSuccess('Subject created successfully');
      }
      fetchSubjects();
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingSubject(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save subject');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (subject) => {
    try {
      await axiosClient.put(`/subjects/${subject.id}`, { ...subject, is_active: !subject.is_active });
      setSuccess(`Subject ${subject.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update subject');
    }
  };

  const handleAssignGrade = () => {
    setAssignmentData({ subject_id: null, grade_level_id: null });
    setShowAssignModal(true);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await axiosClient.post('/subject-grade-assignments', assignmentData);
      setSuccess('Subject assigned to grade level successfully');
      fetchAssignments();
      setShowAssignModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign subject to grade level');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      await axiosClient.delete(`/subject-grade-assignments/${assignmentId}`);
      setSuccess('Assignment removed successfully');
      fetchAssignments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove assignment');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdMenuBook className="text-3xl text-emerald-600" />
            <span>Subjects</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage subjects (Mathematics, English, Amharic, etc.) for curriculum organization
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAssignGrade}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
          >
            <MdSchool className="text-xl" />
            <span>Assign to Grade</span>
          </button>
          <button
            onClick={handleAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
          >
            <MdAdd className="text-xl" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-bold text-sm flex items-center gap-2">
          <MdCancel className="text-xl" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-bold text-sm flex items-center gap-2">
          <MdCheckCircle className="text-xl" />
          {success}
        </div>
      )}

      {/* Subjects Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading subjects...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Language</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{subject.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{subject.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{subject.language}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{subject.description || '-'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(subject)}
                        className={`px-2 py-1 rounded-full text-xs font-bold transition ${
                          subject.is_active
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <MdEdit className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <MdDelete className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject-Grade Assignments Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MdSchool className="text-xl text-blue-600" />
            <span>Subject-Grade Assignments</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Which subjects are taught in each grade level</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Grade Level</th>
                <th className="px-6 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    No assignments yet. Click "Assign to Grade" to assign subjects to grade levels.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <span className="font-bold">{assignment.subject_name}</span>
                      <span className="text-slate-400 ml-2">({assignment.subject_code})</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <span className="font-bold">{assignment.grade_level_name}</span>
                      <span className="text-slate-400 ml-2">({assignment.grade_level_code})</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove Assignment"
                      >
                        <MdDelete className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900">
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., MATH, ENG, AMH"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Language *</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="English">English</option>
                    <option value="Amharic">Amharic</option>
                    <option value="Afaan Oromo">Afaan Oromo</option>
                    <option value="Tigrinya">Tigrinya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mathematics, English, Amharic"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of this subject"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingSubject(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <MdSave className="text-lg" />
                      <span>{editingSubject ? 'Update' : 'Create'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign to Grade Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MdSchool className="text-xl text-blue-600" />
                <span>Assign Subject to Grade Level</span>
              </h2>
            </div>
            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  value={assignmentData.subject_id || ''}
                  onChange={(e) => setAssignmentData({ ...assignmentData, subject_id: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a subject</option>
                  {subjects.filter(s => s.is_active).map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grade Level *</label>
                <select
                  value={assignmentData.grade_level_id || ''}
                  onChange={(e) => setAssignmentData({ ...assignmentData, grade_level_id: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a grade level</option>
                  {gradeLevels.filter(gl => gl.is_active).map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name} ({grade.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <MdSave className="text-lg" />
                      <span>Assign</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
