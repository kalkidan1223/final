import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

export default function StudentCourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get(`/courses/${id}`).then(({ data }) => {
      setCourse(data.course);
      setLessons(data.lessons);
      setLoading(false);
    });
  }, [id]);

  if (loading || !course) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-slate-800">{course.title}</h1>
        <p className="mb-6 text-sm text-slate-500">{course.description}</p>

        <ul className="space-y-2">
          {lessons.map((lesson, index) => (
            <li key={lesson.id}>
              <Link
                to={`/lessons/${lesson.id}`}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-800">{lesson.title}</p>
                  {lesson.description && <p className="text-sm text-slate-500">{lesson.description}</p>}
                </div>
              </Link>
            </li>
          ))}
          {lessons.length === 0 && <p className="text-slate-500">No lessons published yet.</p>}
        </ul>
      </div>
    </Layout>
  );
}
