'use client';

import { useAppNavigate } from '../../hooks/useAppNavigate';
import HomePage from './HomePage';

export default function HomePageClient({ ssrProducts, ssrCategories, ssrBanners, ssrSaleTimer }) {
  const onNavigate = useAppNavigate();
  return (
    <HomePage
      onNavigate={onNavigate}
      ssrProducts={ssrProducts}
      ssrCategories={ssrCategories}
      ssrBanners={ssrBanners}
      ssrSaleTimer={ssrSaleTimer}
    />
  );
}
