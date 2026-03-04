'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getHref } from '../utils/navigation';
import { saveToLocalStorage } from '../utils/helpers';

// Bridge hook: provides an onNavigate(page, data) function compatible
// with existing components, backed by Next.js router.push()
export function useAppNavigate() {
  const router = useRouter();

  const onNavigate = useCallback(
    (page, data = {}) => {
      // Persist pageData for components that read it from localStorage
      if (page !== 'admin') {
        saveToLocalStorage('currentPage', page);
        saveToLocalStorage('pageData', data);
      }

      router.push(getHref(page, data));
    },
    [router]
  );

  return onNavigate;
}
