'use client';

import { useAppNavigate } from '../../hooks/useAppNavigate';
import HomePage from './HomePage';

export default function HomePageClient() {
  const onNavigate = useAppNavigate();
  return <HomePage onNavigate={onNavigate} />;
}
