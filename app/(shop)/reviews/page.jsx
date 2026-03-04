'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import MyReviewsPage from '../../../src/components/pages/MyReviewsPage';

export default function ReviewsRoute() {
  const onNavigate = useAppNavigate();
  return <MyReviewsPage onNavigate={onNavigate} />;
}
