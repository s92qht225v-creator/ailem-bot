import { MessageCircle } from 'lucide-react';

const TelegramChatButton = () => (
  <a
    href="https://t.me/ailem_uz"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed right-4 bottom-20 lg:bottom-6 z-40 w-12 h-12 bg-[#0088cc] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#006699] transition-colors"
    aria-label="Telegram orqali yozing"
  >
    <MessageCircle className="w-6 h-6" />
  </a>
);

export default TelegramChatButton;
