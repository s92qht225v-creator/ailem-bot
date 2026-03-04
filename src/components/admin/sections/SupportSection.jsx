import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, RefreshCw, User, Headphones } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

const POLL_INTERVAL = 5000;

export default function SupportSection() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const toast = useToast();

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/support/sessions');
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      // silent
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const res = await fetch(`/api/support/messages?session_id=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      // silent
    }
  };

  // Initial load + polling sessions list
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Poll active session messages
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!activeSession) return;
    fetchMessages(activeSession);
    pollRef.current = setInterval(() => fetchMessages(activeSession), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [activeSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectSession = (sessionId) => {
    setActiveSession(sessionId);
    setReply('');
  };

  const handleSend = async () => {
    const trimmed = reply.trim();
    if (!trimmed || sending || !activeSession) return;

    setSending(true);
    try {
      const res = await fetch('/api/support/admin-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession, message: trimmed }),
      });

      if (!res.ok) throw new Error('Failed');
      setReply('');
      await fetchMessages(activeSession);
      await fetchSessions();
    } catch {
      toast.error("Yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('uz', { day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
  };

  const activeSessionData = sessions.find(s => s.session_id === activeSession);

  return (
    <div className="flex h-full gap-0 rounded-xl overflow-hidden border border-gray-200 bg-white" style={{ minHeight: '600px' }}>
      {/* Sessions sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-accent" />
            Suhbatlar
            {sessions.filter(s => s.unread > 0).length > 0 && (
              <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                {sessions.filter(s => s.unread > 0).length}
              </span>
            )}
          </h3>
          <button
            onClick={fetchSessions}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              Yuklanmoqda...
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm gap-2">
              <Headphones className="w-8 h-8 text-gray-300" />
              <span>Hali xabarlar yo'q</span>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.session_id}
                onClick={() => handleSelectSession(s.session_id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  activeSession === s.session_id ? 'bg-blue-50 border-l-2 border-l-accent' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      s.unread > 0 ? 'bg-accent/10' : 'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${s.unread > 0 ? 'text-accent' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-mono truncate">
                        {s.session_id.slice(0, 8)}…
                      </p>
                      <p className={`text-sm truncate ${s.unread > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {s.last_sender === 'admin' ? '✓ ' : ''}{s.last_message}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 gap-1">
                    <span className="text-xs text-gray-400">{formatTime(s.last_at)}</span>
                    {s.unread > 0 && (
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <MessageCircle className="w-12 h-12 text-gray-200" />
            <p className="text-sm">Suhbat tanlang</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <User className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Foydalanuvchi</p>
                <p className="text-xs text-gray-400 font-mono">{activeSession}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Xabarlar yuklanmoqda...</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm break-words ${
                      msg.sender === 'admin'
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      <p>{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-white/60' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Javob yozing... (Enter = yuborish)"
                  rows={2}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-accent"
                  style={{ maxHeight: '96px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  className="px-4 bg-accent text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-red-700 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
