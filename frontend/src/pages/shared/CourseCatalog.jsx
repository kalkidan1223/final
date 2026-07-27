import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

export default function CourseCatalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/courses').then(({ data }) => {
      setCourses(data.courses);
      setLoading(false);
    });
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-slate-800">Courses</h1>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {courses.map((c) => (
              <li key={c.id}>
                <Link to={`/courses/${c.id}`} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm hover:shadow-md">
                  <div>
                    <p className="font-medium text-slate-800">{c.title}</p>
                    <p className="text-sm text-slate-500">{c.age_group_name} · by {c.instructor_name}</p>
                  </div>
                  <span className="text-sky-600">Open →</span>
                </Link>
              </li>
            ))}
            {courses.length === 0 && <p className="text-slate-500">No published courses yet.</p>}
          </ul>
        )}
      </div>
    </Layout>
  );
}
