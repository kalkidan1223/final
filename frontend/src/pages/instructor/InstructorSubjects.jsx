import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAutoStories, MdMenuBook, MdSchool } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

export default function InstructorSubjects() {
  const [learningAreas, setLearningAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAssignments() {
      try {
        const { data } = await axiosClient.get('/instructor/courses');
        setLearningAreas(data.courses || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load your subject assignments.');
      } finally {
        setLoading(false);
      }
    }
    loadAssignments();
  }, []);

  const grouped = useMemo(() => {
    const bySubject = new Map();
    for (const item of learningAreas) {
      const key = item.subject_id
        ? `${item.grade_level_id}:${item.subject_id}`
        : `unassigned:${item.course_id}`;
      const group = bySubject.get(key) || {
        key,
        subjectName: item.subject_name || 'Subject not set',
        subjectCode: item.subject_code,
        gradeName: item.grade_level_name || 'Grade level',
        gradeId: item.grade_level_id,
        areas: [],
      };
      group.areas.push(item);
      bySubject.set(key, group);
    }
    return [...bySubject.values()].sort((a, b) =>
      a.gradeName.localeCompare(b.gradeName) || a.subjectName.localeCompare(b.subjectName)
    );
  }, [learningAreas]);

  return (
    <InstructorLayout>
      <main className="mx-auto max-w-6xl space-y-6 pb-10">
        <header className="rounded-3xl bg-gradient-to-br from-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-100">Teaching workspace</p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-black sm:text-3xl"><MdMenuBook /> My Subject Assignments</h1>
          <p className="mt-2 max-w-2xl text-sm text-indigo-100">Your assigned subjects are grouped by grade. Open a learning area to manage its lessons and classroom content.</p>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(item => <div key={item} className="h-48 animate-pulse rounded-3xl bg-white shadow-sm" />)}</div>
        ) : grouped.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <MdSchool className="mx-auto text-5xl text-slate-300" />
            <h2 className="mt-3 text-lg font-black text-slate-900">No subject assignments yet</h2>
            <p className="mt-1 text-sm text-slate-500">Your administrator will add your teaching subjects and grade levels here.</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {grouped.map(group => (
              <article key={group.key} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800"><MdSchool />{group.gradeName}</span>
                    <h2 className="mt-3 text-xl font-black text-slate-900">{group.subjectName}</h2>
                    {group.subjectCode && <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.subjectCode}</p>}
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700"><MdAutoStories /></span>
                </div>
                <div className="space-y-2 p-4">
                  {group.areas.map(area => (
                    <Link key={area.course_id} to={`/instructor/courses/${area.course_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
                      <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{area.course_title}</span><span className="mt-0.5 block text-xs text-slate-500">{area.lesson_count || 0} lessons · {area.student_count || 0} students</span></span>
                      <span className="shrink-0 text-sm font-bold text-indigo-700">Open →</span>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </InstructorLayout>
  );
}
