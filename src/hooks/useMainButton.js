import { useEffect } from 'react';
import { getTelegramWebApp } from '../utils/telegram';

/**
 * Hook to manage Telegram's native MainButton
 * @param {string} text - Button text
 * @param {Function} onClick - Callback function when button is clicked
 * @param {Object} options - Button options
 * @param {boolean} options.enabled - Whether to show the button (default: true)
 * @param {string} options.color - Button color (optional)
 * @param {string} options.textColor - Button text color (optional)
 * @param {boolean} options.progress - Show progress indicator (default: false)
 */
export const useMainButton = (text, onClick, options = {}) => {
  const {
    enabled = true,
    color,
    textColor,
    progress = false,
  } = options;

  useEffect(() => {
    const tg = getTelegramWebApp();
    
    if (!tg || !tg.MainButton || !enabled) return;

    // Configure the button
    tg.MainButton.setText(text);
    
    if (color) tg.MainButton.setParams({ color });
    if (textColor) tg.MainButton.setParams({ text_color: textColor });
    
    // Show progress or normal state
    if (progress) {
      tg.MainButton.showProgress();
    } else {
      tg.MainButton.hideProgress();
    }
    
    // Show the button
    tg.MainButton.show();
    
    // Set up the click handler
    tg.MainButton.onClick(onClick);

    // Cleanup: hide button and remove handler when component unmounts
    return () => {
      if (tg && tg.MainButton) {
        tg.MainButton.hide();
        tg.MainButton.offClick(onClick);
        tg.MainButton.hideProgress();
      }
    };
  }, [text, onClick, enabled, color, textColor, progress]);
};
