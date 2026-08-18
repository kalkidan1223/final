import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const emptyChildForm = {
    full_name: '', date_of_birth: '', gender: '', grade: '', section: '', current_grade: '',
    academic_year: '', preferred_language: '', admission_number: '', previous_school: '',
    blood_group: '', medical_condition: '', learning_disability: '', student_email: '',
    username: '', password: '', confirm_password: '', recovery_email: '', parent_confirmation: false,
  };
  const [childForm, setChildForm] = useState(emptyChildForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showAddChild, setShowAddChild] = useState(false);
  const [selectedChildTab, setSelectedChildTab] = useState('progress');

  async function loadAll() {
    setLoading(true);
    try {
      const [childrenRes, requestsRes, ageGroupsRes, notifRes] = await Promise.all([
        axiosClient.get('/students/children'),
        axiosClient.get('/students/registration-requests'),
        axiosClient.get('/age-groups'),
        axiosClient.get('/notifications'),
      ]);
      setChildren(childrenRes.data.children);
      setRegistrationRequests(requestsRes.data.registration_requests);
      setAgeGroups(ageGroupsRes.data.age_groups);
      setNotifications(notifRes.data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function markNotificationRead(id) {
    try {
      const { data } = await axiosClient.patch(`/notifications/${id}/read`);
      setNotifications((items) => items.map((item) => item.id === id ? data.notification : item));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the notification');
    }
  }

  async function handleAddChild(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (needsStudentAccount && childForm.password !== childForm.confirm_password) {
        throw new Error('Student passwords do not match');
      }
      if (!childForm.parent_confirmation) {
        throw new Error('Please confirm that the child information is correct.');
      }
      await axiosClient.post('/students/registration-requests', childForm);
      setChildForm(emptyChildForm);
      setShowAddChild(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not add child');
    } finally {
      setSubmitting(false);
    }
  }

  const calculatedAge = childForm.date_of_birth
    ? Math.max(0, new Date().getFullYear() - new Date(childForm.date_of_birth).getFullYear() -
      (new Date() < new Date(new Date(childForm.date_of_birth).setFullYear(new Date().getFullYear())) ? 1 : 0))
    : null;
  const needsStudentAccount = calculatedAge !== null && calculatedAge >= 10 && calculatedAge <= 12;
  const averageProgress = children.length ? Math.round(children.reduce((sum, child) => sum + Number(child.progress_percentage || 0), 0) / children.length) : 0;
  const accountChildren = children.filter((child) => child.has_own_account).length;

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

        <section className="mb-8 rounded-3xl bg-gradient-to-r from-sky-600 to-blue-700 p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-sky-100">Parent Portal</p>
          <h2 className="mt-1 text-2xl font-bold">Welcome back, {user?.full_name?.split(' ')[0] || 'Parent'}!</h2>
          <p className="mt-2 text-sm text-sky-100">Your family learning summary for today.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['Approved children', children.length], ['Parent managed', children.length - accountChildren], ['Student accounts', accountChildren], ['Average progress', `${averageProgress}%`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/15 p-3"><p className="text-xs text-sky-100">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}
          </div>
        </section>

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
                    <h3 className="text-lg font-semibold text-slate-700 mb-1">Register a child</h3>
                    <p className="mb-5 text-sm text-slate-500">Complete the child profile. An administrator reviews every registration before learning access begins.</p>
                    <form onSubmit={handleAddChild} className="space-y-4">
                      <fieldset className="rounded-2xl border border-slate-200 p-4">
                        <legend className="px-2 text-sm font-bold text-slate-700">1. Child information</legend>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required placeholder="Full Name" value={childForm.full_name} onChange={(e) => setChildForm((f) => ({ ...f, full_name: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                        <input required type="date" max={new Date().toISOString().slice(0, 10)} aria-label="Date of birth" value={childForm.date_of_birth} onChange={(e) => setChildForm((f) => ({ ...f, date_of_birth: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                        <select required value={childForm.gender} onChange={(e) => setChildForm((f) => ({ ...f, gender: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3">
                          <option value="">Select gender</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                        <select required value={childForm.preferred_language} onChange={(e) => setChildForm((f) => ({ ...f, preferred_language: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3"><option value="">Preferred learning language</option><option value="English">English</option><option value="Amharic">Amharic</option><option value="Afan Oromo">Afan Oromo</option><option value="Tigrinya">Tigrinya</option><option value="Other">Other</option></select>
                      </div>
                      </fieldset>
                      {calculatedAge !== null && (
                        <p className="hidden">
                          {needsStudentAccount
                            ? 'This age group creates its own login — you\'ll get an invite code.'
                            : 'This age group has no login — you\'ll manage lessons and activities directly.'}
                        </p>
                      )}
                      {calculatedAge !== null && <div className={`rounded-xl p-4 text-sm ${calculatedAge < 5 || calculatedAge > 12 ? 'bg-rose-50 text-rose-700' : needsStudentAccount ? 'bg-sky-50 text-sky-800' : 'bg-emerald-50 text-emerald-800'}`}>{calculatedAge < 5 || calculatedAge > 12 ? 'This platform accepts children aged 5 to 12 only.' : needsStudentAccount ? `Age ${calculatedAge}: independent account after administrator approval.` : `Age ${calculatedAge}: parent-managed learning with no separate child login.`}</div>}
                      <fieldset className="rounded-2xl border border-slate-200 p-4">
                        <legend className="px-2 text-sm font-bold text-slate-700">2. School information</legend>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <input required placeholder="Current grade" value={childForm.current_grade} onChange={(e) => setChildForm((f) => ({ ...f, current_grade: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input required placeholder="Academic year (for example, 2026/27)" value={childForm.academic_year} onChange={(e) => setChildForm((f) => ({ ...f, academic_year: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input placeholder="Class / section (optional)" value={childForm.section} onChange={(e) => setChildForm((f) => ({ ...f, section: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input placeholder="Admission number (optional)" value={childForm.admission_number} onChange={(e) => setChildForm((f) => ({ ...f, admission_number: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input placeholder="Previous school (optional)" value={childForm.previous_school} onChange={(e) => setChildForm((f) => ({ ...f, previous_school: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2" />
                        </div>
                      </fieldset>
                      <fieldset className="rounded-2xl border border-slate-200 p-4">
                        <legend className="px-2 text-sm font-bold text-slate-700">3. Health and learning support <span className="font-normal text-slate-400">(optional)</span></legend>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <select value={childForm.blood_group} onChange={(e) => setChildForm((f) => ({ ...f, blood_group: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3"><option value="">Blood group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => <option key={value}>{value}</option>)}</select>
                          <input placeholder="Learning support needs (optional)" value={childForm.learning_disability} onChange={(e) => setChildForm((f) => ({ ...f, learning_disability: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <textarea placeholder="Medical information the school should know (optional)" value={childForm.medical_condition} onChange={(e) => setChildForm((f) => ({ ...f, medical_condition: e.target.value }))} className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 md:col-span-2" />
                        </div>
                      </fieldset>
                      {needsStudentAccount && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-sky-50 p-4">
                          <p className="md:col-span-2 text-sm font-semibold text-sky-800">4. Independent student account — activated after administrator approval</p>
                          <input required type="email" placeholder="Student email" value={childForm.student_email} onChange={(e) => setChildForm((f) => ({ ...f, student_email: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input minLength="3" placeholder="Preferred username (optional)" value={childForm.username} onChange={(e) => setChildForm((f) => ({ ...f, username: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input required type="password" placeholder="Student password" value={childForm.password} onChange={(e) => setChildForm((f) => ({ ...f, password: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input required type="password" placeholder="Confirm student password" value={childForm.confirm_password} onChange={(e) => setChildForm((f) => ({ ...f, confirm_password: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3" />
                          <input type="email" placeholder="Recovery email (optional)" value={childForm.recovery_email} onChange={(e) => setChildForm((f) => ({ ...f, recovery_email: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 md:col-span-2" />
                        </div>
                      )}
                      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><input required type="checkbox" checked={childForm.parent_confirmation} onChange={(e) => setChildForm((f) => ({ ...f, parent_confirmation: e.target.checked }))} className="mt-1 h-4 w-4" /><span>I confirm that I am authorized to register this child and that the information is accurate.</span></label>
                      {error && <p className="text-sm text-rose-600">{error}</p>}
                      <div className="flex gap-3">
                        <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                          {submitting ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                        <button type="button" onClick={() => setShowAddChild(false)} className="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-600 hover:bg-slate-200">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {children.map((child) => (
                    <div key={child.id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-lg transition">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">{child.full_name}</h3>
                        <p className="text-sm text-slate-500">{child.age_group}{child.grade ? ` · ${child.grade}` : ''}{child.section ? ` (${child.section})` : ''}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${child.has_own_account ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {child.has_own_account ? 'Own Login' : 'Parent-Managed'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">DOB: {new Date(child.date_of_birth).toLocaleDateString()}</p>
                        <div><div className="mb-1 flex justify-between text-xs text-slate-500"><span>Learning progress</span><span>{child.progress_percentage || 0}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${child.progress_percentage || 0}%` }} /></div></div>
                        {child.has_own_account && (
                          <>
                            <p className="text-sm text-slate-600">Email: {child.user_email || '—'}</p>
                            <p className="text-sm text-slate-600">Last Login: {child.last_login_at ? new Date(child.last_login_at).toLocaleDateString() : 'Never'}</p>
                            <p className={`text-xs font-semibold ${child.student_account_active ? 'text-emerald-700' : 'text-amber-700'}`}>Account: {child.student_account_active ? 'Active' : 'Inactive'}</p>
                          </>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Link to={`/parent/children/${child.id}`} className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-sky-700">Open Learning Space</Link>
                        {child.has_own_account && (
                          <button onClick={() => setSelectedChild(child)} className="flex-1 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100">Account details</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {children.length === 0 && <p className="col-span-full text-center text-slate-500 py-10">No children added yet.</p>}
                </div>
                {registrationRequests.length > 0 && (
                  <section className="mt-10">
                    <h2 className="mb-4 text-xl font-bold text-slate-800">Child registration requests</h2>
                    <div className="space-y-3">
                      {registrationRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div>
                            <p className="font-semibold text-slate-800">{request.student_full_name}</p>
                            <p className="text-sm text-slate-500">Age {request.age} · {request.has_own_account ? 'Student account' : 'Parent-managed'}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : request.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{request.status}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-500 py-10">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition ${n.is_read ? '' : 'border-sky-200 bg-sky-50/40'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-sm text-slate-500 mt-1">{n.message}</p>
                        </div>
                        <div className="text-right"><span className="block text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>{!n.is_read && <button onClick={() => markNotificationRead(n.id)} className="mt-2 text-xs font-semibold text-sky-700 hover:underline">Mark as read</button>}</div>
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
                    <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">For security, student passwords are never displayed to parents. Use the account recovery process if the student cannot sign in.</p>
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
