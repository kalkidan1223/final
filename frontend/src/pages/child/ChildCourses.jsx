import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function ChildCourses() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/child/courses');
      setCourses(response.data.courses || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Oops! Failed to load your courses. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl animate-bounce">📚</div>
        <p className="text-lg font-black text-purple-700 animate-pulse">Loading your wonderful courses... ✨</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center max-w-lg mx-auto my-12">
        <span className="text-4xl block mb-2">🎈</span>
        <p className="text-sm font-bold text-rose-700 mb-4">{error}</p>
        <button
          onClick={fetchCourses}
          className="px-6 py-2 bg-purple-600 text-white font-bold rounded-2xl shadow hover:bg-purple-700 transition"
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-3xl p-8 shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <span>✨</span> Assigned Learning
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">My Courses 📚</h1>
          <p className="text-base text-purple-100 font-medium">Explore your courses, watch videos, and earn badges!</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/30 text-center font-bold">
          <div className="text-2xl font-black">{courses.length}</div>
          <div className="text-xs text-purple-100">Enrolled Courses</div>
        </div>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-purple-100 shadow-sm max-w-lg mx-auto">
          <span className="text-6xl block mb-4">📚</span>
          <h2 className="text-2xl font-black text-slate-800 mb-2">No Courses Available Yet</h2>
          <p className="text-slate-600 text-sm">
            Your instructor will assign your courses based on your learning group. Please check back soon! 🌟
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Available courses">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }) {
  const progress = course.overall_progress || 0;

  return (
    <div className="group bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-purple-100 flex flex-col justify-between transform hover:-translate-y-1">
      <div>
        {/* Course Banner */}
        <div className="relative h-44 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 overflow-hidden">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl group-hover:scale-110 transition-transform">📖</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 bg-white/95 text-purple-800 text-xs font-black px-3 py-1 rounded-full shadow-sm">
            {course.age_group_name || 'All Learners'}
          </div>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-xs font-bold text-purple-200">Instructor: {course.instructor_name || 'Teacher'}</span>
          </div>
        </div>

        {/* Course Info */}
        <div className="p-5 space-y-3">
          <h3 className="text-lg font-black text-slate-800 group-hover:text-purple-600 transition-colors line-clamp-1">
            {course.title}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2">
            {course.description || 'Embark on an exciting journey filled with lessons, activities, and quizzes!'}
          </p>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 pt-1">
            <span>📖 {course.total_lessons || 0} Lessons</span>
            <span>🎯 {course.total_activities || 0} Activities</span>
            <span>📝 {course.total_quizzes || 0} Quizzes</span>
          </div>
        </div>
      </div>

      {/* Progress & Action */}
      <div className="p-5 pt-0 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-black text-slate-600">
            <span>Overall Progress</span>
            <span className="text-purple-600">{progress}%</span>
          </div>
          <div className="h-2.5 bg-purple-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Link
          to={`/child/courses/${course.id}`}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-center text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
        >
          <span>Continue Learning</span>
          <span>➔</span>
        </Link>
      </div>
    </div>
  );
}