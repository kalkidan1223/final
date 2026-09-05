import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MdArrowBack, MdSchool, MdPeople, MdMenuBook, MdVideoLibrary,
  MdFactCheck, MdQuiz, MdAssignment, MdCalendarToday, MdTrendingUp,
  MdCampaign, MdAdd, MdEdit, MdDelete, MdPublish, MdSave,
  MdClose, MdCloudUpload, MdGrade, MdFeedback
} from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: MdSchool },
  { id: 'students',     label: 'Students',     icon: MdPeople },
  { id: 'lessons',      label: 'Lessons',      icon: MdMenuBook },
  { id: 'materials',    label: 'Materials',    icon: MdVideoLibrary },
  { id: 'activities',   label: 'Activities',   icon: MdFactCheck },
  { id: 'quizzes',      label: 'Quizzes',      icon: MdQuiz },
  { id: 'submissions',  label: 'Submissions',  icon: MdAssignment },
  { id: 'attendance',   label: 'Attendance',   icon: MdCalendarToday },
  { id: 'progress',     label: 'Progress',     icon: MdTrendingUp },
  { id: 'announcements', label: 'Announcements', icon: MdCampaign },
];

/* ─── Tab Components ─── */

function OverviewTab({ assignment }) {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Students',    value: assignment.student_count ?? 0,   emoji: '👥', color: 'indigo' },
          { label: 'Lessons',     value: assignment.lesson_count ?? 0,    emoji: '📚', color: 'violet' },
          { label: 'Materials',   value: assignment.material_count ?? 0,  emoji: '🎥', color: 'sky' },
          { label: 'Pending',     value: assignment.pending_count ?? 0,   emoji: '⏳', color: 'amber' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="text-3xl mb-2">{s.emoji}</div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Assignment Details</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Course',        value: assignment.course_title },
            { label: 'Age Group',     value: assignment.age_group_name },
            { label: 'Grade',         value: assignment.grade || '—' },
            { label: 'Section',       value: assignment.section || '—' },
            { label: 'Academic Year', value: assignment.academic_year || '—' },
            { label: 'Status',        value: assignment.status },
          ].map(r => (
            <div key={r.label} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-800 capitalize">{r.value}</span>
            </div>
          ))}
        </div>
        {assignment.course_description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500 font-medium mb-1">Course Description</p>
            <p className="text-sm text-slate-700 leading-relaxed">{assignment.course_description}</p>
          </div>
        )}
      </div>

      {assignment.age_group_name && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-sm font-semibold text-indigo-700 mb-1">📌 Age Group Notice</p>
          <p className="text-sm text-indigo-600">
            You are creating content for children aged <strong>{assignment.age_group_name}</strong>.
            Keep all lessons, materials, and activities age-appropriate for this group.
          </p>
        </div>
      )}
    </div>
  );
}

function StudentsTab({ assignmentId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${assignmentId}/students`)
      .then(({ data }) => setStudents(data.students || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <div className="grid sm:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" />)}</div>;

  if (students.length === 0) return (
    <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
      <div className="text-5xl mb-3">👥</div>
      <h3 className="font-semibold text-slate-700">No Students Yet</h3>
      <p className="text-sm text-slate-400 mt-1">No students are currently assigned to this class.</p>
    </div>
  );

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map(s => (
        <Link
          key={s.id}
          to={`/instructor/students/${s.id}`}
          className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {s.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{s.full_name}</p>
            <p className="text-sm text-slate-500 capitalize">{s.account_type || 'parent-managed'}</p>
            {s.progress != null && (
              <div className="mt-1.5">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.progress}%` }} />
                </div>
                <span className="text-xs text-slate-400">{s.progress}% complete</span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function LessonsTab({ assignmentId, assignment }) {
  const [lessons, setLessons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ title: '', description: '', order_index: 1, status: 'draft' });

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${assignmentId}/lessons`)
      .then(({ data }) => setLessons(data.lessons || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  async function saveLesson(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosClient.post(`/instructor/assignments/${assignmentId}/lessons`, form);
      setLessons(prev => [...prev, data.lesson]);
      setShowForm(false);
      setForm({ title: '', description: '', order_index: lessons.length + 2, status: 'draft' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create lesson');
    } finally {
      setSaving(false);
    }
  }

  const STATUS_COLORS = { draft: 'bg-slate-100 text-slate-600', published: 'bg-emerald-100 text-emerald-700', archived: 'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition active:scale-95"
        >
          <MdAdd /> Create Lesson
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">New Lesson</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><MdClose /></button>
          </div>
          <form onSubmit={saveLesson} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Lesson Title *</label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Learning Letter ሀ"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What students will learn in this lesson…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Order</label>
                <input
                  type="number" min={1}
                  value={form.order_index}
                  onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Saving…' : '✓ Save Lesson'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}</div>}

      {!loading && lessons.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">📚</div>
          <h3 className="font-semibold text-slate-700">No Lessons Yet</h3>
          <p className="text-sm text-slate-400 mt-1 mb-4">Click "Create Lesson" to add the first lesson.</p>
        </div>
      )}

      {lessons.map(l => (
        <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
            {l.order_index}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{l.title}</p>
            {l.description && <p className="text-xs text-slate-400 truncate mt-0.5">{l.description}</p>}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[l.status]}`}>
            {l.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function MaterialsTab({ assignmentId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${assignmentId}/materials`)
      .then(({ data }) => setMaterials(data.materials || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const TYPE_ICONS = { pdf: '📄', image: '🖼️', video: '🎥', audio: '🎵', document: '📝' };

  if (loading) return <div className="grid sm:grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition">
          <MdCloudUpload /> Upload Material
        </button>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">🎥</div>
          <h3 className="font-semibold text-slate-700">No Materials Yet</h3>
          <p className="text-sm text-slate-400 mt-1">Upload PDFs, images, videos, or audio files.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {materials.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="text-3xl flex-shrink-0">{TYPE_ICONS[m.type] || '📎'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{m.title}</p>
                <p className="text-xs text-slate-400 capitalize">{m.type}</p>
              </div>
              <a href={m.file_url} target="_blank" rel="noreferrer"
                className="text-xs text-indigo-600 font-semibold hover:underline flex-shrink-0">View</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivitiesTab({ assignmentId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${assignmentId}/activities`)
      .then(({ data }) => setActivities(data.activities || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition">
          <MdAdd /> Create Activity
        </button>
      </div>
      {activities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">✏️</div>
          <h3 className="font-semibold text-slate-700">No Activities Yet</h3>
          <p className="text-sm text-slate-400 mt-1">Create activities like writing, reading, matching, etc.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="text-2xl">✏️</div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-500 capitalize">{a.type}</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionsTab({ assignmentId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${assignmentId}/submissions`)
      .then(({ data }) => setSubmissions(data.submissions || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const STATUS_COLORS = {
    pending:  'bg-amber-100 text-amber-700',
    reviewed: 'bg-blue-100 text-blue-700',
    graded:   'bg-emerald-100 text-emerald-700',
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-3">
      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">📬</div>
          <h3 className="font-semibold text-slate-700">No Submissions Yet</h3>
          <p className="text-sm text-slate-400 mt-1">Student submissions will appear here.</p>
        </div>
      ) : (
        submissions.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
              {s.student_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{s.student_name}</p>
              <p className="text-xs text-slate-500 truncate">{s.activity_title}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status] || ''}`}>{s.status}</span>
              <Link to={`/instructor/submissions/${s.id}`}
                className="text-xs text-indigo-600 font-semibold hover:underline">
                {s.status === 'pending' ? 'Grade' : 'View'}
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AttendanceTab({ assignmentId }) {
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    Promise.all([
      axiosClient.get(`/instructor/assignments/${assignmentId}/students`),
      axiosClient.get(`/instructor/assignments/${assignmentId}/attendance?date=${date}`),
    ]).then(([sRes, aRes]) => {
      const stds = sRes.data.students || [];
      setStudents(stds);
      const existing = {};
      (aRes.data.attendance || []).forEach(a => { existing[a.student_id] = a.status; });
      const init = {};
      stds.forEach(s => { init[s.id] = existing[s.id] || 'present'; });
      setAttendance(init);
    }).finally(() => setLoading(false));
  }, [assignmentId, date]);

  async function saveAttendance() {
    setSaving(true);
    try {
      await axiosClient.post(`/instructor/assignments/${assignmentId}/attendance`, {
        date, records: Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }))
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  function markAll(status) {
    setAttendance(prev => { const n = {...prev}; Object.keys(n).forEach(k => n[k] = status); return n; });
  }

  const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];
  const STATUS_COLORS = {
    present: 'bg-emerald-500 text-white border-emerald-500',
    absent:  'bg-red-500 text-white border-red-500',
    late:    'bg-amber-500 text-white border-amber-500',
    excused: 'bg-blue-500 text-white border-blue-500',
  };
  const INACTIVE = 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => markAll('present')} className="px-3 py-2 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition">All Present</button>
          <button onClick={() => markAll('absent')}  className="px-3 py-2 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition">All Absent</button>
          <button onClick={saveAttendance} disabled={saving} className={`px-4 py-2 text-sm font-semibold rounded-xl flex items-center gap-1 transition ${saved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white disabled:opacity-60`}>
            <MdSave className="text-sm" /> {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-slate-500">No students in this class.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {students.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-4 px-4 py-3 ${i !== students.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                {s.full_name?.charAt(0)}
              </div>
              <p className="flex-1 font-medium text-slate-800 text-sm">{s.full_name}</p>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map(st => (
                  <button
                    key={st}
                    onClick={() => setAttendance(prev => ({ ...prev, [s.id]: st }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition ${attendance[s.id] === st ? STATUS_COLORS[st] : INACTIVE}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressTab({ assignmentId }) {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${assignmentId}/progress`)
      .then(({ data }) => setProgress(data.progress || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-3">
      {progress.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">📊</div>
          <p className="font-semibold text-slate-700">No Progress Data Yet</p>
          <p className="text-sm text-slate-400 mt-1">Progress appears as students complete lessons and activities.</p>
        </div>
      ) : (
        progress.map(p => (
          <div key={p.student_id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                  {p.student_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{p.student_name}</p>
                  <p className="text-xs text-slate-400">{p.completed_lessons}/{p.total_lessons} lessons</p>
                </div>
              </div>
              <span className="font-bold text-indigo-600">{p.progress_pct ?? 0}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${p.progress_pct ?? 0}%` }}
              />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span>Avg: <strong className="text-slate-700">{p.avg_score ?? 0}%</strong></span>
              <span>Activities: <strong className="text-slate-700">{p.activities_done}/{p.activities_total}</strong></span>
              <span>Attendance: <strong className="text-slate-700">{p.attendance_rate ?? 0}%</strong></span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AnnouncementsTab({ assignmentId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ title: '', content: '' });
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${assignmentId}/announcements`)
      .then(({ data }) => setAnnouncements(data.announcements || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  async function post(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axiosClient.post(`/instructor/assignments/${assignmentId}/announcements`, form);
      setAnnouncements(prev => [data.announcement, ...prev]);
      setShowForm(false);
      setForm({ title: '', content: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to post');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition">
          <MdAdd /> New Announcement
        </button>
      </div>

      {showForm && (
        <form onSubmit={post} className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-800">New Announcement</h3>
          <input
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Announcement title…"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <textarea
            required
            rows={4}
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Announcement content…"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none resize-none"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
              {saving ? 'Posting…' : '📢 Post'}
            </button>
          </div>
        </form>
      )}

      {loading && <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}</div>}

      {!loading && announcements.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">📢</div>
          <p className="font-semibold text-slate-700">No Announcements</p>
          <p className="text-sm text-slate-400 mt-1">Post announcements for your class here.</p>
        </div>
      )}

      {announcements.map(a => (
        <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="font-semibold text-slate-800">{a.title}</p>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{a.content}</p>
          <p className="text-xs text-slate-400 mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function InstructorAssignmentWorkspace() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeTab, setActiveTab]   = useState('overview');

  useEffect(() => {
    axiosClient.get(`/instructor/assignments/${id}`)
      .then(({ data }) => setAssignment(data.assignment))
      .catch(err => setError(err.response?.data?.error || 'Could not load assignment'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Back + title */}
        <div>
          <Link to="/instructor/assignments" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition mb-3">
            <MdArrowBack className="text-lg" /> Back to Assignments
          </Link>
          {assignment && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">{assignment.course_title}</h1>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {[assignment.age_group_name, assignment.grade && `Grade ${assignment.grade}`, assignment.section && `Sec. ${assignment.section}`, assignment.academic_year]
                    .filter(Boolean).map(tag => (
                      <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium border border-indigo-100">{tag}</span>
                    ))}
                </div>
              </div>
              <span className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-full border ${assignment.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {assignment.status}
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">⚠️ {error}</div>}

        {/* Loading */}
        {loading && <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />}

        {assignment && (
          <>
            {/* Tabs */}
            <div className="overflow-x-auto -mx-1">
              <div className="flex gap-1 pb-1 min-w-max px-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon className="text-sm" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div>
              {activeTab === 'overview'      && <OverviewTab assignment={assignment} />}
              {activeTab === 'students'      && <StudentsTab assignmentId={id} />}
              {activeTab === 'lessons'       && <LessonsTab  assignmentId={id} assignment={assignment} />}
              {activeTab === 'materials'     && <MaterialsTab    assignmentId={id} />}
              {activeTab === 'activities'    && <ActivitiesTab   assignmentId={id} />}
              {activeTab === 'quizzes'       && <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200"><div className="text-5xl mb-3">🧩</div><p className="font-semibold text-slate-700">Quiz Management</p><p className="text-sm text-slate-400 mt-1">Create quizzes for your students.</p></div>}
              {activeTab === 'submissions'   && <SubmissionsTab  assignmentId={id} />}
              {activeTab === 'attendance'    && <AttendanceTab   assignmentId={id} />}
              {activeTab === 'progress'      && <ProgressTab     assignmentId={id} />}
              {activeTab === 'announcements' && <AnnouncementsTab assignmentId={id} />}
            </div>
          </>
        )}
      </div>
    </InstructorLayout>
  );
}
