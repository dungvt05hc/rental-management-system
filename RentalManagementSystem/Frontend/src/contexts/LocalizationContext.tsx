import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language, LocalizationContextValue, TranslationResource } from '../types/localization';
import { localizationService } from '../services/localizationService';

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

const STORAGE_KEY = 'preferred_language';

/**
 * Props for LocalizationProvider
 */
interface LocalizationProviderProps {
  children: React.ReactNode;
}

/**
 * LocalizationProvider component that manages language state and translations
 */
export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Flatten nested translation resources into a single-level object
   */
  const flattenTranslations = (resources: Record<string, Record<string, string>>): Record<string, string> => {
    const flattened: Record<string, string> = {};
    
    for (const [, categoryTranslations] of Object.entries(resources)) {
      for (const [key, value] of Object.entries(categoryTranslations)) {
        flattened[key] = value;
      }
    }
    
    return flattened;
  };

  /**
   * Load translations for a specific language
   */
  const loadTranslations = useCallback(async (languageCode: string) => {
    try {
      const translationResource: TranslationResource = await localizationService.getTranslationResources(languageCode);
      const flattenedTranslations = flattenTranslations(translationResource.resources);
      setTranslations(flattenedTranslations);
    } catch (error) {
      console.error(`Failed to load translations for ${languageCode}:`, error);
      setError(`Failed to load translations for ${languageCode}`);
    }
  }, []);

  /**
   * Change the current language
   */
  const changeLanguage = useCallback(async (languageCode: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`Attempting to change language to: ${languageCode}`);

      const language = await localizationService.getLanguageByCode(languageCode);
      
      if (!language) {
        throw new Error(`Language ${languageCode} not found`);
      }

      console.log(`Language found:`, language);

      await loadTranslations(languageCode);
      setCurrentLanguage(language);
      
      // Store preference in localStorage
      localStorage.setItem(STORAGE_KEY, languageCode);
      
      console.log(`Successfully changed language to ${languageCode}`);
    } catch (error) {
      console.error('Failed to change language:', error);
      setError(`Failed to change language: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw, just log the error so the UI doesn't break
    } finally {
      setIsLoading(false);
    }
  }, [loadTranslations]);

  /**
   * Translation function
   */
  const t = useCallback((key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  }, [translations]);

  /**
   * Initialize localization on mount
   */
  useEffect(() => {
    const initializeLocalization = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load available languages
        const languages = await localizationService.getLanguages();
        setAvailableLanguages(languages);

        // Determine which language to use
        const storedLanguageCode = localStorage.getItem(STORAGE_KEY);
        let languageToUse: Language | null = null;

        if (storedLanguageCode) {
          // Try to use stored preference
          languageToUse = languages.find(lang => lang.code === storedLanguageCode) || null;
        }

        if (!languageToUse) {
          // Fallback to default language
          const defaultLanguage = languages.find(lang => lang.isDefault);
          languageToUse = defaultLanguage || languages[0];
        }

        if (languageToUse) {
          await loadTranslations(languageToUse.code);
          setCurrentLanguage(languageToUse);
          localStorage.setItem(STORAGE_KEY, languageToUse.code);
        }
      } catch (error) {
        console.error('Failed to initialize localization:', error);
        setError('Failed to initialize localization');
      } finally {
        setIsLoading(false);
      }
    };

    initializeLocalization();
  }, [loadTranslations]);

  const value: LocalizationContextValue = {
    currentLanguage,
    availableLanguages,
    translations,
    isLoading,
    error,
    changeLanguage,
    t,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

/**
 * Custom hook to use localization context
 */
export const useLocalization = (): LocalizationContextValue => {
  const context = useContext(LocalizationContext);
  
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  
  return context;
};
