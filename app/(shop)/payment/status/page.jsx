'use client';

import { useSearchParams } from 'next/navigation';
import { useAppNavigate } from '../../../../src/hooks/useAppNavigate';
import PaymentStatusPage from '../../../../src/components/pages/PaymentStatusPage';

export default function PaymentStatusRoute() {
  const onNavigate = useAppNavigate();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const paymentMethod = searchParams.get('method');

  return (
    <PaymentStatusPage
      orderId={orderId}
      paymentMethod={paymentMethod}
      onNavigate={onNavigate}
    />
  );
}
