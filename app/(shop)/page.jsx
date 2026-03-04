import HomePageClient from '../../src/components/pages/HomePageClient';

export const metadata = {
  title: "Ailem — Uy tekstillari do'koni | ailem.uz",
  description: "Toshkentdagi eng yaxshi choyshab, yostiq va pardalar do'koni. Tez yetkazib berish, qulay narxlar.",
};

export default function HomePage() {
  // SSR: data is fetched client-side via AdminContext (same as before)
  // Server component just renders the client wrapper
  return <HomePageClient />;
}
