'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import CheckoutPage from '../../../src/components/pages/CheckoutPage';

export default function CheckoutRoute() {
  const onNavigate = useAppNavigate();
  return <CheckoutPage onNavigate={onNavigate} />;
}
