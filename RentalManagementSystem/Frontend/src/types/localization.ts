/**
 * Language information
 */
export interface Language {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * Translation resource structure
 */
export interface TranslationResource {
  languageCode: string;
  resources: Record<string, Record<string, string>>;
}

/**
 * Translation key-value pair
 */
export interface Translation {
  id: number;
  key: string;
  value: string;
  category: string;
  description?: string;
}

/**
 * Localization context value
 */
export interface LocalizationContextValue {
  currentLanguage: Language | null;
  availableLanguages: Language[];
  translations: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  changeLanguage: (languageCode: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
}
