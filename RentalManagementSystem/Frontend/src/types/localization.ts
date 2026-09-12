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
 * Giá trị thay vào chỗ trống `{name}` của một chuỗi dịch.
 *
 * Cần tham số hoá thay vì nối chuỗi vì trật tự từ giữa hai ngôn ngữ khác nhau:
 * "85% occupancy" nhưng "tỷ lệ lấp đầy 85%".
 */
export type TranslationParams = Record<string, string | number>;

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
  t: (key: string, fallback?: string, params?: TranslationParams) => string;
}
