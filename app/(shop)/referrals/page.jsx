'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import ReferralsPage from '../../../src/components/pages/ReferralsPage';

export default function ReferralsRoute() {
  const onNavigate = useAppNavigate();
  return <ReferralsPage onNavigate={onNavigate} />;
}
