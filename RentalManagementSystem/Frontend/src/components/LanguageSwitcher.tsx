import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Globe } from 'lucide-react';

/**
 * LanguageSwitcher component
 * Provides a button-based switcher with flag-like icons
 */
export const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, availableLanguages, changeLanguage, isLoading } = useTranslation();

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode && languageCode !== currentLanguage?.code) {
      try {
        await changeLanguage(languageCode);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    }
  };

  if (isLoading || !currentLanguage) {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-gray-600" />
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {availableLanguages.map((language) => {
          const isActive = currentLanguage.code === language.code;
          return (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              disabled={isLoading || isActive}
              className={`
                px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200
                ${isActive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                disabled:cursor-not-allowed
              `}
              aria-label={`Switch to ${language.nativeName}`}
              aria-pressed={isActive}
              title={language.nativeName}
            >
              {language.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Compact LanguageSwitcher for mobile or tight spaces
 */
export const LanguageSwitcherCompact: React.FC = () => {
  const { currentLanguage, availableLanguages, changeLanguage, isLoading } = useTranslation();

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode && languageCode !== currentLanguage?.code) {
      try {
        await changeLanguage(languageCode);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    }
  };

  if (!currentLanguage) {
    return (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-center">
      <Globe className="h-4 w-4 text-gray-600" />
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {availableLanguages.map((language) => {
          const isActive = currentLanguage.code === language.code;
          return (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              disabled={isLoading || isActive}
              className={`
                px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                disabled:cursor-not-allowed
              `}
              aria-label={`Switch to ${language.nativeName}`}
              aria-pressed={isActive}
              title={language.nativeName}
            >
              {language.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
