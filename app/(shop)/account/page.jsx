'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import AccountPage from '../../../src/components/pages/AccountPage';

export default function AccountRoute() {
  const onNavigate = useAppNavigate();
  return <AccountPage onNavigate={onNavigate} />;
}
