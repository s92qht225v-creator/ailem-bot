import HomePageClient from '../../src/components/pages/HomePageClient';

export default function HomePage() {
  // SSR: data is fetched client-side via AdminContext (same as before)
  // Server component just renders the client wrapper
  return <HomePageClient />;
}
