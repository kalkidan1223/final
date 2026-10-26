import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import AdminLayout from '../../components/AdminLayout';
import {
  MdSchool,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdCancel,
  MdSave,
} from 'react-icons/md';

export default function AdminGradeLevels() {
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level_type: 'kindergarten',
    sequence_order: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchGradeLevels();
    fetchSubjects();
  }, []);

  async function fetchGradeLevels() {
    try {
      setLoading(true);
      const res = await axiosClient.get('/admin/grades');
      setGradeLevels(res.data.grade_levels || []);
    } catch (err) {
      console.error('Failed to fetch grade levels:', err);
      setError('Failed to load grade levels');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubjects() {
    try {
      const res = await axiosClient.get('/subjects');
      setSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  }

  const handleAdd = () => {
    setFormData({
      code: '',
      name: '',
      level_type: 'kindergarten',
      sequence_order: '',
      description: '',
      is_active: true,
    });
    setShowAddModal(true);
  };

  const handleEdit = (grade) => {
    setEditingGrade(grade);
    setFormData({
      code: grade.code,
      name: grade.name,
      level_type: grade.level_type,
      sequence_order: grade.sequence_order,
      description: grade.description || '',
      is_active: grade.is_active,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (gradeId) => {
    if (!window.confirm('Are you sure you want to delete this grade level? This action cannot be undone.')) {
      return;
    }

    try {
      await axiosClient.delete(`/grades/${gradeId}`);
      setSuccess('Grade level deleted successfully');
      fetchGradeLevels();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete grade level');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (editingGrade) {
        await axiosClient.put(`/grades/${editingGrade.id}`, formData);
        setSuccess('Grade level updated successfully');
      } else {
        await axiosClient.post('/grades', formData);
        setSuccess('Grade level created successfully');
      }
      fetchGradeLevels();
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingGrade(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save grade level');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (grade) => {
    try {
      await axiosClient.put(`/grades/${grade.id}`, { ...grade, is_active: !grade.is_active });
      setSuccess(`Grade level ${grade.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchGradeLevels();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update grade level');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdSchool className="text-3xl text-blue-600" />
            <span>Grade Levels</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage grade levels (KG1, KG2, Grade 1-6) for curriculum organization
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
        >
          <MdAdd className="text-xl" />
          <span>Add Grade Level</span>
        </button>
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

      {/* Grade Levels Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading grade levels...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Sequence</th>
                  <th className="px-6 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gradeLevels.map((grade) => (
                  <tr key={grade.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{grade.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{grade.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        grade.level_type === 'kindergarten'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {grade.level_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{grade.sequence_order}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(grade)}
                        className={`px-2 py-1 rounded-full text-xs font-bold transition ${
                          grade.is_active
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {grade.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(grade)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <MdEdit className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDelete(grade.id)}
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

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900">
                {editingGrade ? 'Edit Grade Level' : 'Add Grade Level'}
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
                    placeholder="e.g., KG1, GRADE_1"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sequence Order *</label>
                  <input
                    type="number"
                    value={formData.sequence_order}
                    onChange={(e) => setFormData({ ...formData, sequence_order: parseInt(e.target.value) })}
                    placeholder="e.g., 1, 2, 3"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Kindergarten 1, Grade 1"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Level Type *</label>
                <select
                  value={formData.level_type}
                  onChange={(e) => setFormData({ ...formData, level_type: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="kindergarten">Kindergarten</option>
                  <option value="primary">Primary School</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of this grade level"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingGrade(null);
                  }}
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
                      <span>{editingGrade ? 'Update' : 'Create'}</span>
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
