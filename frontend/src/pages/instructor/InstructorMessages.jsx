import { useEffect, useState } from 'react';
import { MdMessage, MdSend, MdSearch, MdAdd, MdClose, MdPerson, MdAdminPanelSettings } from 'react-icons/md';
import InstructorLayout from '../../components/InstructorLayout';
import axiosClient from '../../api/axiosClient';

export default function InstructorMessages() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [newMsg, setNewMsg]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [search, setSearch]               = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // New Conversation Modal
  const [showNewModal, setShowNewModal]   = useState(false);
  const [contacts, setContacts]           = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);
      const { data } = await axiosClient.get('/messages/conversations');
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    setSelectedStudentId('');
    const targetUserId = selected.other_user_id || selected.receiver_id || selected.id;
    axiosClient.get(`/messages/conversations/${targetUserId}`)
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => setMessages([]));
  }, [selected]);

  async function openNewConversationModal() {
    setShowNewModal(true);
    setLoadingContacts(true);
    try {
      const { data } = await axiosClient.get('/messages/contacts');
      setContacts(data.contacts || []);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }

  function startConversationWith(contact) {
    setShowNewModal(false);
    const existing = conversations.find(
      c => (c.other_user_id || c.receiver_id) === contact.id
    );

    if (existing) {
      // Merge children if available
      setSelected({
        ...existing,
        children: contact.children || existing.children || [],
      });
    } else {
      const newConv = {
        other_user_id: contact.id,
        receiver_id: contact.id,
        other_name: contact.full_name,
        other_role: contact.role,
        last_message: 'Start a new conversation',
        created_at: new Date().toISOString(),
        children: contact.children || [],
      };
      setConversations(prev => [newConv, ...prev]);
      setSelected(newConv);
      setMessages([]);
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!newMsg.trim() || !selected) return;
    setSending(true);
    const targetUserId = selected.other_user_id || selected.receiver_id || selected.id;
    try {
      const { data } = await axiosClient.post('/messages', {
        receiver_id: targetUserId,
        body: newMsg.trim(),
        student_id: selectedStudentId || null,
      });
      setMessages(prev => [...prev, data.message]);
      setNewMsg('');

      // Update last message in conversation list
      setConversations(prev =>
        prev.map(c =>
          (c.other_user_id || c.receiver_id) === targetUserId
            ? { ...c, last_message: data.message.message, created_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      alert('Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const filtered = conversations.filter(c =>
    !search || c.other_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <MdMessage className="text-indigo-600" /> Messages & Inquiries
          </h1>
          <button
            onClick={openNewConversationModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <MdAdd className="text-base" />
            <span>New Message</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm" style={{ minHeight: '540px' }}>
          <div className="flex h-full">
            {/* Conversation list */}
            <div className="w-72 border-r border-slate-200 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search conversations…"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-indigo-300 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
                  </div>
                )}
                {!loading && filtered.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400 space-y-2">
                    <p>No conversations yet</p>
                    <button
                      onClick={openNewConversationModal}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      + Start a message
                    </button>
                  </div>
                )}
                {filtered.map(c => {
                  const targetId = c.other_user_id || c.receiver_id;
                  const isSelected = (selected?.other_user_id || selected?.receiver_id) === targetId;
                  const isParent = c.other_role === 'parent';
                  const isAdmin = c.other_role === 'admin';

                  return (
                    <button
                      key={targetId || c.id}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition border-b border-slate-50 ${
                        isSelected ? 'bg-indigo-50 border-r-4 border-r-indigo-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-sm flex-shrink-0 ${
                        isAdmin ? 'bg-purple-100 text-purple-700' : isParent ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {c.other_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{c.other_name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isAdmin ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.other_role || 'user'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{c.last_message}</p>
                      </div>
                      {c.unread_count > 0 && (
                        <span className="flex-shrink-0 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {c.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {!selected ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center space-y-2">
                    <MdMessage className="text-5xl mx-auto opacity-30 text-indigo-400" />
                    <p className="text-sm font-medium">Select a conversation to start messaging</p>
                    <p className="text-xs text-slate-400">Communicate directly with parents and administrators</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">{selected.other_name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {selected.other_role || 'User'}
                        {selected.children && selected.children.length > 0 && (
                          <span className="text-indigo-600 font-semibold ml-2">
                            • Parent of {selected.children.map(ch => ch.name).join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No messages yet in this conversation. Send a message below to start chatting.
                      </div>
                    )}
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                          m.is_mine ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {m.student_name && (
                            <div className={`text-[11px] font-extrabold pb-1 flex items-center gap-1 ${
                              m.is_mine ? 'text-amber-200' : 'text-indigo-700'
                            }`}>
                              <span>🧒</span>
                              <span>Regarding: {m.student_name}</span>
                            </div>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{m.message || m.body}</p>
                          <div className={`text-[10px] mt-1 text-right ${m.is_mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {m.sent_at || m.created_at
                              ? new Date(m.sent_at || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Optional Child Selector for Parents */}
                  {selected.children && selected.children.length > 0 && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-500">Subject / Child:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId('')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          !selectedStudentId
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        General (All)
                      </button>
                      {selected.children.map(child => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setSelectedStudentId(child.id.toString())}
                          className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                            selectedStudentId === child.id.toString()
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>🧒</span>
                          <span>{child.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input form */}
                  <form onSubmit={send} className="px-4 py-3 border-t border-slate-200 flex gap-2 bg-white">
                    <input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      placeholder={
                        selectedStudentId && selected.children
                          ? `Message about ${selected.children.find(c => c.id.toString() === selectedStudentId)?.name}…`
                          : `Message ${selected.other_name}…`
                      }
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMsg.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <MdSend className="text-base" />
                      <span>{sending ? 'Sending...' : 'Send'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── New Conversation Modal ── */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Start New Message</h3>
                  <p className="text-xs text-slate-500">Select an administrator or a student's parent</p>
                </div>
                <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                  <MdClose className="text-2xl" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {loadingContacts && (
                  <div className="py-8 text-center text-xs text-slate-400">Loading contacts…</div>
                )}
                {!loadingContacts && contacts.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No contacts found.
                  </div>
                )}
                {contacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => startConversationWith(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold ${
                      c.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {c.role === 'admin' ? <MdAdminPanelSettings /> : <MdPerson />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{c.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{c.description || c.email}</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">Message ➔</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-slate-600 text-xs font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
