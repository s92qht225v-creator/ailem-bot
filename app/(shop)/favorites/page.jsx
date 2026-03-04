'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import FavoritesPage from '../../../src/components/pages/FavoritesPage';

export default function FavoritesRoute() {
  const onNavigate = useAppNavigate();
  return <FavoritesPage onNavigate={onNavigate} />;
}
