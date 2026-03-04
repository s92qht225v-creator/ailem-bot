'use client';

import { useState, useRef, useEffect, useContext } from 'react';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';
import { UserContext } from '../../context/UserContext';

const TelegramChatButton = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError('');

    const userName = user?.name || 'Mehmon';
    const userId = user?.telegramId || user?.id || 'unknown';
    const text = `💬 Sayt orqali xabar\n\nFoydalanuvchi: ${userName}\nID: ${userId}\n\n${trimmed}`;

    try {
      const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      const adminChatId = process.env.NEXT_PUBLIC_ADMIN_CHAT_ID;

      if (!botToken || !adminChatId) {
        throw new Error('Bot sozlanmagan');
      }

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML' }),
      });

      if (!res.ok) throw new Error('Yuborilmadi');

      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 4000);
    } catch {
      setError("Xabar yuborilmadi. Qayta urinib ko'ring.");
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

  return (
    <div className="fixed right-4 bottom-20 lg:bottom-6 z-40 flex flex-col items-end gap-2">
      {/* Chat popup */}
      {open && (
        <div className="w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-accent px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Ailem Support</p>
                <p className="text-white/70 text-xs">Savolingizni yozing</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {sent ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-gray-800 font-semibold text-sm">Xabar yuborildi!</p>
                <p className="text-gray-500 text-xs mt-1">Tez orada javob beramiz.</p>
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Savolingizni yozing..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-accent"
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="mt-2 w-full bg-accent text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Yuborilmoqda...' : 'Yuborish'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors"
        aria-label="Xabar yozing"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default TelegramChatButton;
