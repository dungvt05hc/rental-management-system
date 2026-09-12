/**
 * Khai báo một chuỗi cần dịch ở nơi không gọi t() được — ví dụ bảng hằng số
 * ngoài component (STATUS_LABELS, PASSWORD_RULES).
 *
 * Hàm này không dịch gì cả; nó chỉ đặt cặp khoá + bản gốc tiếng Anh vào một
 * dạng mà scripts/extract-i18n-keys.ts nhìn thấy được. Không có nó, khoá nằm
 * trong bảng hằng sẽ lọt lưới i18n:check và âm thầm hiện tiếng Anh mãi mãi.
 */
export interface Message {
  key: string;
  defaultValue: string;
}

export function defineMessage(key: string, defaultValue: string): Message {
  return { key, defaultValue };
}

/**
 * Dịch từ ngoài cây React — dùng cho tầng service, nơi không gọi hook được.
 *
 * LocalizationProvider gắn hàm t() đang hoạt động vào đây mỗi khi bản dịch đổi,
 * nhờ vậy chuỗi ở tầng service vẫn theo đúng ngôn ngữ và vẫn nhận được phần
 * admin sửa trong DB. Trước khi provider kịp gắn (ví dụ một lỗi mạng ngay lúc
 * khởi động), hàm dự phòng trả về chuỗi tiếng Anh gốc.
 */
type TranslateFn = (key: string, fallback?: string, params?: Record<string, string | number>) => string;

let translateFn: TranslateFn = (_key, fallback) => fallback ?? _key;

export function setTranslator(translate: TranslateFn): void {
  translateFn = translate;
}

export function translate(
  key: string,
  fallback?: string,
  params?: Record<string, string | number>
): string {
  return translateFn(key, fallback, params);
}
