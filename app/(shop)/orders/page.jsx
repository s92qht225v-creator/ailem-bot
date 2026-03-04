'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import OrderHistoryPage from '../../../src/components/pages/OrderHistoryPage';

export default function OrdersRoute() {
  const onNavigate = useAppNavigate();
  return <OrderHistoryPage onNavigate={onNavigate} />;
}
