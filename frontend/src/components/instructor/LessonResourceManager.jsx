import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

export default function LessonResourceManager({ lessonId, onClose }) {
  const [resources, setResources] = useState([]);
  const [availableResources, setAvailableResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLessonResources();
    fetchAvailableResources();
  }, [lessonId]);

  const fetchLessonResources = async () => {
    try {
      const response = await axiosClient.get(`/instructor/lessons/${lessonId}/resources`);
      setResources(response.data.resources || []);
    } catch (err) {
      console.error('Failed to fetch lesson resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableResources = async () => {
    try {
      const response = await axiosClient.get(`/instructor/lessons/${lessonId}/available-resources`);
      setAvailableResources(response.data);
    } catch (err) {
      console.error('Failed to fetch available resources:', err);
    }
  };

  const handleAddResource = async (resourceType, resourceId, resourceTitle) => {
    try {
      setSaving(true);
      await axiosClient.post(`/instructor/lessons/${lessonId}/resources`, {
        resource_type: resourceType,
        resource_id: resourceId,
        title: resourceTitle,
        is_required: true
      });
      
      await fetchLessonResources();
      await fetchAvailableResources();
      setShowAddModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveResource = async (resourceId) => {
    if (!confirm('Remove this resource from the learning journey?')) return;
    
    try {
      await axiosClient.delete(`/instructor/lessons/${lessonId}/resources/${resourceId}`);
      await fetchLessonResources();
      await fetchAvailableResources();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove resource');
    }
  };

  const handleToggleRequired = async (resource) => {
    try {
      await axiosClient.put(`/instructor/lessons/${lessonId}/resources/${resource.id}`, {
        is_required: !resource.is_required
      });
      await fetchLessonResources();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update resource');
    }
  };

  const handleDragEnd = async (result) => {
    // Simple move up/down instead of full drag-drop
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    
    const items = Array.from(resources);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    
    const reorderedItems = items.map((item, idx) => ({
      id: item.id,
      display_order: idx
    }));

    setResources(items);

    try {
      await axiosClient.post(`/instructor/lessons/${lessonId}/resources/reorder`, {
        resources: reorderedItems
      });
    } catch (err) {
      alert('Failed to save new order');
      fetchLessonResources();
    }
  };

  const handleMoveDown = async (index) => {
    if (index === resources.length - 1) return;
    
    const items = Array.from(resources);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    
    const reorderedItems = items.map((item, idx) => ({
      id: item.id,
      display_order: idx
    }));

    setResources(items);

    try {
      await axiosClient.post(`/instructor/lessons/${lessonId}/resources/reorder`, {
        resources: reorderedItems
      });
    } catch (err) {
      alert('Failed to save new order');
      fetchLessonResources();
    }
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'video': return '🎬';
      case 'material': return '📖';
      case 'activity': return '✏️';
      case 'quiz': return '🧠';
      default: return '📄';
    }
  };

  const getResourceLabel = (type) => {
    switch (type) {
      case 'video': return 'WATCH';
      case 'material': return 'LEARN';
      case 'activity': return 'PRACTICE';
      case 'quiz': return 'CHECK KNOWLEDGE';
      default: return 'STEP';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="text-5xl animate-spin">⚙️</div>
          <p className="mt-4 text-gray-600 font-medium">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Manage Learning Journey</h2>
          <p className="text-sm text-gray-600 font-medium mt-1">
            Drag resources to reorder • Students follow this sequence
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          ✕
        </button>
      </div>

      {/* Resource List */}
      <div className="p-6">
        {resources.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
            <div className="text-5xl mb-3">📚</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">No Resources Added Yet</h3>
            <p className="text-sm text-gray-600 mb-4">Add videos, materials, activities, and quizzes to create the learning journey</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition"
            >
              + Add First Resource
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {resources.map((resource, index) => (
                <div
                  key={resource.id}
                  className="bg-white border-2 border-gray-200 hover:border-purple-200 rounded-xl p-4 transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Move Buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xl"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === resources.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xl"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Step Number */}
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700">
                      {index + 1}
                    </div>

                    {/* Resource Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{getResourceIcon(resource.resource_type)}</span>
                        <span className="text-xs font-black text-purple-600 uppercase bg-purple-100 px-2 py-1 rounded">
                          {getResourceLabel(resource.resource_type)}
                        </span>
                        {resource.is_required ? (
                          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Optional
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-800">{resource.title || resource.resource_title}</h4>
                      {resource.description && (
                        <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleRequired(resource)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                          resource.is_required
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title={resource.is_required ? 'Make Optional' : 'Make Required'}
                      >
                        {resource.is_required ? '⚠️' : '✓'}
                      </button>
                      <button
                        onClick={() => handleRemoveResource(resource.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full mt-6 py-4 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-bold hover:bg-purple-50 transition"
            >
              + Add Another Resource
            </button>
          </>
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddModal && availableResources && (
        <AddResourceModal
          availableResources={availableResources}
          onAdd={handleAddResource}
          onClose={() => setShowAddModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ============================================
// ADD RESOURCE MODAL
// ============================================
function AddResourceModal({ availableResources, onAdd, onClose, saving }) {
  const [selectedType, setSelectedType] = useState('video');

  const getResources = () => {
    switch (selectedType) {
      case 'video': return availableResources.videos || [];
      case 'material': return availableResources.materials || [];
      case 'activity': return availableResources.activities || [];
      case 'quiz': return availableResources.quizzes || [];
      default: return [];
    }
  };

  const resources = getResources();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-800">Add Resource to Learning Journey</h3>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="border-b border-gray-200 px-6 py-3 flex gap-2 overflow-x-auto">
          {[
            { type: 'video', label: 'Videos', icon: '🎬' },
            { type: 'material', label: 'Materials', icon: '📖' },
            { type: 'activity', label: 'Activities', icon: '✏️' },
            { type: 'quiz', label: 'Quizzes', icon: '🧠' }
          ].map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${
                selectedType === type
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Resource List */}
        <div className="flex-1 overflow-y-auto p-6">
          {resources.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-600 font-medium">No {selectedType}s available</p>
              <p className="text-sm text-gray-500 mt-1">Create {selectedType}s first, then add them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => onAdd(selectedType, resource.id, resource.title)}
                  disabled={saving}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <h4 className="font-bold text-gray-800 mb-1">{resource.title}</h4>
                  {resource.description && (
                    <p className="text-sm text-gray-600">{resource.description}</p>
                  )}
                  {resource.activity_type && (
                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded mt-2 inline-block">
                      {resource.activity_type.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
