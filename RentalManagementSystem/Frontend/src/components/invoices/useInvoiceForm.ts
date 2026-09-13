import { useCallback, useMemo, useState } from 'react';
import type { CreateInvoiceRequest, InvoiceItem, Item, UpdateInvoiceRequest } from '../../types';
import { InvoiceStatus } from '../../types';
import { parseDecimalInput } from '../../utils';
import {
  calculateInvoiceItemsTotals,
  calculateItemTotals,
  roundToCents,
} from './invoiceItemCalculations';
import type { InvoiceItemsTotals } from './invoiceItemCalculations';

/* ═══════════════════════════════════════════════════════════════════════════
 * Toàn bộ phần TÍNH TIỀN và KIỂM TRA của form hoá đơn.
 *
 * Tách ra khỏi component vì ba lý do, không phải để cho file ngắn lại:
 *
 *   1. Số tiền ở đây là thứ đi vào sổ sách. Nó phải kiểm được bằng test mà
 *      không cần dựng React, không cần giả lập cú gõ phím.
 *   2. Bản cũ để rải rác: cộng dòng ở một chỗ, cộng phụ thu ở chỗ khác, và
 *      cùng một biểu thức `parseDecimalInput(...) ?? 0` chép lại SÁU lần trong
 *      JSX. Sáu bản chép là sáu chỗ có thể lệch nhau.
 *   3. Đánh số lại dòng sau khi xoá là việc dễ quên. Nhốt nó vào một chỗ.
 *
 * Hook này KHÔNG biết gì về i18n: nó trả về MÃ LỖI, còn dịch ra câu tiếng Việt
 * là việc của component. Nhờ vậy test không phải kéo theo LocalizationContext.
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface InvoiceFormValues {
  customerId: string;
  roomId: string;
  billingPeriod: string;
  dueDate: string;
  status: string;
  additionalCharges: string;
  discount: string;
  additionalChargesDescription: string;
  notes: string;
}

/** Mã lỗi. Component tra ra câu chữ. */
export type InvoiceErrorCode = 'required' | 'notANumber' | 'negative';

export type InvoiceFieldErrors = Partial<Record<keyof InvoiceFormValues, InvoiceErrorCode>>;

export interface InvoiceTotals extends InvoiceItemsTotals {
  /** Phụ thu đã đọc ra số. Gõ bậy thì là 0 — và validate sẽ chặn trước khi lưu. */
  additionalCharges: number;
  invoiceDiscount: number;
  /** Con số cuối cùng, đúng biểu thức backend dùng khi nó tính lại. */
  grandTotal: number;
}

/*
 * Danh sách trạng thái viết tay thay vì Object.values(InvoiceStatus): enum số
 * của TypeScript có ánh xạ ngược, nên Object.values trả về cả tên lẫn số và
 * phải lọc rồi ép kiểu. Bảng này vừa để kiểm tra giá trị, vừa là nguồn dựng
 * danh sách chọn trên form.
 */
export const INVOICE_STATUS_OPTIONS = [
  { status: InvoiceStatus.Draft, key: 'invoices.draft', fallback: 'Draft' },
  { status: InvoiceStatus.Issued, key: 'invoices.issued', fallback: 'Issued' },
  { status: InvoiceStatus.Unpaid, key: 'invoices.unpaid', fallback: 'Pending' },
  { status: InvoiceStatus.PartiallyPaid, key: 'invoices.partiallyPaid', fallback: 'Partially Paid' },
  { status: InvoiceStatus.Paid, key: 'invoices.paid', fallback: 'Paid' },
  { status: InvoiceStatus.Overdue, key: 'invoices.overdue', fallback: 'Overdue' },
  { status: InvoiceStatus.Cancelled, key: 'invoices.cancelled', fallback: 'Cancelled' },
] as const;

/** Đọc trạng thái từ chuỗi của ô chọn. Không khớp thành viên nào thì undefined. */
function toInvoiceStatus(raw: string): InvoiceStatus | undefined {
  const value = Number(raw);
  return INVOICE_STATUS_OPTIONS.find((option) => option.status === value)?.status;
}

const EMPTY_ITEM: InvoiceItem = {
  itemCode: '',
  itemName: '',
  description: '',
  quantity: 1,
  unitOfMeasure: 'pcs',
  unitPrice: 0,
  discountPercent: 0,
  discountAmount: 0,
  taxPercent: 0,
  taxAmount: 0,
  lineTotal: 0,
  lineTotalWithTax: 0,
  lineNumber: 1,
  category: '',
  notes: '',
};

function todayPlus(months: number, day?: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + months, day ?? 1);
  // Tự ghép chuỗi thay vì toISOString(): toISOString đổi sang UTC trước, nên ở
  // múi giờ +07 một ngày đầu tháng lùi thành ngày cuối tháng trước.
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const date = String(target.getDate()).padStart(2, '0');
  return `${target.getFullYear()}-${month}-${date}`;
}

export function emptyInvoiceValues(): InvoiceFormValues {
  return {
    customerId: '',
    roomId: '',
    billingPeriod: todayPlus(1),
    dueDate: todayPlus(1, 5),
    status: String(InvoiceStatus.Unpaid),
    additionalCharges: '0',
    discount: '0',
    additionalChargesDescription: '',
    notes: '',
  };
}

/**
 * Đọc một ô tiền do người dùng gõ.
 *
 * Ô rỗng tính là 0 — người ta xoá trắng ô "giảm giá" nghĩa là không giảm. Còn
 * chuỗi KHÔNG đọc được thì trả null, để validate bắt: bản cũ biến "abc" thành
 * 0 một cách im lặng, nên gõ nhầm là hoá đơn sai tiền mà không ai biết.
 */
function readAmount(raw: string): number | null {
  if (raw.trim() === '') return 0;
  return parseDecimalInput(raw);
}

interface UseInvoiceFormOptions {
  isEditMode: boolean;
}

export function useInvoiceForm({ isEditMode }: UseInvoiceFormOptions) {
  const [values, setValues] = useState<InvoiceFormValues>(emptyInvoiceValues);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [errors, setErrors] = useState<InvoiceFieldErrors>({});

  const setField = useCallback(<K extends keyof InvoiceFormValues>(
    field: K,
    value: InvoiceFormValues[K]
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    // Xoá lỗi ngay khi người dùng động vào ô đó. Giữ lại lỗi cũ trong lúc họ
    // đang sửa là bảo họ sai trong khi họ đang sửa cho đúng.
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  /** Nạp hoá đơn có sẵn vào form (chế độ sửa). */
  const resetTo = useCallback((next: InvoiceFormValues, nextItems: InvoiceItem[]) => {
    setValues(next);
    setItems(nextItems.map((item, index) => ({ ...item, lineNumber: index + 1 })));
    setErrors({});
  }, []);

  // ── Dòng hàng ──────────────────────────────────────────────────────────────

  const addItem = useCallback(() => {
    setItems((previous) => [...previous, { ...EMPTY_ITEM, lineNumber: previous.length + 1 }]);
  }, []);

  /** Sửa một trường của một dòng rồi tính lại NGAY dòng đó. */
  const updateItem = useCallback(
    <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => {
      setItems((previous) =>
        previous.map((item, i) =>
          i === index ? calculateItemTotals({ ...item, [field]: value }) : item
        )
      );
    },
    []
  );

  /** Chọn một khoản mục từ danh mục: chép thông tin sang dòng rồi tính lại. */
  const applyCatalogItem = useCallback((index: number, catalogItem: Item) => {
    setItems((previous) =>
      previous.map((item, i) =>
        i === index
          ? calculateItemTotals({
              ...item,
              itemCode: catalogItem.itemCode,
              itemName: catalogItem.itemName,
              description: catalogItem.description || '',
              unitOfMeasure: catalogItem.unitOfMeasure,
              unitPrice: catalogItem.unitPrice,
              taxPercent: catalogItem.taxPercent || 0,
              category: catalogItem.category || '',
            })
          : item
      )
    );
  }, []);

  /** Xoá một dòng VÀ đánh số lại — số dòng là thứ in ra hoá đơn, không được thủng. */
  const removeItem = useCallback((index: number) => {
    setItems((previous) =>
      previous
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, lineNumber: i + 1 }))
    );
  }, []);

  // ── Tiền ───────────────────────────────────────────────────────────────────

  const totals: InvoiceTotals = useMemo(() => {
    const itemsTotals = calculateInvoiceItemsTotals(items);
    const additionalCharges = readAmount(values.additionalCharges) ?? 0;
    const invoiceDiscount = readAmount(values.discount) ?? 0;

    return {
      ...itemsTotals,
      additionalCharges,
      invoiceDiscount,
      // Đúng biểu thức InvoiceService dùng, nên số xem trước ở đây là số được lưu.
      grandTotal: roundToCents(itemsTotals.total + additionalCharges - invoiceDiscount),
    };
  }, [items, values.additionalCharges, values.discount]);

  // ── Kiểm tra ───────────────────────────────────────────────────────────────

  /**
   * Trả về true nếu hợp lệ. Lỗi gắn vào từng ô, không gom thành một khối ở đầu
   * trang: gom lên đầu thì người dùng phải nhớ tên ô rồi tự đi tìm nó.
   */
  const validate = useCallback((): boolean => {
    const next: InvoiceFieldErrors = {};

    // Ở chế độ sửa, khách và phòng bị khoá nên không kiểm lại.
    if (!isEditMode) {
      if (!values.customerId) next.customerId = 'required';
      if (!values.roomId) next.roomId = 'required';
      if (!values.billingPeriod) next.billingPeriod = 'required';
    }
    if (!values.dueDate) next.dueDate = 'required';

    const additionalCharges = readAmount(values.additionalCharges);
    if (additionalCharges === null) next.additionalCharges = 'notANumber';
    else if (additionalCharges < 0) next.additionalCharges = 'negative';

    const discount = readAmount(values.discount);
    if (discount === null) next.discount = 'notANumber';
    else if (discount < 0) next.discount = 'negative';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [isEditMode, values]);

  // ── Dựng request ───────────────────────────────────────────────────────────

  /** Dòng trống hoàn toàn thì không gửi lên — người dùng bấm "Thêm" rồi bỏ đó. */
  const submittableItems = useMemo(
    () => items.filter((item) => item.itemCode.trim() !== '' || item.itemName.trim() !== ''),
    [items]
  );

  const toCreateRequest = useCallback(
    (): CreateInvoiceRequest => ({
      customerId: Number(values.customerId),
      roomId: Number(values.roomId),
      billingPeriod: values.billingPeriod,
      dueDate: values.dueDate,
      additionalCharges: totals.additionalCharges,
      discount: totals.invoiceDiscount,
      additionalChargesDescription: values.additionalChargesDescription,
      notes: values.notes,
      invoiceItems: submittableItems,
    }),
    [values, totals, submittableItems]
  );

  const toUpdateRequest = useCallback(
    (): UpdateInvoiceRequest => ({
      dueDate: values.dueDate,
      // Không khớp trạng thái nào thì BỎ HẲN trường này thay vì gửi NaN lên —
      // backend sẽ giữ nguyên trạng thái đang có.
      status: toInvoiceStatus(values.status),
      additionalCharges: totals.additionalCharges,
      discount: totals.invoiceDiscount,
      additionalChargesDescription: values.additionalChargesDescription,
      notes: values.notes,
      invoiceItems: submittableItems,
    }),
    [values, totals, submittableItems]
  );

  return {
    values,
    setField,
    resetTo,
    items,
    addItem,
    updateItem,
    applyCatalogItem,
    removeItem,
    totals,
    errors,
    validate,
    toCreateRequest,
    toUpdateRequest,
  };
}
