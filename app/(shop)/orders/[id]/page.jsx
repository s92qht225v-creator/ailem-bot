'use client';

import { useParams } from 'next/navigation';
import { useAppNavigate } from '../../../../src/hooks/useAppNavigate';
import OrderDetailsPage from '../../../../src/components/pages/OrderDetailsPage';

export default function OrderDetailsRoute() {
  const params = useParams();
  const onNavigate = useAppNavigate();
  return <OrderDetailsPage orderId={params.id} onNavigate={onNavigate} />;
}
