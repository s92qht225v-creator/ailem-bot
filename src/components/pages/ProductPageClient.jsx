'use client';

import { useAppNavigate } from '../../hooks/useAppNavigate';
import ProductPage from './ProductPage';

export default function ProductPageClient({ productId }) {
  const onNavigate = useAppNavigate();
  return <ProductPage productId={productId} onNavigate={onNavigate} />;
}
