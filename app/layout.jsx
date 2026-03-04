import { Plus_Jakarta_Sans } from 'next/font/google';
import Providers from '../src/components/Providers';
import './globals.css';

export const dynamic = 'force-dynamic';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

export const metadata = {
  title: 'Ailem — Uy tekstillari | ailem.uz',
  description:
    "Ailem — Toshkentdagi eng yaxshi choyshab, yostiq va pardalar do'koni. Tez yetkazib berish, qulay narxlar.",
  openGraph: {
    title: 'Ailem — Uy To\'qimachilik',
    description:
      "Sifatli uy tekstil mahsulotlari. Tez yetkazib berish, qulay narxlar.",
    url: 'https://www.ailem.uz',
    type: 'website',
  },
  robots: 'index, follow',
  icons: {
    icon: '/vite.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
