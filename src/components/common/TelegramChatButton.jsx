'use client';

import { useState, useRef, useEffect, useContext } from 'react';
import { MessageCircle, X, Send, ChevronDown, RotateCcw } from 'lucide-react';
import { UserContext } from '../../context/UserContext';

const SESSION_KEY = 'support_session_id';
const LAST_SEEN_KEY = 'support_last_seen';
const POLL_INTERVAL = 3000;
const BG_POLL_INTERVAL = 10000;

const TelegramChatButton = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const pollRef = useRef(null);
  const { user } = useContext(UserContext);

  // Load session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) setSessionId(saved);
  }, []);

  // Background polling for unread badge when chat is closed
  useEffect(() => {
    if (!sessionId || open) return;
    const checkUnread = async () => {
      try {
        const res = await fetch(`/api/support/messages?session_id=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs = data.messages || [];
        const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
        const adminMsgs = msgs.filter(m => m.sender === 'admin');
        if (!lastSeen) {
          setUnreadCount(adminMsgs.length);
        } else {
          const unseen = adminMsgs.filter(m => new Date(m.created_at) > new Date(lastSeen));
          setUnreadCount(unseen.length);
        }
      } catch { /* silent */ }
    };
    checkUnread();
    pollRef.current = setInterval(checkUnread, BG_POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [sessionId, open]);

  // Fetch messages when chat opens and session exists; start polling
  useEffect(() => {
    if (!open || !sessionId) return;
    const poll = async () => {
      const res = await fetch(`/api/support/messages?session_id=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [open, sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when opened
  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  const fetchMessages = async (sid) => {
    try {
      const res = await fetch(`/api/support/messages?session_id=${sid}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      // silent
    }
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError('');

    // Optimistic update
    const optimistic = { sender: 'user', message: trimmed, created_at: new Date().toISOString(), _optimistic: true };
    setMessages(prev => [...prev, optimistic]);
    setMessage('');

    try {
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: trimmed,
          user_name: user?.name || 'Mehmon',
          user_id: user?.telegramId || user?.id || 'unknown',
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const data = await res.json();
      const sid = data.session_id;

      if (!sessionId) {
        setSessionId(sid);
        localStorage.setItem(SESSION_KEY, sid);
        // Start polling for new session
        clearInterval(pollRef.current);
        pollRef.current = setInterval(() => fetchMessages(sid), POLL_INTERVAL);
      }

      // Immediately fetch from DB to replace optimistic message with real data
      await fetchMessages(sid || sessionId);
    } catch {
      setError("Yuborilmadi. Qayta urinib ko'ring.");
      setMessages(prev => prev.filter(m => !m._optimistic));
      setMessage(trimmed);
    } finally {
      setSending(false);
    }
  };

  const markSeen = () => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setUnreadCount(0);
  };

  const handleNewChat = () => {
    clearInterval(pollRef.current);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_SEEN_KEY);
    setSessionId(null);
    setMessages([]);
    setError('');
    setUnreadCount(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    markSeen();
    setOpen(false);
    clearInterval(pollRef.current);
  };

  return (
    <div className="fixed right-4 bottom-20 lg:bottom-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col" style={{ maxHeight: '420px' }}>
          {/* Header */}
          <div className="bg-accent px-4 py-3 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Ailem Support</p>
                <p className="text-white/70 text-xs">Savolingizni yozing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={handleNewChat} className="text-white/70 hover:text-white" title="Yangi suhbat">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button onClick={handleClose} className="text-white/70 hover:text-white">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages thread */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: '120px', maxHeight: '230px' }}>
            {messages.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-6">
                Savolingizni yozing — tez orada javob beramiz
              </p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm break-words ${
                    msg.sender === 'user'
                      ? 'bg-accent text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            {error && <p className="text-red-500 text-xs mb-1">{error}</p>}
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Xabar yozing..."
                rows={1}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-accent"
                style={{ maxHeight: '72px', overflowY: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="w-9 h-9 bg-accent text-white rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-red-700 transition-colors flex-shrink-0 self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => open ? handleClose() : setOpen(true)}
        className="relative w-12 h-12 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors"
        aria-label="Xabar yozing"
      >
        {open ? <X className="w-5 h-5" /> : <img src="/telegram_logo.svg" alt="Telegram" className="w-8 h-8" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default TelegramChatButton;
