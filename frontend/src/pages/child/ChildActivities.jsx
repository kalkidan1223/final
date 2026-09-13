import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const TYPE_ICONS = {
  writing: '✏️', reading: '📖', drawing: '🎨', speaking: '🎤', worksheet: '📝',
  matching: '🔗', coloring: '🖍️', counting: '🔢', fill_in_the_blank: '📝',
  drag_and_drop: '🎯', multiple_choice: '☑️', true_false: '✅', puzzle: '🧩',
  story_reading: '📚', pronunciation: '🗣️', vocabulary_practice: '📝',
  letter_tracing: '✏️', number_tracing: '✏️', listening: '🎧',
  picture_selection: '🖼️', file_submission: '📤', short_answer: '✏️',
};

const TYPE_ROUTES = {
  writing: 'write', reading: 'read', drawing: 'write', speaking: 'write',
  worksheet: 'worksheet', matching: 'match', coloring: 'write', counting: 'write',
  fill_in_the_blank: 'read', drag_and_drop: 'match', multiple_choice: 'read',
  true_false: 'read', puzzle: 'match', story_reading: 'read', pronunciation: 'listen',
  vocabulary_practice: 'read', letter_tracing: 'write', number_tracing: 'write',
  listening: 'listen', picture_selection: 'match', file_submission: 'worksheet',
  short_answer: 'read',
};

export default function ChildActivities() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/child/activities');
      setActivities(response.data.activities || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading activities... 🎯</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
        <p className="text-red-700 font-medium flex items-center gap-2">
          <span>⚠️</span> {error}
        </p>
      </div>
    );
  }

  const grouped = activities.reduce((acc, a) => {
    const key = a.course_title || 'Activities';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-green-500 via-teal-500 to-cyan-600 rounded-3xl p-8 shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-2">Fun Activities 🎯</h1>
        <p className="text-xl text-white/90">Let's play and learn with fun activities!</p>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <span className="text-6xl block mb-4">🎯</span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Activities Yet</h2>
          <p className="text-gray-600 text-lg">Your teacher will add fun activities soon!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([course, items]) => (
          <div key={course}>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{course}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((a) => {
                const routeType = TYPE_ROUTES[a.activity_type] || 'write';
                const isCompleted = a.submission_status === 'graded';
                return (
                  <Link
                    key={a.id}
                    to={isCompleted ? `/child/activities/${a.id}/results` : `/child/activities/${a.id}/${routeType}`}
                    className="group block bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 border border-gray-100 hover:border-green-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">{TYPE_ICONS[a.activity_type] || '📝'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 group-hover:text-green-600 transition truncate">{a.title}</h3>
                        <p className="text-sm text-gray-500 capitalize mb-2">{a.activity_type.replace(/_/g, ' ')} activity</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="text-gray-400">📚 {a.lesson_title}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {isCompleted ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">✅ Completed</span>
                      ) : a.submission_status === 'pending' ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">⏳ Pending Review</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">▶ Start</span>
                      )}
                      {a.difficulty && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs capitalize">{a.difficulty}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}