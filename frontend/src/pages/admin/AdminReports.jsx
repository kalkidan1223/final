import { useEffect, useState, useCallback } from 'react';
import { MdAssessment, MdRefresh, MdDownload, MdAdd, MdFilterList } from 'react-icons/md';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

const REPORT_TYPES = [
  { value: 'student_performance', label: 'Student Performance', color: 'bg-sky-500', desc: 'Quiz scores, activity grades, progress' },
  { value: 'course_summary', label: 'Course Summary', color: 'bg-violet-500', desc: 'Lesson counts, enrollments, completion' },
  { value: 'attendance_report', label: 'Attendance Report', color: 'bg-emerald-500', desc: 'Present, absent, late statistics' },
  { value: 'instructor_activity', label: 'Instructor Activity', color: 'bg-amber-500', desc: 'Courses created, lessons taught' },
  { value: 'ai_recommendation', label: 'AI Recommendations', color: 'bg-indigo-500', desc: 'Generated, viewed, acted upon' },
  { value: 'registration_summary', label: 'Registration Summary', color: 'bg-rose-500', desc: 'New parents, students, approvals' },
];

function downloadCSV(data, filename) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCard({ type, onGenerate, generating }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${type.color} flex items-center justify-center flex-shrink-0`}>
          <MdAssessment className="text-xl text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{type.label}</h3>
          <p className="text-xs text-slate-500">{type.desc}</p>
        </div>
      </div>
      <button
        onClick={() => onGenerate(type.value)}
        disabled={generating === type.value}
        className="w-full rounded-xl bg-slate-50 hover:bg-violet-50 hover:text-violet-700 border border-slate-200 hover:border-violet-200 text-slate-600 py-2 text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {generating === type.value
          ? <><div className="h-3 w-3 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />Generating…</>
          : <><MdAdd className="text-sm" />Generate Report</>
        }
      </button>
    </div>
  );
}

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('report_type', typeFilter);
      const { data } = await axiosClient.get(`/admin/reports?${params}`);
      setReports(data.reports || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  async function handleGenerate(type) {
    setGenerating(type);
    setError('');
    try {
      await axiosClient.post('/admin/reports/generate', { report_type: type });
      setSuccess(`${REPORT_TYPES.find(t => t.value === type)?.label} generated successfully`);
      setTimeout(() => setSuccess(''), 3000);
      loadReports(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating('');
    }
  }

  function handleExportCSV(report) {
    const data = report.data;
    const rows = Array.isArray(data) ? data : (data?.rows || [data]);
    downloadCSV(rows, `${report.report_type}_${new Date(report.created_at).toISOString().split('T')[0]}`);
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5"><MdAssessment className="text-xl text-white" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
              <p className="text-sm text-slate-500">Generate and export platform reports</p>
            </div>
          </div>
          <button onClick={() => loadReports(true)} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
            <MdRefresh className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>

        {error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Generate cards */}
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-3">Generate New Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPES.map(type => (
              <ReportCard key={type.value} type={type} onGenerate={handleGenerate} generating={generating} />
            ))}
          </div>
        </div>

        {/* Filter + Report History */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold text-slate-700">Report History</h2>
            <div className="flex items-center gap-2">
              <MdFilterList className="text-slate-400" />
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-400 focus:outline-none">
                <option value="">All Types</option>
                {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Type', 'Generated By', 'Student', 'Date', 'Export'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? [...Array(4)].map((_, i) => (
                    <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                  )) : reports.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">No reports generated yet. Use the cards above to generate your first report.</td></tr>
                  ) : reports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-violet-100 text-violet-700 px-2.5 py-0.5 text-xs font-medium">
                          {r.report_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.generated_by_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{r.student_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleExportCSV(r)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-medium transition"
                        >
                          <MdDownload className="text-sm" />CSV
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
