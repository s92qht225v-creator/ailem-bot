import { useTranslation } from '../hooks/useTranslation';
import { languages } from '../locales';

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">{t('profile.language')}</h3>
      <div className="space-y-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
              language === lang.code
                ? 'border-accent bg-accent/10 text-accent font-semibold'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
