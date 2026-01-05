import type { Language, TranslationResource } from '../types/localization';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5152/api';

/**
 * Service for interacting with the localization API
 */
class LocalizationService {
  /**
   * Get all available languages
   */
  async getLanguages(): Promise<Language[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch languages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching languages:', error);
      throw error;
    }
  }

  /**
   * Get language by code
   */
  async getLanguageByCode(code: string): Promise<Language> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages/${code}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch language: ${code}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching language ${code}:`, error);
      throw error;
    }
  }

  /**
   * Get translation resources for a specific language
   */
  async getTranslationResources(languageCode: string): Promise<TranslationResource> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/translations/${languageCode}/resources`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch translations for language: ${languageCode}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching translations for ${languageCode}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific translation by key
   */
  async getTranslation(languageCode: string, key: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/translations/${languageCode}/${encodeURIComponent(key)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch translation for key: ${key}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error(`Error fetching translation for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get the default language
   */
  async getDefaultLanguage(): Promise<Language> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages/default`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch default language');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching default language:', error);
      throw error;
    }
  }
}

export const localizationService = new LocalizationService();
