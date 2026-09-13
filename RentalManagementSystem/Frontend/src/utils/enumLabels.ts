/**
 * Nhãn hiển thị cho các enum backend trả về.
 *
 * Backend serialize enum ra TÊN TIẾNG ANH ("Vacant", "PartiallyPaid",
 * "BankTransfer") và các màn hình cũ in thẳng chuỗi đó ra giao diện. Kết quả:
 * bật tiếng Việt xong thì tiêu đề và nút là tiếng Việt còn cột trạng thái —
 * thứ người dùng nhìn nhiều nhất trong bảng — vẫn là tiếng Anh.
 *
 * Bảng này là nguồn sự thật duy nhất cho việc đó. Nó KHÔNG đụng gì tới màu:
 * màu và hình khối của trạng thái nằm ở statusStyles.ts, tra bằng cùng một
 * chuỗi enum. Hai bảng tra cùng một khoá, mỗi bảng lo một việc.
 *
 * Khoá tra bỏ hoa thường và dấu ngăn, giống statusStyles, nên "PartiallyPaid",
 * "partially_paid" và "partially paid" đều ra cùng một mục.
 */

import type { TranslationParams } from '../types/localization';

export interface EnumLabel {
  /** Khoá trong bảng Translations. */
  key: string;
  /** Chuỗi tiếng Anh dùng khi chưa có bản dịch. */
  fallback: string;
}

export type EnumLabelMap = Record<string, EnumLabel>;

/** Hàm dịch của LocalizationContext. */
type Translate = (key: string, fallback?: string, params?: TranslationParams) => string;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, '');
}

/**
 * Dịch một giá trị enum ra nhãn hiển thị.
 *
 * Không tra được thì TRẢ LẠI NGUYÊN CHUỖI chứ không trả về chuỗi rỗng hay dấu
 * gạch: backend thêm một trạng thái mới mà quên khai báo ở đây thì người dùng
 * vẫn đọc được "Refunded", còn hơn nhìn thấy một ô trống.
 */
export function enumLabel(
  t: Translate,
  map: EnumLabelMap,
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined) return '—';
  const raw = String(value);
  const entry = map[normalize(raw)];
  return entry ? t(entry.key, entry.fallback) : raw;
}

// ── Phòng ────────────────────────────────────────────────────────────────────

export const ROOM_STATUS_LABELS: EnumLabelMap = {
  vacant: { key: 'rooms.available', fallback: 'Available' },
  available: { key: 'rooms.available', fallback: 'Available' },
  rented: { key: 'rooms.occupied', fallback: 'Occupied' },
  occupied: { key: 'rooms.occupied', fallback: 'Occupied' },
  maintenance: { key: 'rooms.statusMaintenance', fallback: 'Maintenance' },
  reserved: { key: 'rooms.statusReserved', fallback: 'Reserved' },
};

export const ROOM_TYPE_LABELS: EnumLabelMap = {
  single: { key: 'rooms.typeSingle', fallback: 'Single' },
  double: { key: 'rooms.typeDouble', fallback: 'Double' },
  triple: { key: 'rooms.typeTriple', fallback: 'Triple' },
  suite: { key: 'rooms.typeSuite', fallback: 'Suite' },
  studio: { key: 'rooms.typeStudio', fallback: 'Studio' },
  apartment: { key: 'rooms.typeApartment', fallback: 'Apartment' },
};

// ── Hoá đơn ──────────────────────────────────────────────────────────────────

export const INVOICE_STATUS_LABELS: EnumLabelMap = {
  draft: { key: 'invoices.draft', fallback: 'Draft' },
  issued: { key: 'invoices.issued', fallback: 'Issued' },
  unpaid: { key: 'invoices.unpaid', fallback: 'Pending' },
  pending: { key: 'invoices.unpaid', fallback: 'Pending' },
  partiallypaid: { key: 'invoices.partiallyPaid', fallback: 'Partially Paid' },
  paid: { key: 'invoices.paid', fallback: 'Paid' },
  overdue: { key: 'invoices.overdue', fallback: 'Overdue' },
  cancelled: { key: 'invoices.cancelled', fallback: 'Cancelled' },
};

// ── Thanh toán ───────────────────────────────────────────────────────────────

/* Phủ đủ tám thành viên của enum PaymentMethod ở backend. Thiếu một cái là cột
   "Hình thức" của những dòng đó lại hiện tên enum tiếng Anh. */
export const PAYMENT_METHOD_LABELS: EnumLabelMap = {
  cash: { key: 'payments.cash', fallback: 'Cash' },
  check: { key: 'payments.check', fallback: 'Check' },
  banktransfer: { key: 'payments.bankTransfer', fallback: 'Bank Transfer' },
  creditcard: { key: 'payments.creditCard', fallback: 'Credit Card' },
  debitcard: { key: 'payments.debitCard', fallback: 'Debit Card' },
  digitalwallet: { key: 'payments.digitalWallet', fallback: 'Digital Wallet' },
  moneyorder: { key: 'payments.moneyOrder', fallback: 'Money Order' },
  other: { key: 'payments.other', fallback: 'Other' },
};
