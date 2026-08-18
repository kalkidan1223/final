import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { MdSchool } from 'react-icons/md';

export default function ParentChildLearningSpace() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);

  useEffect(() => {
    fetchChildData();
  }, [id]);

  async function fetchChildData() {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/api/parent/children/${id}`);
      setChild(response.data.child);
    } catch (err) {
      console.error('Failed to fetch child data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-slate-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-12">
        <MdSchool className="text-6xl text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">Child Not Found</h3>
        <p className="text-slate-500">The requested child could not be found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">{child.full_name}</h1>
        <p className="text-slate-600">Child Learning Space - Coming Soon</p>
        <p className="text-sm text-slate-500 mt-2">
          This is the learning space for {child.full_name}. Full implementation with lessons, 
          activities, quizzes, and progress tracking will be available soon.
        </p>
      </div>
    </div>
  );
}
