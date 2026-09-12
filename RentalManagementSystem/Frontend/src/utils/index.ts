import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency — mặc định là VND vì đây là app quản lý nhà trọ Việt Nam
export function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Format number — dấu chấm ngăn nghìn, dấu phẩy thập phân (ngược với tiếng Anh)
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('vi-VN', options).format(value);
}

// Format date — dd/MM/yyyy
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  return new Intl.DateTimeFormat('vi-VN', { ...defaultOptions, ...options }).format(dateObj);
}

// Format date for input fields
export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

// Parse date from input
export function parseDateFromInput(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Đọc một số do người dùng gõ, theo quy ước Việt Nam: dấu chấm ngăn nghìn,
 * dấu phẩy thập phân. Trả null nếu chuỗi không phải một số.
 *
 * Chuỗi số kiểu Việt Nam và kiểu Anh xung đột nhau ("1.500" là một nghìn năm
 * trăm ở đây nhưng là một phẩy năm ở kia), nên phải chọn dứt khoát. Quy tắc:
 *
 *   - Có cả `.` và `,`  → dấu xuất hiện SAU cùng là dấu thập phân.
 *     "1.500.000,50" → 1500000.5   ·   "1,500,000.50" → 1500000.5
 *   - Chỉ một loại dấu, xuất hiện nhiều lần → đó là dấu ngăn nghìn.
 *     "1.500.000" → 1500000
 *   - Chỉ một loại dấu, xuất hiện một lần, theo sau đúng 3 chữ số → ngăn nghìn.
 *     "1.500" → 1500 (đúng ý người nhập tiếng Việt)
 *   - Còn lại → dấu thập phân. "1,5" → 1.5   ·   "12.75" → 12.75
 *
 * Ký hiệu tiền tệ và khoảng trắng (kể cả non-breaking space của Intl) được bỏ
 * qua, nên dán thẳng "1.500.000 ₫" vào ô nhập vẫn đọc được.
 */
export function parseDecimalInput(input: string): number | null {
  const cleaned = input
    // \s không bao gồm U+00A0 (non-breaking space) và U+202F (narrow no-break
    // space) — đúng hai ký tự Intl chèn giữa số và ký hiệu tiền tệ.
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/[₫đ]/gi, '')
    .replace(/VND/gi, '');

  if (cleaned === '') return null;

  const match = /^([+-]?)([\d.,]+)$/.exec(cleaned);
  if (!match) return null;

  const [, sign, digits] = match;

  const lastDot = digits.lastIndexOf('.');
  const lastComma = digits.lastIndexOf(',');
  const dotCount = (digits.match(/\./g) ?? []).length;
  const commaCount = (digits.match(/,/g) ?? []).length;

  let decimalSeparator: string | null = null;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSeparator = lastDot > lastComma ? '.' : ',';
  } else if (dotCount === 1 || commaCount === 1) {
    const separator = dotCount === 1 ? '.' : ',';
    const fraction = digits.slice(digits.indexOf(separator) + 1);
    decimalSeparator = /^\d{3}$/.test(fraction) ? null : separator;
  }

  const integerPart =
    decimalSeparator === null
      ? digits.replace(/[.,]/g, '')
      : digits.slice(0, digits.lastIndexOf(decimalSeparator)).replace(/[.,]/g, '');
  const fractionPart =
    decimalSeparator === null ? '' : digits.slice(digits.lastIndexOf(decimalSeparator) + 1);

  if (integerPart === '' && fractionPart === '') return null;
  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) return null;

  const value = Number(`${sign}${integerPart || '0'}.${fractionPart || '0'}`);
  return Number.isFinite(value) ? value : null;
}

// Format percentage
export function formatPercentage(value: number, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%';
  }
  return `${value.toFixed(decimals)}%`;
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Get initials from name
export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${first}${last}`;
}

// Get status color
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Room statuses
    'Available': 'bg-green-100 text-green-800',
    'Occupied': 'bg-blue-100 text-blue-800',
    'Maintenance': 'bg-yellow-100 text-yellow-800',
    
    // Customer statuses
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Terminated': 'bg-red-100 text-red-800',
    
    // Invoice statuses
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Paid': 'bg-green-100 text-green-800',
    'Overdue': 'bg-red-100 text-red-800',
    'Cancelled': 'bg-gray-100 text-gray-800',
    
    // Payment methods
    'Cash': 'bg-green-100 text-green-800',
    'BankTransfer': 'bg-blue-100 text-blue-800',
    'Check': 'bg-purple-100 text-purple-800',
    'CreditCard': 'bg-indigo-100 text-indigo-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}

// Calculate pagination info
export function calculatePagination(page: number, pageSize: number, totalCount: number) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);
  
  return {
    totalPages,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    isFirstPage: page === 1,
    isLastPage: page === totalPages,
  };
}
