import type { Language, TranslationResource } from '../types/localization';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5152/api';

// DTOs for language management

/**
 * DTO for creating a new language
 */
export interface CreateLanguageDto {
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
}

/**
 * DTO for updating an existing language
 */
export interface UpdateLanguageDto {
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * DTO for creating or updating a translation
 */
export interface UpsertTranslationDto {
  key: string;
  value: string;
  category: string;
  description?: string;
}

/**
 * DTO for bulk translation operations
 */
export interface BulkTranslationDto {
  languageCode: string;
  translations: Record<string, string>;
}

/**
 * Service for interacting with the localization API
 */
class LocalizationService {
  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get headers with authentication
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

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
   * Get all languages including inactive ones (Admin only)
   */
  async getAllLanguages(): Promise<Language[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages/all`, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch all languages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all languages:', error);
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

  /**
   * Create a new language (Admin only)
   */
  async createLanguage(createLanguageDto: CreateLanguageDto): Promise<Language> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(createLanguageDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create language');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating language:', error);
      throw error;
    }
  }

  /**
   * Update an existing language (Admin only)
   */
  async updateLanguage(code: string, updateLanguageDto: UpdateLanguageDto): Promise<Language> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages/${code}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updateLanguageDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update language');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating language:', error);
      throw error;
    }
  }

  /**
   * Delete a language (Admin only)
   */
  async deleteLanguage(code: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages/${code}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete language');
      }
    } catch (error) {
      console.error('Error deleting language:', error);
      throw error;
    }
  }

  /**
   * Set a language as the default language (Admin only)
   */
  async setDefaultLanguage(code: string): Promise<Language> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/languages/${code}/set-default`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default language');
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting default language:', error);
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
   * Get all translations for a specific language
   */
  async getTranslations(languageCode: string): Promise<import('../types/localization').Translation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/translations/${languageCode}`, {
        headers: this.getHeaders(),
      });
      
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
   * Create or update a translation (Manager only)
   */
  async upsertTranslation(languageCode: string, translationDto: UpsertTranslationDto): Promise<import('../types/localization').Translation> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/translations/${languageCode}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(translationDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save translation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving translation:', error);
      throw error;
    }
  }

  /**
   * Bulk create or update translations (Manager only)
   */
  async bulkUpsertTranslations(bulkTranslationDto: BulkTranslationDto): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/translations/bulk`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(bulkTranslationDto),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to bulk save translations');
      }
    } catch (error) {
      console.error('Error bulk saving translations:', error);
      throw error;
    }
  }

  /**
   * Delete a translation (Admin only)
   */
  async deleteTranslation(languageCode: string, key: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/translations/${languageCode}/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete translation');
      }
    } catch (error) {
      console.error('Error deleting translation:', error);
      throw error;
    }
  }

  /**
   * Seed default translations (Admin only)
   */
  async seedDefaultTranslations(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/localization/seed`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to seed translations');
      }
    } catch (error) {
      console.error('Error seeding translations:', error);
      throw error;
    }
  }
}

export const localizationService = new LocalizationService();
