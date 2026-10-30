import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdAdd,
  MdTranslate,
  MdAutoStories,
  MdCheckCircle,
  MdHourglassEmpty,
  MdSearch,
  MdEdit,
  MdVisibility,
  MdSchool,
  MdRefresh,
} from 'react-icons/md';
import axiosClient from '../../api/axiosClient';
import InstructorLayout from '../../components/InstructorLayout';

export default function InstructorFidelLessons() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessons(selectedCourseId);
    }
  }, [selectedCourseId]);

  async function fetchCourses() {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/instructor/courses');
      const rawCourses = res.data.courses || [];
      const myCourses = rawCourses.map(c => ({
        ...c,
        id: c.course_id || c.id,
        title: c.course_title || c.title,
        description: c.course_description || c.description,
        grade_level_name: c.grade_level_name || 'All Grades',
        status: c.course_status || c.status,
      }));
      setCourses(myCourses);
      if (myCourses.length > 0) {
        // Prefer an Amharic course if available
        const amhCourse = myCourses.find(
          c =>
            (c.title && c.title.toLowerCase().includes('amharic')) ||
            (c.title && c.title.includes('አማርኛ')) ||
            c.subject_name === 'Amharic'
        );
        setSelectedCourseId(amhCourse ? amhCourse.id : myCourses[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load instructor courses:', err);
      setError('Unable to load assigned courses. Please try again.');
      setLoading(false);
    }
  }

  async function fetchLessons(courseId) {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/instructor/courses/${courseId}/fidel-lessons`);
      setLessons(res.data.lessons || []);
    } catch (err) {
      console.error('Failed to fetch fidel lessons:', err);
      setError(err.response?.data?.error || 'Failed to load fidel lessons for this course');
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredLessons = lessons.filter(l => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const titleMatch = l.title?.toLowerCase().includes(query);
    const descMatch = l.description?.toLowerCase().includes(query);
    const famMatch = l.families?.some(f => f.family_name?.includes(query) || f.base_character?.includes(query));
    return titleMatch || descMatch || famMatch;
  });

  const selectedCourse = courses.find(c => String(c.id) === String(selectedCourseId));

  return (
    <InstructorLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-amber-900/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-semibold mb-3">
                <MdTranslate className="text-sm" />
                <span>Curriculum-Based Amharic Early Literacy</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Fidel Family Lessons
              </h1>
              <p className="mt-2 text-amber-100 text-sm md:text-base max-w-2xl leading-relaxed">
                Author engaging fidel lessons for children. Pick family bases like{' '}
                <span className="font-bold underline">ሀ</span> or{' '}
                <span className="font-bold underline">ለ</span>, automatically include all seven forms, configure speech pronunciation, and publish seamlessly.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selectedCourseId && (
                <Link
                  to={`/instructor/fidel-lessons/create?courseId=${selectedCourseId}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-amber-800 font-bold text-sm shadow-md hover:bg-amber-50 hover:shadow-lg transition-all transform active:scale-95"
                >
                  <MdAdd className="text-xl" />
                  <span>Create Fidel Lesson</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Course Filter Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label htmlFor="course-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Assigned Course:
            </label>
            <select
              id="course-select"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-80 truncate"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.grade_level_name || 'All Grades'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search lessons or fidel..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={() => selectedCourseId && fetchLessons(selectedCourseId)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <MdRefresh className="text-xl" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading fidel lessons...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
            <MdSchool className="text-6xl text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No Courses Assigned Yet</h3>
            <p className="text-sm text-slate-500 mt-2">
              An administrator must first assign an Amharic course to your instructor account before you can create Fidel Family lessons.
            </p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl font-black mb-4">
              ሀ
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Fidel Lessons in this Course</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Start building early literacy for {selectedCourse?.title || 'your students'} by selecting fidel families like ሀ, ለ, or መ.
            </p>
            <div className="mt-6">
              <Link
                to={`/instructor/fidel-lessons/create?courseId=${selectedCourseId}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <MdAdd className="text-xl" />
                <span>Create Your First Fidel Lesson</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map(lesson => (
              <div
                key={lesson.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        lesson.is_published
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {lesson.is_published ? (
                        <>
                          <MdCheckCircle className="text-sm" />
                          <span>Published</span>
                        </>
                      ) : (
                        <>
                          <MdHourglassEmpty className="text-sm" />
                          <span>Draft</span>
                        </>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Order #{lesson.order_index + 1}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {lesson.title}
                  </h3>

                  {lesson.description && (
                    <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">
                      {lesson.description}
                    </p>
                  )}

                  {/* Included Fidel Families */}
                  <div className="mt-5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Selected Families ({lesson.families?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {lesson.families?.map((fam, idx) => (
                        <div
                          key={fam.id || idx}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-sm flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="text-base font-extrabold text-amber-700">
                            {fam.base_character || fam.family_name}
                          </span>
                          <span className="text-[10px] text-amber-600 font-semibold uppercase">
                            (7 forms)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/instructor/fidel-lessons/${lesson.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    <MdEdit className="text-sm" />
                    <span>Edit & Preview</span>
                  </Link>

                  {lesson.is_published && (
                    <Link
                      to={`/child/lessons/${lesson.id}/fidel`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs border border-amber-200 transition-colors"
                      title="View as Child"
                    >
                      <MdVisibility className="text-sm" />
                      <span>Child View</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
