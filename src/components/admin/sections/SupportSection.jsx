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
    <div className="a-card flex h-full gap-0" style={{ minHeight: '600px', overflow: 'hidden' }}>
      {/* Sessions sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <h3 className="flex items-center gap-2" style={{ fontWeight: 600, color: 'var(--text)' }}>
            <MessageCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Suhbatlar
            {sessions.filter(s => s.unread > 0).length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                {sessions.filter(s => s.unread > 0).length}
              </span>
            )}
          </h3>
          <button
            onClick={fetchSessions}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-12 text-sm a-faint">
              Yuklanmoqda...
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm gap-2 a-faint">
              <Headphones className="w-8 h-8" style={{ color: 'var(--text-3)' }} />
              <span>Hali xabarlar yo'q</span>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.session_id}
                onClick={() => handleSelectSession(s.session_id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: activeSession === s.session_id ? 'var(--accent-weak)' : 'transparent',
                  borderLeft: activeSession === s.session_id ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: s.unread > 0 ? 'var(--accent-weak)' : 'var(--surface-2)' }}>
                      <User className="w-4 h-4" style={{ color: s.unread > 0 ? 'var(--accent)' : 'var(--text-3)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono truncate a-faint">
                        {s.session_id.slice(0, 8)}…
                      </p>
                      <p className="text-sm truncate" style={{ fontWeight: s.unread > 0 ? 600 : 400, color: s.unread > 0 ? 'var(--text)' : 'var(--text-2)' }}>
                        {s.last_sender === 'admin' ? '✓ ' : ''}{s.last_message}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 gap-1">
                    <span className="text-xs a-faint">{formatTime(s.last_at)}</span>
                    {s.unread > 0 && (
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
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
          <div className="flex-1 flex flex-col items-center justify-center gap-3 a-faint">
            <MessageCircle className="w-12 h-12" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm">Suhbat tanlang</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-weak)' }}>
                <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-sm" style={{ fontWeight: 600, color: 'var(--text)' }}>Foydalanuvchi</p>
                <p className="text-xs font-mono a-faint">{activeSession}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-sm py-8 a-faint">Xabarlar yuklanmoqda...</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm break-words ${msg.sender === 'admin' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                      style={msg.sender === 'admin'
                        ? { background: 'var(--accent)', color: '#fff' }
                        : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    >
                      <p>{msg.message}</p>
                      <p className="text-xs mt-1" style={{ color: msg.sender === 'admin' ? 'rgba(255,255,255,.6)' : 'var(--text-3)' }}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Javob yozing... (Enter = yuborish)"
                  rows={2}
                  className="a-input flex-1 resize-none"
                  style={{ maxHeight: '96px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  className="a-btn a-btn-primary flex-shrink-0"
                  style={{ padding: '0 16px', justifyContent: 'center' }}
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
