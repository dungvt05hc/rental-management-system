import { useLocalization } from '../contexts/LocalizationContext';

/**
 * Custom hook for accessing translation functionality
 * Provides a simple interface for translating keys to localized strings
 */
export const useTranslation = () => {
  const { t, currentLanguage, changeLanguage, availableLanguages, isLoading } = useLocalization();

  return {
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages,
    isLoading,
  };
};
