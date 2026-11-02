import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MdAssignment, MdClose, MdEdit, MdRefresh, MdSearch, MdSchool } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const pairKey = (gradeId, subjectId) => `${gradeId}:${subjectId}`;

function AssignmentModal({ instructor, gradeLevels, subjectGradeAssignments, courses, onSave, onClose }) {
  const instructorCourses = instructor.assigned_courses || [];
  const activePairs = new Set(subjectGradeAssignments.map(item => pairKey(item.grade_level_id, item.subject_id)));
  const initialPairs = instructorCourses
    .filter(course => course.subject_id && course.status !== 'archived' && activePairs.has(pairKey(course.grade_level_id, course.subject_id)))
    .map(course => pairKey(course.grade_level_id, course.subject_id));
  const [selectedGrades, setSelectedGrades] = useState(() =>
    [...new Set([
      ...(instructor.assigned_grade_levels || []).map(level => String(level.id)),
      ...instructorCourses.map(course => String(course.grade_level_id)),
    ])]
  );
  const [selectedPairs, setSelectedPairs] = useState(() => [...new Set(initialPairs)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const subjectsByGrade = useMemo(() => {
    const result = new Map();
    for (const assignment of subjectGradeAssignments) {
      const gradeId = String(assignment.grade_level_id);
      const list = result.get(gradeId) || [];
      if (!list.some(item => String(item.subject_id) === String(assignment.subject_id))) {
        list.push(assignment);
      }
      result.set(gradeId, list);
    }
    return result;
  }, [subjectGradeAssignments]);

  const coursesForPair = (gradeId, subjectId) => courses.filter(course =>
    String(course.grade_level_id) === String(gradeId) &&
    String(course.subject_id) === String(subjectId) &&
    course.status !== 'archived'
  );

  function toggleGrade(gradeId) {
    const id = String(gradeId);
    const wasSelected = selectedGrades.includes(id);
    setSelectedGrades(current => wasSelected ? current.filter(item => item !== id) : [...current, id]);
    if (wasSelected) {
      setSelectedPairs(current => current.filter(key => !key.startsWith(`${id}:`)));
    }
  }

  function toggleSubject(gradeId, subjectId) {
    const key = pairKey(gradeId, subjectId);
    setSelectedPairs(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  }

  async function submit() {
    setSaving(true);
    setError('');
    try {
      const assignedCourses = [...new Set(selectedPairs.flatMap(key => {
        const [gradeId, subjectId] = key.split(':');
        return coursesForPair(gradeId, subjectId).map(course => course.id);
      }))];
      const assignedGradeLevels = [...new Set(selectedPairs.map(key => key.split(':')[0]))];
      await onSave(instructor.id, {
        assigned_grade_levels: assignedGradeLevels,
        assigned_courses: assignedCourses,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save these subject assignments.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={event => event.stopPropagation()} aria-labelledby="assign-subjects-title">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Instructor teaching areas</p>
            <h2 id="assign-subjects-title" className="mt-1 text-xl font-black text-slate-900">Assign subjects to {instructor.full_name}</h2>
            <p className="mt-1 text-sm text-slate-500">Choose one or more grade and subject pairs.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><MdClose className="text-xl" /></button>
        </header>

        <div className="space-y-6 p-6">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">1. Choose grade levels</h3>
                <p className="mt-1 text-xs text-slate-500">Subject choices will match the grades you select.</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{selectedGrades.length} selected</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {gradeLevels.map(level => {
                const selected = selectedGrades.includes(String(level.id));
                return (
                  <button key={level.id} type="button" aria-pressed={selected} onClick={() => toggleGrade(level.id)} className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200' : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'}`}>
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md border text-xs">{selected ? '✓' : ''}</span>{level.name}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h3 className="font-bold text-slate-900">2. Choose subjects</h3>
              <p className="mt-1 text-xs text-slate-500">Selecting a subject assigns all matching learning content in that grade.</p>
            </div>
            {selectedGrades.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Choose a grade level to see its subjects.</div>
            ) : (
              <div className="space-y-4">
                {gradeLevels.filter(level => selectedGrades.includes(String(level.id))).map(level => {
                  const subjects = subjectsByGrade.get(String(level.id)) || [];
                  return (
                    <div key={level.id} className="rounded-2xl border border-slate-200 p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800"><MdSchool className="text-indigo-600" />{level.name}</h4>
                      {subjects.length === 0 ? (
                        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No subjects are linked to this grade yet. <Link to="/admin/subjects" className="font-bold underline">Set up subject management</Link>.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {subjects.map(subject => {
                            const key = pairKey(level.id, subject.subject_id);
                            const matchingCourses = coursesForPair(level.id, subject.subject_id);
                            const selected = selectedPairs.includes(key);
                            const unavailable = matchingCourses.length === 0;
                            return (
                              <button key={key} type="button" disabled={unavailable} aria-pressed={selected} onClick={() => toggleSubject(level.id, subject.subject_id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${selected ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>{selected ? '✓' : ''}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-bold">{subject.subject_name}</span>
                                  <span className="mt-0.5 block text-xs opacity-75">{subject.subject_code} · {unavailable ? 'No learning content yet' : `${matchingCourses.length} ${matchingCourses.length === 1 ? 'learning area' : 'learning areas'}`}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-xs font-medium text-slate-500">{selectedPairs.length} subject{selectedPairs.length === 1 ? '' : 's'} selected</p>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Save subject assignments'}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function AdminInstructorAssignments() {
  const [searchParams] = useSearchParams();
  const requestedInstructorId = searchParams.get('instructor_id') || '';
  const [instructors, setInstructors] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjectGradeAssignments, setSubjectGradeAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [presetOpened, setPresetOpened] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (loading || !requestedInstructorId || presetOpened) return;
    const instructor = instructors.find(item => String(item.id) === String(requestedInstructorId));
    if (instructor) {
      setEditing(instructor);
      setPresetOpened(true);
    }
  }, [loading, requestedInstructorId, presetOpened, instructors]);

  async function loadData(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [instructorRes, gradeRes, courseRes, subjectGradeRes] = await Promise.all([
        axiosClient.get('/admin/instructors?limit=500'),
        axiosClient.get('/grades'),
        axiosClient.get('/admin/courses?limit=1000'),
        axiosClient.get('/subject-grade-assignments'),
      ]);
      setInstructors(instructorRes.data.instructors || []);
      setGradeLevels(gradeRes.data.grade_levels || []);
      setCourses(courseRes.data.courses || []);
      setSubjectGradeAssignments(subjectGradeRes.data.assignments || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load instructor assignments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function saveAssignments(instructorId, assignments) {
    await axiosClient.patch(`/admin/instructors/${instructorId}/assignments`, assignments);
    await loadData(true);
  }

  const filteredInstructors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return instructors.filter(instructor => !query ||
      instructor.full_name?.toLowerCase().includes(query) ||
      instructor.email?.toLowerCase().includes(query) ||
      instructor.assigned_courses?.some(course => course.subject_name?.toLowerCase().includes(query))
    );
  }, [instructors, search]);

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Teaching access</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900"><MdAssignment className="text-indigo-600" /> Instructor Subject Assignments</h1>
            <p className="mt-1 text-sm text-slate-500">Assign several subjects across grade levels in one place.</p>
          </div>
          <button onClick={() => loadData(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><MdRefresh className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
        </header>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          Select a grade and its subjects. The matching learning areas are included automatically, so you do not need to assign each one separately.
        </div>
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search instructors or assigned subjects" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="space-y-3 p-6">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : filteredInstructors.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No instructors match this search.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredInstructors.map(instructor => {
                const pairs = new Map();
                for (const course of instructor.assigned_courses || []) {
                  if (!course.subject_id) continue;
                  const key = pairKey(course.grade_level_id, course.subject_id);
                  const existing = pairs.get(key) || { subject: course.subject_name, grade: course.grade_level_name };
                  existing.count = (existing.count || 0) + 1;
                  pairs.set(key, existing);
                }
                return (
                  <article key={instructor.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-black text-indigo-700">{instructor.full_name?.[0] || 'I'}</span>
                        <div className="min-w-0"><h2 className="truncate font-bold text-slate-900">{instructor.full_name}</h2><p className="truncate text-xs text-slate-500">{instructor.email}</p></div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 pl-1 sm:pl-[52px]">
                        {[...pairs.entries()].map(([key, pair]) => <span key={key} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{pair.subject} · {pair.grade}</span>)}
                        {pairs.size === 0 && <span className="text-xs font-medium text-slate-400">No subjects assigned yet</span>}
                      </div>
                    </div>
                    <button onClick={() => setEditing(instructor)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"><MdEdit /> Assign subjects</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {editing && <AssignmentModal instructor={editing} gradeLevels={gradeLevels} subjectGradeAssignments={subjectGradeAssignments} courses={courses} onSave={saveAssignments} onClose={() => setEditing(null)} />}
    </AdminLayout>
  );
}
