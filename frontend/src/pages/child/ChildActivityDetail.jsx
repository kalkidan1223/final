import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import ActivityPlayer from '../../components/child/ActivityPlayer';

export default function ChildActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      // Child-scoped endpoint (enforces lesson/resource locks for this student).
      const response = await axiosClient.get(`/child/activities/${id}`);
      console.log('Activity data:', response.data);
      setActivity(response.data.activity);
    } catch (err) {
      console.error('Failed to load activity:', err);
      setError(err.response?.data?.error || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      // The backend verifies the activity was actually submitted before it
      // records completion on the lesson journey.
      await axiosClient.post(`/child/learning/progress/activity/${id}/complete`);
      alert('Great job! Activity completed! 🎉');
      navigate(-1);
    } catch (err) {
      alert(err.response?.data?.error || 'We could not record this activity yet.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-7xl animate-bounce">✏️</div>
        <p className="text-xl font-black text-purple-700 animate-pulse">Loading activity...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="space-y-4 max-w-lg mx-auto my-12">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-purple-600 hover:text-purple-700 font-bold gap-2">
          <span className="text-2xl">←</span> <span>Go Back</span>
        </button>
        <div className="bg-rose-50 border-4 border-rose-200 p-8 rounded-3xl text-center">
          <span className="text-6xl block mb-4">😟</span>
          <p className="text-rose-700 font-bold text-lg mb-6">{error || 'Activity not found'}</p>
          <button
            onClick={fetchActivity}
            className="px-8 py-3 bg-purple-600 text-white font-black text-lg rounded-full shadow-lg hover:bg-purple-700 transition transform hover:scale-105"
          >
            Try Again 🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 px-4 animate-fade-in">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 font-black text-sm bg-white px-4 py-2 rounded-full shadow-md border-2 border-purple-100 transition hover:scale-105"
        >
          <span className="text-xl">←</span> <span>Back</span>
        </button>
      </div>

      {/* Activity Header */}
      <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{getActivityIcon(activity.activity_type)}</span>
            <div>
              <div className="text-sm font-bold text-green-100 uppercase tracking-wide">
                {activity.activity_type?.replace(/_/g, ' ')}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {activity.title}
              </h1>
            </div>
          </div>
          
          {activity.instructions && (
            <p className="text-lg font-medium text-white/90 max-w-2xl">
              {activity.instructions}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
            {activity.max_score && (
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="text-xl">⭐</span>
                <span>Max Score: {activity.max_score}</span>
              </div>
            )}
            
            {activity.estimated_time_minutes && (
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="text-xl">⏱️</span>
                <span>{activity.estimated_time_minutes} minutes</span>
              </div>
            )}
            
            {activity.difficulty && (
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="text-xl">📊</span>
                <span className="capitalize">{activity.difficulty}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Content */}
      <div className="bg-white rounded-3xl p-8 shadow-xl border-4 border-green-100">
        {!activity.activity_config || Object.keys(activity.activity_config).length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="text-6xl">📝</div>
            <h3 className="text-2xl font-black text-gray-700">No Content Yet</h3>
            <p className="text-gray-600 font-medium max-w-md mx-auto">
              Your teacher is still preparing the content for this activity. Check back soon!
            </p>
          </div>
        ) : (
          <ActivityPlayer activity={activity} onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}

// Helper function to get appropriate icon for activity type
function getActivityIcon(activityType) {
  const icons = {
    drag_and_drop: '🎯',
    multiple_choice: '✅',
    true_false: '⭕',
    fill_in_the_blank: '📝',
    matching: '🔗',
    writing: '✏️',
    drawing: '🎨',
    coloring: '🖍️',
    reading: '📖',
    story_reading: '📚',
    speaking: '🗣️',
    pronunciation: '🔊',
    listening: '👂',
    vocabulary_practice: '📚',
    letter_tracing: '✍️',
    number_tracing: '🔢',
    puzzle: '🧩',
    counting: '🔢',
    worksheet: '📄',
    picture_selection: '🖼️',
    file_submission: '📎',
    short_answer: '💬'
  };
  return icons[activityType] || '✏️';
}
