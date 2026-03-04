'use client';

import { useSearchParams } from 'next/navigation';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import ShopPage from './ShopPage';

export default function ShopPageClient() {
  const onNavigate = useAppNavigate();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || undefined;

  return <ShopPage onNavigate={onNavigate} initialCategory={initialCategory} />;
}
