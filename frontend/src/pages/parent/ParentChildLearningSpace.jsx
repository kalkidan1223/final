import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

const TABS = ['overview', 'courses', 'materials', 'activities', 'progress', 'recommendations'];

function ageFromDate(date) {
  const birth = new Date(date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(birth.setFullYear(today.getFullYear()))) age -= 1;
  return age;
}

export default function ParentChildLearningSpace() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient.get(`/students/children/${id}/learning-space`)
      .then(({ data: response }) => setData(response))
      .catch((err) => setError(err.response?.data?.error || 'Could not load this child learning space'));
  }, [id]);

  if (error) return <Layout><p className="mx-auto max-w-4xl p-10 text-rose-600">{error}</p></Layout>;
  if (!data) return <Layout><p className="p-10 text-slate-500">Loading learning space...</p></Layout>;

  const { child, courses, materials, activities, quiz_results: quizResults, recommendations } = data;
  const averageQuiz = quizResults.length
    ? Math.round(quizResults.reduce((sum, item) => sum + (Number(item.score) / Number(item.total_points || 1)) * 100, 0) / quizResults.length)
    : 0;

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/parent/dashboard" className="text-sm font-medium text-sky-700 hover:underline">Back to My Children</Link>
        <section className="mt-4 rounded-3xl bg-gradient-to-r from-sky-600 to-blue-700 p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-sky-100">Child Learning Space</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-3xl font-bold">{child.full_name}</h1><p className="mt-1 text-sky-100">Age {ageFromDate(child.date_of_birth)} · {child.age_group} · {child.has_own_account ? 'Student Account' : 'Parent Managed'}</p></div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-right"><p className="text-xs text-sky-100">Learning progress</p><p className="text-2xl font-bold">{child.progress_percentage}%</p></div>
          </div>
        </section>

        <nav className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
          {TABS.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold capitalize ${tab === item ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-sky-50'}`}>{item}</button>)}
        </nav>

        {tab === 'overview' && <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Completed lessons</p><p className="mt-2 text-3xl font-bold text-slate-800">{child.completed_lessons}</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Average quiz score</p><p className="mt-2 text-3xl font-bold text-slate-800">{averageQuiz}%</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Pending activities</p><p className="mt-2 text-3xl font-bold text-slate-800">{activities.filter((activity) => !activity.status || activity.status === 'pending').length}</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm md:col-span-3"><h2 className="font-bold text-slate-800">Next step</h2><p className="mt-2 text-sm text-slate-600">Choose a course to guide {child.full_name} through lessons, materials, activities, and progress.</p></div>
        </div>}

        {tab === 'courses' && <div className="mt-6 grid gap-4 md:grid-cols-2">
          {courses.map((course) => <Link key={course.id} to={`/courses/${course.id}`} className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"><p className="text-lg font-bold text-slate-800">{course.title}</p><p className="mt-2 text-sm text-slate-600">{course.description || 'Explore this learning course.'}</p><p className="mt-3 text-xs font-semibold text-sky-700">{course.lesson_count} lessons · {course.instructor_name}</p></Link>)}
          {courses.length === 0 && <p className="text-slate-500">No published courses are available for this age group yet.</p>}
        </div>}

        {tab === 'materials' && <div className="mt-6 grid gap-4 md:grid-cols-2">
          {materials.map((material) => <article key={material.id} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-sky-700">{material.type}</p><h2 className="mt-1 text-lg font-bold text-slate-800">{material.title}</h2><p className="mt-2 text-sm text-slate-500">{material.course_title} · {material.lesson_title}</p><p className="mt-1 text-xs text-slate-400">Shared by {material.instructor_name}</p><a href={material.file_url} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Open material</a></article>)}
          {materials.length === 0 && <p className="text-slate-500">No learning materials are available for this age group yet.</p>}
        </div>}

        {tab === 'activities' && <div className="mt-6 space-y-3">
          {activities.map((activity) => <div key={activity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm"><div><p className="font-bold text-slate-800">{activity.title}</p><p className="text-sm capitalize text-slate-500">{activity.activity_type.replace(/_/g, ' ')}</p>{activity.feedback && <p className="mt-1 text-sm text-emerald-700">Feedback: {activity.feedback}</p>}</div><Link to={`/activities/${activity.id}/submit`} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">{activity.status ? 'View submission' : 'Start activity'}</Link></div>)}
          {activities.length === 0 && <p className="text-slate-500">No activities are available yet.</p>}
        </div>}

        {tab === 'progress' && <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Learning Progress</h2><div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-600" style={{ width: `${child.progress_percentage}%` }} /></div><p className="mt-3 text-sm text-slate-600">{child.progress_percentage}% overall lesson completion · {child.completed_lessons} completed lessons</p>{quizResults.length > 0 && <div className="mt-6 space-y-2">{quizResults.map((result, index) => <p key={`${result.title}-${index}`} className="text-sm text-slate-600">{result.title}: {result.score}/{result.total_points}</p>)}</div>}</div>}

        {tab === 'recommendations' && <div className="mt-6 space-y-3">{recommendations.map((item, index) => <div key={`${item.recommendation_type}-${index}`} className="rounded-2xl bg-sky-50 p-5"><p className="font-bold capitalize text-slate-800">Recommended {item.recommendation_type.replace(/_/g, ' ')}</p>{item.reason && <p className="mt-1 text-sm text-slate-600">{item.reason}</p>}{item.confidence_score && <p className="mt-2 text-xs font-medium text-sky-800">Match confidence: {Math.round(Number(item.confidence_score) * 100)}%</p>}</div>)}{recommendations.length === 0 && <p className="text-slate-500">Recommendations will appear after learning activity is recorded.</p>}</div>}
      </div>
    </Layout>
  );
}
