import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [childForm, setChildForm] = useState({ full_name: '', date_of_birth: '', age_group_id: '' });
  const [inviteResult, setInviteResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showAddChild, setShowAddChild] = useState(false);
  const [selectedChildTab, setSelectedChildTab] = useState('progress');

  async function loadAll() {
    setLoading(true);
    try {
      const [childrenRes, ageGroupsRes, notifRes] = await Promise.all([
        axiosClient.get('/students/children'),
        axiosClient.get('/age-groups'),
        axiosClient.get('/notifications'),
      ]);
      setChildren(childrenRes.data.children);
      setAgeGroups(ageGroupsRes.data.age_groups);
      setNotifications(notifRes.data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleAddChild(e) {
    e.preventDefault();
    setError('');
    setInviteResult(null);
    setSubmitting(true);
    try {
      const selectedGroup = ageGroups.find((ag) => String(ag.id) === String(childForm.age_group_id));
      if (!selectedGroup) throw new Error('Select an age group');
      if (selectedGroup.requires_account) {
        const { data } = await axiosClient.post('/auth/students/invite', childForm);
        setInviteResult(data.invite_code);
      } else {
        await axiosClient.post('/students/children', childForm);
      }
      setChildForm({ full_name: '', date_of_birth: '', age_group_id: '' });
      setShowAddChild(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not add child');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedGroup = ageGroups.find((ag) => String(ag.id) === String(childForm.age_group_id));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">👨‍👩‍👧 My Children</h1>
            <p className="text-slate-500 mt-1">Manage your children's learning journey</p>
          </div>
          <button
            onClick={() => setShowAddChild(true)}
            className="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white hover:bg-violet-600 transition shadow-lg"
          >
            + Add Child
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-slate-200">
          {['overview', 'notifications'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold text-sm transition border-b-2 ${
                activeTab === tab
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : '🔔 Notifications'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-10">Loading...</p>
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                {showAddChild && (
                  <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg border border-violet-100">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Add a Child</h3>
                    <form onSubmit={handleAddChild} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input required placeholder="Full Name" value={childForm.full_name} onChange={(e) => setChildForm((f) => ({ ...f, full_name: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                        <input required type="date" value={childForm.date_of_birth} onChange={(e) => setChildForm((f) => ({ ...f, date_of_birth: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                        <select required value={childForm.age_group_id} onChange={(e) => setChildForm((f) => ({ ...f, age_group_id: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3">
                          <option value="">Select age group</option>
                          {ageGroups.map((ag) => (
                            <option key={ag.id} value={ag.id}>{ag.name}</option>
                          ))}
                        </select>
                      </div>
                      {selectedGroup && (
                        <p className="text-xs text-slate-500">
                          {selectedGroup.requires_account
                            ? 'This age group creates its own login — you\'ll get an invite code.'
                            : 'This age group has no login — you\'ll manage lessons and activities directly.'}
                        </p>
                      )}
                      {error && <p className="text-sm text-rose-600">{error}</p>}
                      {inviteResult && (
                        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                          Invite code: <span className="font-mono font-semibold">{inviteResult}</span>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                          {submitting ? 'Adding...' : 'Add Child'}
                        </button>
                        <button type="button" onClick={() => setShowAddChild(false)} className="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-200">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {children.map((child) => (
                    <div key={child.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-lg transition cursor-pointer" onClick={() => { setSelectedChild(child); setSelectedChildTab('progress'); }}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">{child.full_name}</h3>
                          <p className="text-sm text-slate-500">{child.age_group}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${child.has_own_account ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {child.has_own_account ? 'Own Login' : 'Parent-Managed'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">DOB: {new Date(child.date_of_birth).toLocaleDateString()}</p>
                        {child.has_own_account && (
                          <>
                            <p className="text-sm text-slate-600">Email: {child.user_email || '—'}</p>
                            <p className="text-sm text-slate-600">Last Login: {child.last_login_at ? new Date(child.last_login_at).toLocaleDateString() : 'Never'}</p>
                          </>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className="flex-1 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100">View Progress</button>
                        {child.has_own_account && (
                          <button className="flex-1 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100">Manage Account</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {children.length === 0 && <p className="col-span-full text-center text-slate-500 py-10">No children added yet.</p>}
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-500 py-10">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-sm text-slate-500 mt-1">{n.message}</p>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Child Detail Modal */}
        {selectedChild && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedChild(null)}>
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">{selectedChild.full_name}</h2>
                <button onClick={() => setSelectedChild(null)} className="text-2xl text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-4">
                <p><span className="font-medium">Age Group:</span> {selectedChild.age_group}</p>
                <p><span className="font-medium">Account Type:</span> {selectedChild.has_own_account ? 'Own Login' : 'Parent-Managed'}</p>
                {selectedChild.has_own_account && (
                  <>
                    <p><span className="font-medium">Last Login:</span> {selectedChild.last_login_at ? new Date(selectedChild.last_login_at).toLocaleString() : 'Never'}</p>
                    <button className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-600 transition">Reset Password</button>
                  </>
                )}
                {!selectedChild.has_own_account && (
                  <>
                    <p className="text-sm text-slate-500">This child uses the parent account. No separate login required.</p>
                    <div className="flex gap-3">
                      <button className="flex-1 rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white hover:bg-violet-600 transition">Open Lessons</button>
                      <button className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-white hover:bg-amber-600 transition">View Progress</button>
                    </div>
                  </>
                )}
                <button onClick={() => setSelectedChild(null)} className="w-full rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-600 hover:bg-slate-200 transition">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}