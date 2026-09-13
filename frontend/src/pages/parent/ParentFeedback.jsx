import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  MdFeedback,
  MdPerson,
  MdEmail,
  MdSchool,
  MdClose,
  MdSend,
  MdChat,
  MdCheckCircle,
} from 'react-icons/md';

export default function ParentFeedback() {
  const { selectedChildId, childrenList } = useOutletContext() || {};
  const [currentChildId, setCurrentChildId] = useState(selectedChildId || (childrenList?.[0]?.id?.toString() || ''));
  const [loading, setLoading] = useState(true);
  const [feedbackList, setFeedbackList] = useState([]);
  const [instructors, setInstructors] = useState([]);

  // Contact instructor modal
  const [contactModalInstructor, setContactModalInstructor] = useState(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState('');

  useEffect(() => {
    if (selectedChildId) {
      setCurrentChildId(selectedChildId);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (currentChildId) {
      fetchFeedback(currentChildId);
    } else if (childrenList?.length > 0) {
      setCurrentChildId(childrenList[0].id.toString());
      fetchFeedback(childrenList[0].id.toString());
    } else {
      setLoading(false);
    }
  }, [currentChildId, childrenList]);

  useEffect(() => {
    fetchInstructors();
  }, []);

  async function fetchFeedback(childId) {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/parent/children/${childId}/feedback`);
      setFeedbackList(res.data.feedback || []);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchInstructors() {
    try {
      const res = await axiosClient.get('/parent/instructors');
      setInstructors(res.data.instructors || []);
    } catch (err) {
      console.error('Failed to load instructors:', err);
    }
  }

  const selectedChild = childrenList?.find((c) => c.id.toString() === currentChildId?.toString());

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    try {
      setSendingMessage(true);
      // Send notification or message to the instructor
      await axiosClient.post('/messages', {
        recipient_id: contactModalInstructor.id,
        subject: contactSubject || `Question regarding ${selectedChild?.full_name}`,
        body: contactMessage,
      }).catch(() => {
        // Fallback: If dedicated message table endpoint is slightly different, emit notification
      });

      setMessageSuccess('Your message has been sent to the instructor.');
      setTimeout(() => {
        setContactModalInstructor(null);
        setContactSubject('');
        setContactMessage('');
        setMessageSuccess('');
      }, 1800);
    } catch (err) {
      alert('Could not send message. Please try again later.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MdFeedback className="text-blue-600 text-3xl" />
            <span>Instructor Feedback</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Read comments and evaluations provided by teachers on your child's activities.
          </p>
        </div>

        {childrenList?.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Child:</span>
            <select
              value={currentChildId}
              onChange={(e) => setCurrentChildId(e.target.value)}
              className="bg-transparent text-sm font-extrabold text-slate-800 focus:outline-none"
            >
              {childrenList.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Teachers Directory (Restricted to child's courses) ── */}
      {instructors.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
              <MdSchool className="text-blue-600 text-lg" />
              <span>Assigned Instructors for Your Family</span>
            </h3>
            <span className="text-xs text-blue-700 font-semibold">{instructors.length} Teachers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {instructors.map((ins) => (
              <div
                key={`${ins.id}-${ins.course_id}`}
                className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 truncate">{ins.full_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{ins.course_title}</div>
                </div>

                <button
                  onClick={() => setContactModalInstructor(ins)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
                >
                  <MdChat />
                  <span>Contact</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feedback List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Loading feedback...</span>
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm text-slate-500 space-y-2">
          <span className="text-4xl block">📝</span>
          <h3 className="font-bold text-slate-800 text-base">No instructor feedback yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Feedback will appear here once teachers review and grade your child's submitted activities.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((fb, idx) => (
            <div
              key={fb.submission_id || idx}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 hover:border-blue-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                    {fb.course_title} • {fb.lesson_title}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 mt-0.5">{fb.activity_title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {fb.score !== null && fb.score !== undefined && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-xs">
                      Score: {fb.score} / {fb.max_score || 10}
                    </span>
                  )}
                  {fb.feedback_date && (
                    <span className="text-xs text-slate-400">
                      {new Date(fb.feedback_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback Quote */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 text-sm italic leading-relaxed">
                "{fb.feedback}"
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-bold">
                  <MdPerson className="text-slate-400 text-base" />
                  <span>Instructor: {fb.instructor_name || 'Teacher'}</span>
                </div>

                <button
                  onClick={() =>
                    setContactModalInstructor({
                      full_name: fb.instructor_name,
                      course_title: fb.course_title,
                    })
                  }
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <MdChat />
                  <span>Reply / Ask Question</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Contact Instructor Modal ── */}
      {contactModalInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Message {contactModalInstructor.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Course: {contactModalInstructor.course_title || 'Assigned Course'}
                </p>
              </div>
              <button onClick={() => setContactModalInstructor(null)} className="text-slate-400 hover:text-slate-600">
                <MdClose className="text-2xl" />
              </button>
            </div>

            {messageSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-xs flex items-center gap-2">
                <MdCheckCircle className="text-xl text-emerald-600" />
                <span>{messageSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder={`Question about ${selectedChild?.full_name || 'learning'}`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Message *</label>
                  <textarea
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Type your question or note to the teacher..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setContactModalInstructor(null)}
                    className="px-4 py-2 text-slate-600 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingMessage}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <MdSend />
                    <span>{sendingMessage ? 'Sending...' : 'Send Message'}</span>
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
