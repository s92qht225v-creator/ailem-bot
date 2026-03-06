'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import PaymentPage from '../../../src/components/pages/PaymentPage';
import { loadFromLocalStorage } from '../../../src/utils/helpers';

export default function PaymentRoute() {
  const onNavigate = useAppNavigate();
  const pageData = loadFromLocalStorage('pageData');
  const checkoutData = pageData?.checkoutData || loadFromLocalStorage('checkoutData');
  return <PaymentPage checkoutData={checkoutData} onNavigate={onNavigate} />;
}
