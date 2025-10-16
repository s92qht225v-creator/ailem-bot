// Add wait function at the beginning
export const waitForTelegramWebApp = () => {
  return new Promise((resolve) => {
    if (window.Telegram?.WebApp) {
      resolve(window.Telegram.WebApp);
    } else {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.Telegram?.WebApp) {
          clearInterval(checkInterval);
          resolve(window.Telegram.WebApp);
        } else if (attempts > 30) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);
    }
  });
};

// Make initTelegramWebApp async
export const initTelegramWebApp = async () => {
  const tg = await waitForTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    return tg;
  }
  return null;
};
