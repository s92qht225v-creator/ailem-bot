'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import PaymentPage from '../../../src/components/pages/PaymentPage';
import { loadFromLocalStorage } from '../../../src/utils/helpers';

export default function PaymentRoute() {
  const onNavigate = useAppNavigate();
  // checkoutData is stored in localStorage before navigating here
  const checkoutData = loadFromLocalStorage('checkoutData');
  return <PaymentPage checkoutData={checkoutData} onNavigate={onNavigate} />;
}
