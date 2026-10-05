import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAdd, MdArrowBack, MdCheck, MdDelete, MdRefresh } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';
import { tileMetaFor } from '../../utils/practiceContent';

/**
 * InstructorChildHome
 * -------------------
 * The teacher's control over the age 5-9 child landing screen.
 *
 * The child home is NOT a page builder. It is a view over the course the
 * teacher has already published: they pick up to a handful of activities and
 * they appear on their young learners' home screen, in the order shown here.
 *
 * This keeps two things true that matter in a real school:
 *   - the child only ever sees content their own teacher published, from their
 *     own age group
 *   - the home can never drift out of sync with the course, because it IS the
 *     course
 */

const KIND_LABEL = {
  letter_tracing: 'Letter tracing',
  counting: 'Counting',
  matching: 'Matching',
};

export default function InstructorChildHome() {
  const [ageGroups, setAgeGroups] = useState([]);
  const [ageGroupId, setAgeGroupId] = useState('');
  const [pins, setPins] = useState([]);
  const [candidates, setCandidates] = useState({ activities: [], lessons: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Which age groups this instructor actually teaches, so the selector only
  // offers groups they have published content for.
  useEffect(() => {
    let alive = true;
    axiosClient
      .get('/instructor/courses')
      .then(({ data }) => {
        if (!alive) return;
        const courses = data.courses || [];
        const seen = new Map();
        for (const course of courses) {
          if (course.age_group_id && !seen.has(course.age_group_id)) {
            seen.set(course.age_group_id, {
              id: course.age_group_id,
              name: course.age_group_name || `Age group ${course.age_group_id}`,
            });
          }
        }
        const groups = [...seen.values()];
        setAgeGroups(groups);
        if (groups.length > 0) setAgeGroupId(String(groups[0].id));
        else setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || 'Could not load your courses');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!ageGroupId) return;
    setLoading(true);
    setError('');
    try {
      const [pinRes, candRes] = await Promise.all([
        axiosClient.get('/home/pins', { params: { age_group_id: ageGroupId } }),
        axiosClient.get('/home/candidates', { params: { age_group_id: ageGroupId } }),
      ]);
      setPins(pinRes.data.pins || []);
      setCandidates(candRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the home screen');
    } finally {
      setLoading(false);
    }
  }, [ageGroupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function pin(resourceType, resourceId) {
    setBusy(true);
    setError('');
    try {
      await axiosClient.post('/home/pins', {
        age_group_id: ageGroupId,
        resource_type: resourceType,
        resource_id: resourceId,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add that to the home screen');
    } finally {
      setBusy(false);
    }
  }

  async function unpin(pinId) {
    setBusy(true);
    setError('');
    try {
      await axiosClient.delete(`/home/pins/${pinId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove that from the home screen');
    } finally {
      setBusy(false);
    }
  }

  async function move(index, direction) {
    const next = [...pins];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPins(next); // optimistic, so the order feels immediate

    try {
      await Promise.all(
        next.map((p, i) =>
          axiosClient.patch(`/home/pins/${p.pin_id}`, { display_order: i })
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the new order');
      load();
    }
  }

  const available = candidates.activities.filter((a) => !a.is_pinned);
  const selected = ageGroups.find((g) => String(g.id) === ageGroupId);

  return (
    <InstructorLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            to="/instructor/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
          >
            <MdArrowBack /> Back to dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-800">Child Home Screen</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Choose what your young learners see first on their home screen. These are
            drawn from activities you have already published — children aged 5 to 9
            only ever see their own age group, and the home screen never shows
            anything you have not chosen.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {ageGroups.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-sm text-slate-600">
              You have not published a course yet, so there is nothing to put on a
              child home screen.
            </p>
            <Link
              to="/instructor/courses"
              className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go to my courses
            </Link>
          </div>
        )}

        {ageGroups.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-600" htmlFor="age-group">
                Age group
              </label>
              <select
                id="age-group"
                value={ageGroupId}
                onChange={(e) => setAgeGroupId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {ageGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
              >
                <MdRefresh /> Refresh
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* ── What is on the home screen now ── */}
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">
                    On the home screen
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {pins.length} of 6
                    </span>
                  </h2>
                </div>

                {loading ? (
                  <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
                ) : pins.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="text-sm text-slate-500">
                      Nothing yet. Add an activity from the right and it will appear on
                      their home screen.
                    </p>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {pins.map((pin, index) => {
                      const meta = tileMetaFor(pin);
                      return (
                        <li
                          key={pin.pin_id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                        >
                          <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-400">
                            {index + 1}
                          </span>
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b ${meta.tileBg} text-xl ring-2 ${meta.tileClass}`}
                          >
                            {meta.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-800">
                              {pin.title}
                            </span>
                            <span className="block truncate text-xs text-slate-400">
                              {meta.label} · {pin.lesson_title}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-0.5">
                            <button
                              onClick={() => move(index, -1)}
                              disabled={index === 0 || busy}
                              className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => move(index, 1)}
                              disabled={index === pins.length - 1 || busy}
                              className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => unpin(pin.pin_id)}
                              disabled={busy}
                              className="rounded-lg px-2 py-1 text-rose-600 hover:bg-rose-50"
                              aria-label="Remove from home screen"
                            >
                              <MdDelete />
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              {/* ── Everything published, ready to add ── */}
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-semibold text-slate-800">
                  Your published activities
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {selected?.name}
                  </span>
                </h2>

                {loading ? (
                  <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
                ) : available.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    Everything you have published is already on the home screen.
                  </p>
                ) : (
                  <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                    {available.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-800">
                            {activity.title}
                          </span>
                          <span className="block truncate text-xs text-slate-400">
                            {KIND_LABEL[activity.activity_type] ||
                              activity.activity_type?.replace(/_/g, ' ')}{' '}
                            · {activity.lesson_title}
                          </span>
                        </span>
                        {activity.status !== 'active' && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            {activity.status}
                          </span>
                        )}
                        <button
                          onClick={() => pin('activity', activity.id)}
                          disabled={busy}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <MdAdd /> Add
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {pins.length > 0 && (
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-800">
                <span className="flex items-center gap-2 font-medium">
                  <MdCheck /> Children in {selected?.name} see these first on their
                  home screen, in this order.
                </span>
                <p className="mt-1 text-indigo-600">
                  Practice games (letter tracing, counting, matching) run entirely in
                  the browser, so they still work on a school laptop with no
                  connection.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </InstructorLayout>
  );
}
