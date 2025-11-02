import { createContext, useState, useEffect } from 'react';
import { translations } from '../locales';
import { getTelegramUser } from '../utils/telegram';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('uz'); // Default to Uzbek

  // Initialize language on mount
  useEffect(() => {
    try {
      // Check localStorage first
      const savedLanguage = loadFromLocalStorage('language');
      if (savedLanguage && translations[savedLanguage]) {
        setLanguageState(savedLanguage);
        return;
      }

      // Try to detect from Telegram
      const telegramUser = getTelegramUser();
      if (telegramUser?.languageCode) {
        const langCode = telegramUser.languageCode.toLowerCase();
        
        // Map Telegram language codes to our supported languages
        if (langCode === 'ru' || langCode.startsWith('ru')) {
          setLanguageState('ru');
          saveToLocalStorage('language', 'ru');
        } else if (langCode === 'uz' || langCode.startsWith('uz')) {
          setLanguageState('uz');
          saveToLocalStorage('language', 'uz');
        } else {
          // Default to Uzbek for any other language
          setLanguageState('uz');
          saveToLocalStorage('language', 'uz');
        }
      } else {
        // Default to Uzbek if can't detect
        setLanguageState('uz');
        saveToLocalStorage('language', 'uz');
      }
    } catch (error) {
      console.error('Error initializing language:', error);
      // Fallback to Uzbek on any error
      setLanguageState('uz');
    }
  }, []);

  // Function to change language
  const setLanguage = (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      saveToLocalStorage('language', lang);
    } else {
      console.warn(`Language '${lang}' not supported. Falling back to 'uz'`);
      setLanguageState('uz');
      saveToLocalStorage('language', 'uz');
    }
  };

  // Get translation function
  const t = (key, params = {}) => {
    // Split the key by dots to access nested translations
    const keys = key.split('.');
    let translation = translations[language];

    // Navigate through nested keys
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Fallback to English key or the key itself
        console.warn(`Translation key '${key}' not found for language '${language}'`);
        return key;
      }
    }

    // If translation is found but it's an object, return the key
    if (typeof translation === 'object') {
      console.warn(`Translation key '${key}' points to an object, not a string`);
      return key;
    }

    // Replace parameters in the translation
    let result = translation;
    Object.keys(params).forEach(param => {
      result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });

    return result;
  };

  const value = {
    language,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
