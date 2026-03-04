'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import CartPage from '../../../src/components/pages/CartPage';

export default function CartRoute() {
  const onNavigate = useAppNavigate();
  return <CartPage onNavigate={onNavigate} />;
}
