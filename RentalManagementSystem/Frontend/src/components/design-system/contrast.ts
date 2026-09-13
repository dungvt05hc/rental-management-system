/**
 * Tính tỉ lệ tương phản WCAG 2.1 từ giá trị token THẬT đang áp dụng trong trình
 * duyệt, không phải từ bảng hex chép tay.
 *
 * Chép tay thì sớm muộn cũng lệch: ai đó sửa một hex trong index.css, trang
 * kiểm tra vẫn báo PASS theo số cũ. Đọc bằng getComputedStyle thì trang luôn
 * nói đúng về bộ token hiện tại.
 */

export interface ContrastCheck {
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  /** Ngưỡng cần đạt: 4.5 cho chữ thường, 3 cho chữ lớn và thành phần tương tác. */
  required: number;
  passes: boolean;
  note?: string;
}

/** Đọc giá trị một custom property trên :root. */
export function readToken(name: string): string {
  if (typeof document === 'undefined') return '#000000';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function parseHex(value: string): [number, number, number] {
  const hex = value.replace('#', '').trim();
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

function channel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Độ sáng tương đối theo WCAG 2.1. */
export function luminance(color: string): number {
  const [r, g, b] = parseHex(color).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Độ sáng cảm nhận 0–100 — dùng để chỉ ra chuyện in đen trắng. */
export function perceivedLightness(color: string): number {
  return Math.round(luminance(color) ** (1 / 2.2) * 100);
}

export function check(
  label: string,
  foregroundToken: string,
  backgroundToken: string,
  required: number,
  note?: string
): ContrastCheck {
  const foreground = readToken(foregroundToken);
  const background = readToken(backgroundToken);
  const ratio = contrastRatio(foreground, background);
  return {
    label,
    foreground,
    background,
    ratio,
    required,
    passes: ratio >= required,
    note,
  };
}

/**
 * Toàn bộ cặp màu mà bộ token này cam kết.
 *
 * Danh sách này là nguồn sự thật cho cả hai chỗ: trang /design-system đo nó
 * trong trình duyệt, còn contrast.test.ts đọc thẳng src/index.css và đo lại lúc
 * chạy test. Nghĩa là không ai hạ được một màu xuống dưới ngưỡng AA mà test vẫn
 * xanh.
 *
 * [nhãn, token chữ, token nền, ngưỡng, ghi chú]
 */
export const CONTRAST_PAIRS: ReadonlyArray<
  readonly [string, string, string, number, string?]
> = [
  // ── Chữ trên nền ────────────────────────────────────────────────────────
  ['Chữ chính trên thẻ trắng', '--color-ink', '--color-surface', 4.5],
  ['Chữ chính trên nền app', '--color-ink', '--color-canvas', 4.5],
  ['Chữ phụ trên thẻ trắng', '--color-ink-muted', '--color-surface', 4.5],
  ['Chữ phụ trên nền app', '--color-ink-muted', '--color-canvas', 4.5],
  ['Link / chữ primary trên thẻ', '--color-primary', '--color-surface', 4.5],

  // ── Thành phần tương tác: WCAG 1.4.11 đòi ≥ 3:1 ─────────────────────────
  ['Viền ô nhập trên thẻ', '--color-input', '--color-surface', 3, 'WCAG 1.4.11'],
  ['Viền ô nhập trên nền app', '--color-input', '--color-canvas', 3, 'WCAG 1.4.11'],
  ['Focus ring trên thẻ', '--color-ring', '--color-surface', 3, 'WCAG 1.4.11'],
  ['Focus ring trên nền app', '--color-ring', '--color-canvas', 3, 'WCAG 1.4.11'],
  ['Công tắc khi tắt trên thẻ', '--color-line-strong', '--color-surface', 3, 'WCAG 1.4.11'],

  // ── Nút ──────────────────────────────────────────────────────────────────
  ['Chữ trên nút chính', '--color-primary-foreground', '--color-primary', 4.5],
  ['Chữ trên nút chính khi hover', '--color-primary-foreground', '--color-primary-hover', 4.5],
  ['Chữ trên nút xoá', '--color-destructive-foreground', '--color-destructive', 4.5],
  ['Chữ trên nút xoá khi hover', '--color-destructive-foreground', '--color-destructive-hover', 4.5],
  ['Chữ trên nút phụ', '--color-secondary-foreground', '--color-secondary', 4.5],

  // ── Chip trạng thái: đặc ─────────────────────────────────────────────────
  ['Trống — chip đặc', '--color-surface', '--color-status-available', 4.5],
  ['Đã thuê — chip đặc', '--color-surface', '--color-status-occupied', 4.5],
  ['Bảo trì — chip đặc', '--color-surface', '--color-status-maintenance', 4.5],
  ['Quá hạn — chip đặc', '--color-surface', '--color-status-overdue', 4.5],
  ['Đã thanh toán — chip đặc', '--color-surface', '--color-status-paid', 4.5],

  // ── Chip trạng thái: nhạt ────────────────────────────────────────────────
  ['Trống — chip nhạt', '--color-status-available', '--color-status-available-tint', 4.5],
  ['Đã thuê — chip nhạt', '--color-status-occupied', '--color-status-occupied-tint', 4.5],
  ['Bảo trì — chip nhạt', '--color-status-maintenance', '--color-status-maintenance-tint', 4.5],
  ['Quá hạn — chip nhạt', '--color-status-overdue', '--color-status-overdue-tint', 4.5],
  ['Đã thanh toán — chip nhạt', '--color-status-paid', '--color-status-paid-tint', 4.5],

  // ── Nền chip đặc so với nền app: phải thấy được khối chip ────────────────
  ['Nền chip Quá hạn vs nền app', '--color-status-overdue', '--color-canvas', 3, 'WCAG 1.4.11'],
  ['Nền chip Bảo trì vs nền app', '--color-status-maintenance', '--color-canvas', 3, 'WCAG 1.4.11'],
  ['Nền chip Trống vs nền app', '--color-status-available', '--color-canvas', 3, 'WCAG 1.4.11'],
];

/** Đo lại toàn bộ danh sách trên với token đang áp dụng trong trình duyệt. */
export function runAllChecks(): ContrastCheck[] {
  return CONTRAST_PAIRS.map(([label, fg, bg, required, note]) =>
    check(label, fg, bg, required, note)
  );
}
