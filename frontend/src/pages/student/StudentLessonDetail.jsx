import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl } from '../../utils/fileUrl';

export default function StudentLessonDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get(`/lessons/${id}`).then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  }, [id]);

  if (loading || !data) {
    return <Layout><p className="p-10 text-slate-500">Loading…</p></Layout>;
  }

  const { lesson, materials, videos, quizzes, activities } = data;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to={`/courses/${lesson.course_id}`} className="text-sm text-sky-600 hover:underline">
          ← Back to {lesson.course_title}
        </Link>
        <h1 className="mb-6 mt-2 text-2xl font-semibold text-slate-800">{lesson.title}</h1>

        {videos.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium text-slate-700">Videos</h2>
            <ul className="space-y-2">
              {videos.map((v) => (
                <li key={v.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <a href={v.video_url} target="_blank" rel="noreferrer" className="font-medium text-sky-600 hover:underline">
                    ▶ {v.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {materials.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium text-slate-700">Learning materials</h2>
            <ul className="space-y-2">
              {materials.map((m) => (
                <li key={m.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <a href={resolveFileUrl(m.file_url)} target="_blank" rel="noreferrer" className="font-medium text-sky-600 hover:underline">
                    📄 {m.title} <span className="text-xs text-slate-400">({m.type})</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {quizzes.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium text-slate-700">Quizzes</h2>
            <ul className="space-y-2">
              {quizzes.map((q) => (
                <li key={q.id}>
                  <Link
                    to={`/quizzes/${q.id}`}
                    className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:shadow-md"
                  >
                    <span className="font-medium text-slate-800">📝 {q.title}</span>
                    <span className="text-sm text-sky-600">Take quiz →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activities.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-medium text-slate-700">Activities</h2>
            <ul className="space-y-2">
              {activities.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/activities/${a.id}/submit`}
                    className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:shadow-md"
                  >
                    <span className="font-medium text-slate-800">
                      🎨 {a.title} <span className="text-xs text-slate-400">({a.activity_type.replace(/_/g, ' ')})</span>
                    </span>
                    <span className="text-sm text-sky-600">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {materials.length === 0 && videos.length === 0 && quizzes.length === 0 && activities.length === 0 && (
          <p className="text-slate-500">Nothing has been added to this lesson yet.</p>
        )}
      </div>
    </Layout>
  );
}
