import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
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
  title: {
    default: "Ailem — Uy tekstillari do'koni | ailem.uz",
    template: '%s | Ailem',
  },
  description:
    "Ailem — Toshkentdagi eng yaxshi choyshab, yostiq va pardalar do'koni. Tez yetkazib berish, qulay narxlar.",
  openGraph: {
    title: "Ailem — Uy tekstillari do'koni",
    description:
      "Toshkentdagi eng yaxshi choyshab, yostiq va pardalar do'koni. Tez yetkazib berish, qulay narxlar.",
    url: 'https://www.ailem.uz',
    type: 'website',
    images: [{ url: 'https://www.ailem.uz/logo.svg', width: 512, height: 512, alt: 'Ailem' }],
  },
  robots: 'index, follow',
  verification: {
    google: 'J9WtvH4lNeukCrZ50c2TwffjQzVuPbEYjEF8OhavFM4',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <Providers>{children}</Providers>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-CSM5FK64M7" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-CSM5FK64M7');
        `}</Script>
      </body>
    </html>
  );
}
