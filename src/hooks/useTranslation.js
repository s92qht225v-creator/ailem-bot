import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';

/**
 * Custom hook to access translation functionality
 * 
 * @returns {Object} Translation utilities
 * @returns {Function} t - Translation function
 * @returns {string} language - Current language code
 * @returns {Function} setLanguage - Function to change language
 * 
 * @example
 * const { t, language, setLanguage } = useTranslation();
 * 
 * // Basic translation
 * <h1>{t('home.welcome')}</h1>
 * 
 * // Translation with variables
 * <p>{t('product.inStock', { count: 10 })}</p>
 * 
 * // Change language
 * <button onClick={() => setLanguage('ru')}>Русский</button>
 */
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  
  return context;
};

export default useTranslation;
