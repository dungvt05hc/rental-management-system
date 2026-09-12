import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Language,
  LocalizationContextValue,
  TranslationParams,
  TranslationResource,
} from '../types/localization';
import { localizationService } from '../services/localizationService';
import { setTranslator } from '../utils/i18n';
import enMessages from '../../locales/en.json';
import viMessages from '../../locales/vi.json';

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

const STORAGE_KEY = 'preferred_language';

/** Tiếng Việt là ngôn ngữ mặc định — xem Language.IsDefault ở backend. */
const DEFAULT_LANGUAGE_CODE = 'vi';

/**
 * Bản dịch đóng sẵn trong bundle.
 *
 * Trước đây context phụ thuộc hoàn toàn vào API: API lỗi là toàn bộ giao diện
 * rơi về chuỗi tiếng Anh trong code. Bảng này là lớp nền — luôn có mặt, hiển thị
 * ngay từ lần render đầu tiên, và API chỉ ghi đè lên nó (để admin sửa bản dịch
 * trong DB vẫn có tác dụng).
 */
const BUNDLED_MESSAGES: Record<string, Record<string, string>> = {
  en: enMessages,
  vi: viMessages,
};

/**
 * Ngôn ngữ dùng để dựng giao diện trước khi API trả lời.
 *
 * Chỉ là chỗ dựa tạm cho lần render đầu; danh sách ngôn ngữ thật sẽ thay thế nó.
 */
const FALLBACK_LANGUAGES: Language[] = [
  { id: -1, code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', isDefault: true, isActive: true },
  { id: -2, code: 'en', name: 'English', nativeName: 'English', isDefault: false, isActive: true },
];

function bundledFor(languageCode: string): Record<string, string> {
  return BUNDLED_MESSAGES[languageCode] ?? BUNDLED_MESSAGES[DEFAULT_LANGUAGE_CODE] ?? {};
}

/**
 * Ngôn ngữ đọc được ngay lúc khởi động, không cần chờ mạng.
 */
function initialLanguageCode(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE_CODE;
  } catch {
    // Trình duyệt chặn storage (chế độ riêng tư) — vẫn phải chạy được.
    return DEFAULT_LANGUAGE_CODE;
  }
}

/**
 * Thay các chỗ trống `{name}` bằng giá trị tương ứng.
 * Chỗ trống không có giá trị thì giữ nguyên, để lỗi lộ ra thay vì biến mất.
 */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

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
  const [languageCode, setLanguageCode] = useState<string>(initialLanguageCode);
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(
    () => FALLBACK_LANGUAGES.find((language) => language.code === initialLanguageCode()) ?? null
  );
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(FALLBACK_LANGUAGES);
  const [remoteTranslations, setRemoteTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Bản dịch đang có hiệu lực: nền là bundle, API ghi đè lên.
   */
  const translations = useMemo(
    () => ({ ...bundledFor(languageCode), ...remoteTranslations }),
    [languageCode, remoteTranslations]
  );

  /**
   * Flatten nested translation resources into a single-level object
   */
  const flattenTranslations = (resources: Record<string, Record<string, string>>): Record<string, string> => {
    const flattened: Record<string, string> = {};

    for (const [, categoryTranslations] of Object.entries(resources)) {
      for (const [key, value] of Object.entries(categoryTranslations)) {
        // Bản dịch rỗng trong DB không được phép che mất bản trong bundle.
        if (value?.trim()) {
          flattened[key] = value;
        }
      }
    }

    return flattened;
  };

  /**
   * Load translations for a specific language.
   * Thất bại không phải lỗi chí mạng: bundle vẫn phục vụ được giao diện.
   */
  const loadTranslations = useCallback(async (code: string) => {
    try {
      const translationResource: TranslationResource = await localizationService.getTranslationResources(code);
      setRemoteTranslations(flattenTranslations(translationResource.resources));
    } catch (err) {
      console.error(`Failed to load translations for ${code}:`, err);
      setRemoteTranslations({});
    }
  }, []);

  /**
   * Change the current language
   */
  const changeLanguage = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    // Đổi ngôn ngữ hiển thị ngay từ bundle, không đợi mạng.
    setLanguageCode(code);
    setRemoteTranslations({});
    setCurrentLanguage(
      (previous) =>
        FALLBACK_LANGUAGES.find((language) => language.code === code) ??
        (previous?.code === code ? previous : null)
    );

    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Không lưu được lựa chọn thì thôi, phiên này vẫn đúng ngôn ngữ.
    }

    try {
      const language = await localizationService.getLanguageByCode(code);
      if (language) {
        setCurrentLanguage(language);
      }
      await loadTranslations(code);
    } catch (err) {
      console.error('Failed to change language:', err);
      setError(`Failed to change language: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadTranslations]);

  /**
   * Translation function
   */
  const t = useCallback(
    (key: string, fallback?: string, params?: TranslationParams): string =>
      interpolate(translations[key] || fallback || key, params),
    [translations]
  );

  // Cho tầng service (không gọi hook được) dùng chung bản dịch đang hoạt động.
  useEffect(() => {
    setTranslator(t);
  }, [t]);

  /**
   * Initialize localization on mount
   */
  useEffect(() => {
    const initializeLocalization = async () => {
      setIsLoading(true);
      setError(null);

      let languages: Language[] = FALLBACK_LANGUAGES;

      try {
        const fetched = await localizationService.getLanguages();
        if (fetched.length > 0) {
          languages = fetched;
          setAvailableLanguages(fetched);
        }
      } catch (err) {
        console.error('Failed to load languages, using bundled list:', err);
        setError('Failed to load languages');
      }

      // Lựa chọn đã lưu thắng; nếu không có thì lấy ngôn ngữ mặc định của hệ thống.
      const storedCode = initialLanguageCode();
      const languageToUse =
        languages.find((language) => language.code === storedCode) ??
        languages.find((language) => language.isDefault) ??
        languages[0];

      if (languageToUse) {
        setLanguageCode(languageToUse.code);
        setCurrentLanguage(languageToUse);
        try {
          localStorage.setItem(STORAGE_KEY, languageToUse.code);
        } catch {
          // Xem ghi chú ở changeLanguage.
        }
        await loadTranslations(languageToUse.code);
      }

      setIsLoading(false);
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
