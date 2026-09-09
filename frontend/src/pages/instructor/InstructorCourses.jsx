import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdSchool, MdMenuBook, MdPeople, MdInfo } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  archived: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosClient.get('/instructor/courses');
      setCourses(data.courses || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your assigned courses');
    } finally {
      setLoading(false);
    }
  }

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-2.5">
                <MdSchool className="text-2xl text-violet-700" />
              </div>
              Courses
            </h1>
            <p className="text-slate-500 mt-2">
              These are the courses assigned to you by the administrator. Open a course to build and manage its lessons, materials, videos, quizzes and activities.
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <MdInfo className="text-xl text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Course Assignment Works</p>
            <p className="text-blue-700">
              Administrators establish the curriculum and assign courses to instructors. You teach the courses that have been assigned to you — open a course to add lessons and manage content.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
        )}

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <MdSchool className="text-6xl text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Courses Assigned Yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              No courses have been assigned to you yet. Please contact your administrator to get course assignments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.course_id}
                className="rounded-2xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all overflow-hidden flex flex-col"
              >
                {/* Course Header with Gradient */}
                <div className="h-28 bg-gradient-to-br from-violet-500 to-purple-600 p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <h3 className="text-white font-bold text-lg leading-snug line-clamp-2">{course.course_title}</h3>
                    <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[course.course_status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {course.course_status}
                    </span>
                  </div>
                </div>

                {/* Course Details */}
                <div className="p-5 space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MdSchool className="text-lg text-slate-400" />
                      <span className="font-medium text-violet-600">{course.age_group_name}</span>
                    </span>
                    {course.grade && (
                      <span className="inline-flex items-center gap-1.5">
                        <MdInfo className="text-lg text-slate-400" />
                        Grade {course.grade}
                      </span>
                    )}
                    {course.section && (
                      <span className="inline-flex items-center gap-1.5">
                        <MdInfo className="text-lg text-slate-400" />
                        Section {course.section}
                      </span>
                    )}
                  </div>

                  {course.course_description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{course.course_description}</p>
                  )}

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-slate-50 py-2">
                      <div className="flex items-center justify-center gap-1 text-slate-700 text-sm font-semibold">
                        <MdMenuBook className="text-slate-400" />
                        {course.lesson_count}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{course.lesson_count === 1 ? 'Lesson' : 'Lessons'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 py-2">
                      <div className="flex items-center justify-center gap-1 text-slate-700 text-sm font-semibold">
                        <MdPeople className="text-slate-400" />
                        {course.student_count}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{course.student_count === 1 ? 'Student' : 'Students'}</div>
                    </div>
                  </div>

                  <Link
                    to={`/instructor/courses/${course.course_id}`}
                    className="block w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-center text-white hover:bg-violet-700 transition"
                  >
                    OPEN COURSE
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}