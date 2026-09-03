import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MdDashboard, MdSchool, MdPeople, MdAssignment, MdNotifications, 
  MdTrendingUp, MdCalendarToday, MdCheckCircle, MdPending,
  MdArrowForward, MdMenuBook, MdQuiz, MdVideoLibrary
} from 'react-icons/md';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLE = { 
  draft: 'bg-slate-100 text-slate-700 border-slate-200', 
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
  archived: 'bg-amber-100 text-amber-700 border-amber-200' 
};

function StatCard({ icon: Icon, label, value, color = 'blue', trend, onClick }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    sky: 'from-sky-500 to-sky-600',
  };

  return (
    <div 
      className={`rounded-2xl bg-gradient-to-br ${colorClasses[color]} p-6 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="mt-2 text-4xl font-bold">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs text-white/90">
              <MdTrendingUp className="text-sm" />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="rounded-xl bg-white/20 p-3">
          <Icon className="text-2xl" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, description, to, color = 'violet' }) {
  const colorClasses = {
    violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
  };

  return (
    <Link 
      to={to}
      className={`flex items-start gap-4 rounded-xl border p-4 transition ${colorClasses[color]}`}
    >
      <div className={`rounded-lg bg-white p-2.5 shadow-sm`}>
        <Icon className="text-xl" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{label}</p>
        <p className="text-xs opacity-80 mt-0.5">{description}</p>
      </div>
      <MdArrowForward className="text-lg flex-shrink-0 mt-1" />
    </Link>
  );
}

function RecentCourseCard({ course }) {
  return (
    <Link 
      to={`/instructor/courses/${course.id}`}
      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-violet-300 hover:bg-violet-50/30 hover:shadow-md transition-all"
    >
      <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
        <MdSchool className="text-2xl" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-800 truncate group-hover:text-violet-700">{course.title}</h4>
        <p className="text-sm text-slate-500 mt-0.5">
          {course.age_group_name} • {course.lesson_count} lesson{course.lesson_count !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[course.status]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {course.status}
          </span>
        </div>
      </div>
      <MdArrowForward className="text-xl text-slate-400 group-hover:text-violet-600 flex-shrink-0" />
    </Link>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    axiosClient.get('/courses/my-dashboard')
      .then(({ data: response }) => setData(response))
      .catch((err) => setError(err.response?.data?.error || 'Could not load instructor dashboard'));

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-rose-600 font-semibold">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⏳</div>
            <p className="text-slate-500 font-medium">Loading your teaching workspace...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const { summary, recent_courses: recentCourses } = data;
  const greeting = currentTime.getHours() < 12 ? 'Good morning' : currentTime.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header Section */}
        <section className="rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48" />
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-violet-200 mb-2">
                  <MdCalendarToday className="text-lg" />
                  <span className="text-sm font-medium">{dateStr}</span>
                </div>
                <h1 className="text-4xl font-bold mb-2">{greeting}, {user?.full_name || 'Instructor'}!</h1>
                <p className="text-lg text-violet-100 max-w-2xl">
                  Welcome to your teaching workspace. Plan lessons, guide learners, and track their progress all in one place.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                  <MdDashboard className="text-4xl" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Link 
                to="/instructor/courses" 
                className="rounded-xl bg-white text-violet-700 px-6 py-3 text-sm font-semibold hover:bg-violet-50 transition shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center gap-2">
                  <MdSchool /> Manage Courses
                </span>
              </Link>
              <Link 
                to="/instructor/submissions" 
                className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 text-sm font-semibold hover:bg-white/20 transition"
              >
                <span className="flex items-center gap-2">
                  <MdAssignment /> Review Submissions
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            icon={MdSchool} 
            label="Assigned Courses" 
            value={summary.assigned_courses}
            color="blue"
            onClick={() => window.location.href = '/instructor/courses'}
          />
          <StatCard 
            icon={MdMenuBook} 
            label="Total Lessons" 
            value={summary.total_lessons}
            color="violet"
          />
          <StatCard 
            icon={MdPeople} 
            label="Students Reached" 
            value={summary.total_students}
            color="emerald"
          />
          <StatCard 
            icon={MdPending} 
            label="Pending Reviews" 
            value={summary.pending_activities}
            color="amber"
            onClick={() => window.location.href = '/instructor/submissions'}
          />
          <StatCard 
            icon={MdNotifications} 
            label="New Notifications" 
            value={summary.unread_notifications}
            color="rose"
          />
          <StatCard 
            icon={MdCheckCircle} 
            label="Parent-Managed Kids" 
            value={summary.parent_managed_children}
            color="sky"
          />
        </section>

        {/* Quick Actions */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MdDashboard className="text-violet-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuickAction 
              icon={MdSchool}
              label="My Courses"
              description="View and manage your assigned courses"
              to="/instructor/courses"
              color="violet"
            />
            <QuickAction 
              icon={MdAssignment}
              label="Review Submissions"
              description={`${summary.pending_activities} activities awaiting review`}
              to="/instructor/submissions"
              color="amber"
            />
            <QuickAction 
              icon={MdMenuBook}
              label="Create Lesson"
              description="Add new lesson to your courses"
              to="/instructor/courses"
              color="blue"
            />
            <QuickAction 
              icon={MdVideoLibrary}
              label="Learning Materials"
              description="Manage videos, documents, and resources"
              to="/instructor/courses"
              color="emerald"
            />
          </div>
        </section>

        {/* Recent Courses */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MdSchool className="text-violet-600" />
                My Courses
              </h2>
              <p className="text-sm text-slate-500 mt-1">Recent course activity and publishing status</p>
            </div>
            <Link 
              to="/instructor/courses" 
              className="text-sm font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              View All <MdArrowForward />
            </Link>
          </div>

          {recentCourses.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <MdSchool className="text-6xl text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium mb-2">No courses assigned yet</p>
              <p className="text-sm text-slate-400 mb-4">Contact your administrator to get course assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCourses.map((course) => (
                <RecentCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
