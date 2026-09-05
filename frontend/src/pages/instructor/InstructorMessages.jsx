import { useEffect, useState } from 'react';
import { MdMessage, MdSend, MdSearch } from 'react-icons/md';
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

  useEffect(() => {
    axiosClient.get('/instructor/messages/conversations')
      .then(({ data }) => setConversations(data.conversations || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    axiosClient.get(`/instructor/messages/conversations/${selected.id}`)
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => setMessages([]));
  }, [selected]);

  async function send(e) {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const { data } = await axiosClient.post('/instructor/messages', {
        receiver_id: selected.receiver_id,
        message: newMsg.trim(),
      });
      setMessages(prev => [...prev, data.message]);
      setNewMsg('');
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  const filtered = conversations.filter(c =>
    !search || c.other_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <InstructorLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-5 flex items-center gap-2">
          <MdMessage className="text-indigo-600" /> Messages
        </h1>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm" style={{ minHeight: '520px' }}>
          <div className="flex h-full">
            {/* Conversation list */}
            <div className="w-64 border-r border-slate-200 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-indigo-300 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>}
                {!loading && filtered.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-400">No conversations yet</div>
                )}
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition ${selected?.id === c.id ? 'bg-indigo-50 border-r-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                      {c.other_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.other_name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.last_message}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="flex-shrink-0 bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{c.unread}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {!selected ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <MdMessage className="text-5xl mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Select a conversation to start messaging</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <p className="font-semibold text-slate-800">{selected.other_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{selected.other_role}</p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(m => (
                      <div key={m.id} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${m.is_mine ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          {m.message}
                          <div className={`text-xs mt-1 ${m.is_mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <form onSubmit={send} className="px-4 py-3 border-t border-slate-200 flex gap-3">
                    <input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMsg.trim()}
                      className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      <MdSend className="text-lg" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
