import { useState } from 'react';
import {
  MdHelp,
  MdLightbulb,
  MdSchool,
  MdChildCare,
  MdExpandMore,
  MdCheckCircle,
  MdContactSupport,
  MdPlayCircleFilled,
  MdClose,
  MdSend,
  MdAdminPanelSettings,
} from 'react-icons/md';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const FAQS = [
  {
    q: 'How does parent-managed learning work for children aged 5–9?',
    a: 'Children aged 5 to 9 do not need their own email or password. You as a parent manage their profile, view their lessons, and can click "Learn with Child" to launch their interactive portal. You can guide them through audio lessons, matching games, and drawing exercises.',
  },
  {
    q: 'Why is my 10–12 year old child’s account "Pending Approval"?',
    a: 'For older children (ages 10–12), independent student logins are created by the parent. To protect child safety and verify identity, an Administrator reviews the registration request before activating the account. Once approved, you will receive a notification and your child can log in.',
  },
  {
    q: 'Can I help submit worksheets or activities on behalf of my child?',
    a: 'Yes! In the Activities page or Child Learning Space, you can assist your younger child by submitting their written answers, notes, or uploading photos of their completed paper worksheets directly to their instructor.',
  },
  {
    q: 'How are courses assigned to my child?',
    a: 'Courses are organized by the grade level you select for your child. Their date of birth is kept for safeguarding and age-appropriate presentation; it does not determine their curriculum.',
  },
  {
    q: 'Can I message my child’s teacher directly?',
    a: 'Yes. In the Instructor Feedback section, you will see the list of teachers assigned to your child’s courses. You can click "Reply / Ask Question" to send a direct message regarding your child’s learning activities.',
  },
  {
    q: 'How can I message the System Administrator?',
    a: 'You can click the "Contact Administrator" button right below on this Help page. Your inquiry will be sent directly to the administrative team, and you will receive a notification when they review your request.',
  },
];

export default function ParentHelp() {
  const [openIndex, setOpenIndex] = useState(0);

  // Contact Admin modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminSubject, setAdminSubject]     = useState('');
  const [adminMessage, setAdminMessage]     = useState('');
  const [sendingAdmin, setSendingAdmin]     = useState(false);
  const [adminSuccess, setAdminSuccess]     = useState('');

  const handleSendToAdmin = async (e) => {
    e.preventDefault();
    if (!adminMessage.trim()) return;

    setSendingAdmin(true);
    try {
      // Find an administrator ID
      const { data: adminData } = await axiosClient.get('/messages/admins');
      const admin = adminData.admins?.[0];

      if (!admin?.id) {
        throw new Error('No administrator found');
      }

      await axiosClient.post('/messages', {
        receiver_id: admin.id,
        body: adminMessage.trim(),
        subject: adminSubject.trim() || 'Parent Support Inquiry',
      });

      setAdminSuccess('Your message has been sent to the Administrator.');
      setTimeout(() => {
        setShowAdminModal(false);
        setAdminSubject('');
        setAdminMessage('');
        setAdminSuccess('');
      }, 2000);
    } catch (err) {
      alert('Could not send message to admin. Please try again later.');
    } finally {
      setSendingAdmin(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdHelp className="text-blue-600 text-3xl" />
            <span>Parent Help & Support</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Guidance, tips, FAQs, and direct communication with teachers and administrators.
          </p>
        </div>

        <button
          onClick={() => setShowAdminModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
        >
          <MdContactSupport className="text-lg" />
          <span>Message Administrator</span>
        </button>
      </div>

      {/* ── Best Practices for Supporting Young Learners ── */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-wider text-amber-300">
          <MdLightbulb className="text-lg" />
          <span>Tips for Supporting Your Child</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black">How to Learn Together Effectively</h2>
          <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed max-w-2xl">
            Young children thrive when learning is paired with encouragement. Use these simple routines to make home learning fun and motivating:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-2xl block">🎧</span>
            <h4 className="font-extrabold text-sm text-white">Listen Together</h4>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Play the letter audio and pronunciation tracks together. Ask your child to repeat sounds out loud.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-2xl block">✏️</span>
            <h4 className="font-extrabold text-sm text-white">Worksheet Practice</h4>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Open the printable worksheets and guide their pencil strokes on paper before submitting results.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-2xl block">🔥</span>
            <h4 className="font-extrabold text-sm text-white">Consistent Streak</h4>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Aim for just 15–20 minutes each day to maintain your child's learning flame and milestone badges.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-indigo-300">Ready to start today's lesson?</span>
          <Link
            to="/parent/children"
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <MdPlayCircleFilled className="text-base" />
            <span>Go to My Children</span>
          </Link>
        </div>
      </div>

      {/* ── Two Account Models Explained ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl">
            <MdChildCare />
          </div>
          <h3 className="font-black text-base text-slate-900">Ages 5–9: Parent-Managed</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Designed for kindergarten and early primary. The child does not need credentials. You launch their portal with one click, help submit answers, and receive teacher feedback directly in your portal.
          </p>
          <div className="text-xs font-bold text-purple-700 pt-1">
            ✓ Full parent guidance • No password needed
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl">
            <MdSchool />
          </div>
          <h3 className="font-black text-base text-slate-900">Ages 10–12: Independent Account</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            For older students who practice self-guided learning. Parents create their student login. Requires administrator verification before the child can log in independently.
          </p>
          <div className="text-xs font-bold text-blue-700 pt-1">
            ✓ Independent login • Admin verified
          </div>
        </div>
      </div>

      {/* ── Frequently Asked Questions ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg text-slate-900">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-500">Quick answers to common parent inquiries</p>
          </div>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="border border-slate-200 rounded-2xl overflow-hidden transition">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="w-full px-4 py-3.5 text-left font-extrabold text-sm text-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <span>{faq.q}</span>
                  <MdExpandMore
                    className={`text-xl text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 py-3 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Direct Contact Section ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-extrabold text-sm text-slate-900">Need personal support from the School Admin?</h4>
          <p className="text-xs text-slate-600">
            Have questions about student approvals, course materials, or technical issues? Message the Administrator directly.
          </p>
        </div>
        <button
          onClick={() => setShowAdminModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition whitespace-nowrap"
        >
          Contact Administrator
        </button>
      </div>

      {/* ── Contact Admin Modal ── */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl">
                  <MdAdminPanelSettings />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Message Administrator</h3>
                  <p className="text-xs text-slate-500">Children Learning Hub Administration & Support</p>
                </div>
              </div>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-slate-600">
                <MdClose className="text-2xl" />
              </button>
            </div>

            {adminSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-xs flex items-center gap-2">
                <MdCheckCircle className="text-xl text-emerald-600" />
                <span>{adminSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSendToAdmin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={adminSubject}
                    onChange={(e) => setAdminSubject(e.target.value)}
                    placeholder="e.g. Account verification, child registration, course question"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message *</label>
                  <textarea
                    rows={4}
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    placeholder="Describe your inquiry or request in detail..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="px-4 py-2 text-slate-600 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingAdmin}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <MdSend />
                    <span>{sendingAdmin ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
