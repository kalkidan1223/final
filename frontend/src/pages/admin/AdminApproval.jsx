import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import axiosClient from '../../api/axiosClient';

function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-violet-100 text-violet-700',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}

function ActionButton({ label, onClick, color }) {
  const colors = {
    approve: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    reject: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
    suspend: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200',
    view: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200',
  };
  return (
    <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${colors[color] || colors.view}`}>
      {label}
    </button>
  );
}

export default function AdminApproval() {
  const [activeTab, setActiveTab] = useState('parent-requests');
  const [parentRequests, setParentRequests] = useState([]);
  const [studentRequests, setStudentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAction, setShowAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionNote, setActionNote] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [prRes, srRes, alRes] = await Promise.all([
        axiosClient.get('/admin/approval/registration-requests?status=pending'),
        axiosClient.get('/admin/approval/student-registration-requests?status=pending'),
        axiosClient.get('/admin/approval/audit-logs?limit=20'),
      ]);
      setParentRequests(prRes.data.registration_requests || []);
      setStudentRequests(srRes.data.student_registration_requests || []);
      setAuditLogs(alRes.data.audit_logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleAction(id, action) {
    if (action === 'reject' && actionReason.length < 10) {
      alert('Rejection reason must be at least 10 characters');
      return;
    }
    try {
      if (activeTab === 'parent-requests') {
        if (action === 'approve') await axiosClient.patch(`/admin/approval/registration-requests/${id}/approve`, { notes: actionNote });
        else if (action === 'reject') await axiosClient.patch(`/admin/approval/registration-requests/${id}/reject`, { reason: actionReason });
        else if (action === 'suspend') await axiosClient.patch(`/admin/approval/registration-requests/${id}/suspend`, { reason: actionReason });
      } else {
        if (action === 'approve') await axiosClient.patch(`/admin/approval/student-registration-requests/${id}/approve`, { notes: actionNote });
        else if (action === 'reject') await axiosClient.patch(`/admin/approval/student-registration-requests/${id}/reject`, { reason: actionReason });
      }
      setShowAction(null);
      setActionReason('');
      setActionNote('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">📋 Admin Approvals</h1>
        <p className="text-slate-500 mb-8">Review and approve parent and student registration requests.</p>

        <div className="flex gap-2 mb-8 border-b border-slate-200">
          {['parent-requests', 'student-requests', 'audit-logs'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 font-semibold text-sm transition border-b-2 ${activeTab === tab ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab === 'parent-requests' ? '👨‍👩‍👧 Parent Requests' : tab === 'student-requests' ? '🎓 Student Requests' : '📝 Audit Logs'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading...</p>
        ) : (
          <>
            {activeTab === 'parent-requests' && (
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-violet-50">
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-violet-700">Photo</th>
                        <th className="px-4 py-3 text-sm font-semibold text-violet-700">Full Name</th>
                        <th className="px-4 py-3 text-sm font-semibold text-violet-700">Email</th>
                        <th className="px-4 py-3 text-sm font-semibold text-violet-700">Phone</th>
                        <th className="px-4 py-3 text-sm font-semibold text-violet-700">Registered</th>
                        <th className="px-4 py-3 text-sm font-semibold text-violet-700">Status</th>
                        <th className="px-4 py-3 text-sm font-semibold text-violet-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-violet-50/50 transition">
                          <td className="px-4 py-3">
                            {req.profile_image_url ? (
                              <img src={req.profile_image_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-lg">👤</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{req.full_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{req.email}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{req.phone}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{new Date(req.submitted_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              <ActionButton label="View" color="view" onClick={() => setSelectedRequest(req)} />
                              {req.status === 'pending' && (
                                <>
                                  <ActionButton label="✓ Approve" color="approve" onClick={() => { setShowAction({ type: 'approve', id: req.id }); setActionNote(''); }} />
                                  <ActionButton label="✗ Reject" color="reject" onClick={() => { setShowAction({ type: 'reject', id: req.id }); setActionReason(''); }} />
                                  <ActionButton label="⏸ Suspend" color="suspend" onClick={() => { setShowAction({ type: 'suspend', id: req.id }); setActionReason(''); }} />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {parentRequests.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">No pending parent registration requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'student-requests' && (
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-sky-50">
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-sky-700">Student</th>
                        <th className="px-4 py-3 text-sm font-semibold text-sky-700">Parent</th>
                        <th className="px-4 py-3 text-sm font-semibold text-sky-700">Age</th>
                        <th className="px-4 py-3 text-sm font-semibold text-sky-700">Grade</th>
                        <th className="px-4 py-3 text-sm font-semibold text-sky-700">Email</th>
                        <th className="px-4 py-3 text-sm font-semibold text-sky-700">Status</th>
                        <th className="px-4 py-3 text-sm font-semibold text-sky-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-sky-50/50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{req.student_full_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{req.parent_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{req.age}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{req.grade || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{req.student_email}</td>
                          <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {req.status === 'pending' && (
                                <>
                                  <ActionButton label="✓ Approve" color="approve" onClick={() => { setShowAction({ type: 'approve', id: req.id }); setActionNote(''); }} />
                                  <ActionButton label="✗ Reject" color="reject" onClick={() => { setShowAction({ type: 'reject', id: req.id }); setActionReason(''); }} />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {studentRequests.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">No pending student registration requests.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Action Modal */}
                {showAction && showAction.type === 'approve' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAction(null)}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-xl font-bold text-slate-800 mb-4">✓ Approve Registration</h3>
                      <textarea placeholder="Approval notes (optional)" value={actionNote} onChange={(e) => setActionNote(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 mb-4 text-sm" rows={3} />
                      <div className="flex gap-3">
                        <button onClick={() => handleAction(showAction.id, 'approve')} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600 transition">Confirm Approval</button>
                        <button onClick={() => setShowAction(null)} className="rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {showAction && (showAction.type === 'reject' || showAction.type === 'suspend') && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAction(null)}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-xl font-bold text-slate-800 mb-4">
                        {showAction.type === 'reject' ? '✗ Reject Registration' : '⏸ Suspend Registration'}
                      </h3>
                      <textarea required placeholder="Enter reason (minimum 10 characters)" value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 mb-4 text-sm" rows={3} />
                      <div className="flex gap-3">
                        <button onClick={() => handleAction(showAction.id, showAction.type)} className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-semibold text-white hover:bg-red-600 transition">Confirm</button>
                        <button onClick={() => setShowAction(null)} className="rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'audit-logs' && (
              <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-700">Action</th>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-700">Entity</th>
                        <th className="px-4 py-3 text-sm font-semibold text-slate-700">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 font-medium text-slate-800">{log.action}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{log.entity_type} #{log.entity_id}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-500">No audit logs found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}