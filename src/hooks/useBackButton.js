import { useEffect } from 'react';
import { getTelegramWebApp } from '../utils/telegram';

/**
 * Hook to manage Telegram's native BackButton
 * @param {Function} onClick - Callback function when back button is clicked
 * @param {boolean} enabled - Whether to show the back button (default: true)
 */
export const useBackButton = (onClick, enabled = true) => {
  useEffect(() => {
    const tg = getTelegramWebApp();
    
    if (!tg || !tg.BackButton || !enabled) return;

    // Show the back button
    tg.BackButton.show();
    
    // Set up the click handler
    tg.BackButton.onClick(onClick);

    // Cleanup: hide button and remove handler when component unmounts
    return () => {
      if (tg && tg.BackButton) {
        tg.BackButton.hide();
        tg.BackButton.offClick(onClick);
      }
    };
  }, [onClick, enabled]);
};
