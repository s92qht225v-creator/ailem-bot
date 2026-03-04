'use client';

import { useSearchParams } from 'next/navigation';
import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import LoginPage from '../../../src/components/pages/LoginPage';

export default function LoginRoute() {
  const onNavigate = useAppNavigate();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  return <LoginPage onNavigate={onNavigate} returnTo={returnTo} />;
}
