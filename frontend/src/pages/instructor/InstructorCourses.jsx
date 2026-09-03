import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdSchool, MdMenuBook, MdPublish, MdDrafts, MdArchive, MdPeople, MdInfo } from 'react-icons/md';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  archived: 'bg-amber-100 text-amber-700 border-amber-200',
};

const STATUS_ICONS = {
  draft: MdDrafts,
  published: MdPublish,
  archived: MdArchive,
};

export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, published, archived

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get('/courses?mine=true');
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCourses = courses.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const statusCounts = {
    all: courses.length,
    draft: courses.filter(c => c.status === 'draft').length,
    published: courses.filter(c => c.status === 'published').length,
    archived: courses.filter(c => c.status === 'archived').length,
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-2.5">
                <MdSchool className="text-2xl text-violet-700" />
              </div>
              My Assigned Courses
            </h1>
            <p className="text-slate-500 mt-2">
              These are the courses assigned to you by the administrator. You can create lessons, add materials, and manage content for each course.
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <MdInfo className="text-xl text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Course Assignment Works</p>
            <p className="text-blue-700">
              Administrators establish the curriculum and assign specific courses to instructors. You cannot create new courses yourself - you teach the courses that have been assigned to you. Click on any course below to add lessons and materials.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          {[
            { value: 'all', label: 'All Courses', icon: MdSchool },
            { value: 'draft', label: 'Draft', icon: MdDrafts },
            { value: 'published', label: 'Published', icon: MdPublish },
            { value: 'archived', label: 'Archived', icon: MdArchive },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === value
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className="text-lg" />
              {label}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                filter === value ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {statusCounts[value]}
              </span>
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <MdSchool className="text-6xl text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {filter === 'all' ? 'No Courses Assigned Yet' : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Courses`}
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              {filter === 'all' 
                ? 'You have not been assigned any courses yet. Please contact your administrator to get course assignments.'
                : `You don't have any courses in ${filter} status.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map(course => {
              const StatusIcon = STATUS_ICONS[course.status];
              return (
                <Link
                  key={course.id}
                  to={`/instructor/courses/${course.id}`}
                  className="group relative rounded-2xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all overflow-hidden"
                >
                  {/* Course Header with Gradient */}
                  <div className="h-32 bg-gradient-to-br from-violet-500 to-purple-600 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-2">
                        <MdSchool className="text-3xl text-white" />
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[course.status]}`}>
                          <StatusIcon className="text-xs" />
                          {course.status}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-lg line-clamp-2 group-hover:text-violet-100 transition">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MdPeople className="text-lg text-slate-400" />
                      <span className="font-medium text-violet-600">{course.age_group_name}</span>
                    </div>

                    {course.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <MdMenuBook className="text-sm" />
                        <span>Click to manage</span>
                      </div>
                      <span className="text-violet-600 font-medium group-hover:underline">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
