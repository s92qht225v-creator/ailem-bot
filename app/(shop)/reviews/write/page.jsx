'use client';

import { useAppNavigate } from '../../../../src/hooks/useAppNavigate';
import WriteReviewPage from '../../../../src/components/pages/WriteReviewPage';
import { loadFromLocalStorage } from '../../../../src/utils/helpers';

export default function WriteReviewRoute() {
  const onNavigate = useAppNavigate();
  // pageData is stored in localStorage before navigating here
  const pageData = loadFromLocalStorage('pageData', {});
  return <WriteReviewPage onNavigate={onNavigate} pageData={pageData} />;
}
