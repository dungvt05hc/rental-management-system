import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '../ui';
import { customerService, invoiceService, itemService, roomService } from '../../services';
import type { Customer, Item, Room } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import { emptyInvoiceValues, INVOICE_STATUS_OPTIONS, useInvoiceForm } from './useInvoiceForm';
import type { InvoiceErrorCode, InvoiceFormValues } from './useInvoiceForm';

/* ═══════════════════════════════════════════════════════════════════════════
 * Lập / sửa hoá đơn.
 *
 * Toàn bộ phép tính và luật kiểm tra nằm ở useInvoiceForm. File này chỉ còn
 * việc: nạp dữ liệu, bày ô nhập, gửi đi.
 *
 * BA THỨ ĐÃ ĐỔI SO VỚI BẢN CŨ:
 *
 *   1. TỔNG TIỀN DÍNH ĐÁY. Bản cũ đặt tổng tiền trong một thẻ ở giữa trang;
 *      lúc đang gõ dòng thứ tám thì nó đã cuộn mất từ lâu. Nay nó nằm cùng
 *      thanh với nút Lưu — thứ người ta nhìn trước khi bấm lưu chính là số
 *      tiền sắp ghi vào sổ.
 *
 *   2. LỖI NẰM CẠNH Ô SAI. Bản cũ chỉ có `required` của HTML, nên trình duyệt
 *      hiện bong bóng ở ô đầu tiên rồi thôi. Nay mỗi ô tự mang câu lỗi của nó,
 *      và form cuộn tới ô sai đầu tiên.
 *
 *   3. Thẻ không còn đánh số 1-2-3-4 kèm vòng tròn xanh và nền gradient. Bốn
 *      bước đó không phải một wizard — mọi thứ đều hiện cùng lúc trên một
 *      trang, nên đánh số chúng là hứa một thứ tự không có thật.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Ô nào sai thì cuộn tới ô đó. Thứ tự đúng như thứ tự bày trên trang. */
const FIELD_ORDER: (keyof InvoiceFormValues)[] = [
  'customerId',
  'roomId',
  'billingPeriod',
  'dueDate',
  'additionalCharges',
  'discount',
];

export function InvoiceFormPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const form = useInvoiceForm({ isEditMode });
  const { values, setField, errors, totals } = form;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemIndex: number | null;
    itemName: string;
  }>({ open: false, itemIndex: null, itemName: '' });

  /** Mã lỗi → câu tiếng Việt. Hook chỉ trả mã, dịch là việc của chỗ này. */
  const errorMessage = useCallback(
    (code: InvoiceErrorCode | undefined): string | undefined => {
      if (!code) return undefined;
      switch (code) {
        case 'required':
          return t('validation.required', 'This field is required');
        case 'notANumber':
          return t('validation.notANumber', 'Enter a number, for example 1.500.000');
        case 'negative':
          return t('validation.negative', 'The amount cannot be negative');
      }
    },
    [t]
  );

  const { resetTo } = form;

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      // Danh mục dùng chung cho cả hai chế độ; hỏng thì ô chọn rỗng chứ không
      // chặn cả form — vẫn gõ tay tên khoản mục được.
      const [customersResponse, roomsResponse, itemsResponse] = await Promise.all([
        customerService.getCustomers({ pageSize: 1000 }),
        roomService.getRooms({ pageSize: 1000 }),
        itemService.getItems({ pageSize: 1000, isActive: true }),
      ]);

      if (cancelled) return;
      if (customersResponse.success && customersResponse.data) setCustomers(customersResponse.data.items || []);
      if (roomsResponse.success && roomsResponse.data) setRooms(roomsResponse.data.items || []);
      if (itemsResponse.success && itemsResponse.data) setCatalog(itemsResponse.data.items || []);

      if (!isEditMode || !id) return;

      try {
        const response = await invoiceService.getInvoice(id);
        if (cancelled) return;

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to load invoice');
        }

        const invoice = response.data;
        resetTo(
          {
            ...emptyInvoiceValues(),
            customerId: String(invoice.customer?.id ?? invoice.customerId ?? ''),
            roomId: String(invoice.room?.id ?? invoice.roomId ?? ''),
            billingPeriod: invoice.billingPeriod?.split('T')[0] ?? '',
            dueDate: invoice.dueDate?.split('T')[0] ?? '',
            status: String(invoice.status ?? ''),
            additionalCharges: String(invoice.additionalCharges ?? 0),
            discount: String(invoice.discount ?? 0),
            additionalChargesDescription: invoice.additionalChargesDescription ?? '',
            notes: invoice.notes ?? '',
          },
          invoice.invoiceItems ?? []
        );
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAll().finally(() => {
      if (!cancelled && !isEditMode) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, resetTo]);

  /* Chọn khách thì tự điền phòng theo hợp đồng đang hiệu lực của họ — hoá đơn
     luôn phát hành dưới một hợp đồng, và hợp đồng mới là thứ gắn với phòng. */
  const handleCustomerChange = (customerId: string) => {
    setField('customerId', customerId);
    const customer = customers.find((entry) => String(entry.id) === customerId);
    if (customer?.room?.id) setField('roomId', String(customer.room.id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.validate()) {
      // Đưa người dùng tới đúng ô sai đầu tiên thay vì để họ tự dò cả trang.
      const firstBad = FIELD_ORDER.find((field) => form.errors[field]);
      if (firstBad) {
        document.getElementById(`invoice-${firstBad}`)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
        document.getElementById(`invoice-${firstBad}`)?.focus({ preventScroll: true });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const response =
        isEditMode && id
          ? await invoiceService.updateInvoice(id, form.toUpdateRequest())
          : await invoiceService.createInvoice(form.toCreateRequest());

      if (response.success) {
        showSuccess(
          t('common.success', 'Success'),
          isEditMode
            ? t('invoices.updateSuccess', 'Invoice updated successfully')
            : t('invoices.createSuccess', 'Invoice created successfully')
        );
        navigate('/invoices');
      } else {
        showError(
          t('common.error', 'Error'),
          response.message ||
            (isEditMode
              ? t('invoices.updateError', 'Failed to update invoice')
              : t('invoices.createError', 'Failed to create invoice'))
        );
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusItems = useMemo(
    () =>
      INVOICE_STATUS_OPTIONS.map((option) => ({
        value: String(option.status),
        label: t(option.key, option.fallback),
      })),
    [t]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-8 w-64" />
        <Card className="p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </Card>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="self-start px-2"
          onClick={() => navigate('/invoices')}
          leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
        >
          {t('invoices.backToList', 'Back to invoices')}
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {isEditMode
              ? t('invoices.editInvoice', 'Edit Invoice')
              : t('invoices.createInvoice', 'Create Invoice')}
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {isEditMode
              ? t('invoices.editSubtitle', 'Change the invoice details and its line items')
              : t('invoices.createSubtitle', 'Fill in the details below to raise a new invoice')}
          </p>
        </div>
      </div>

      {loadError && (
        <Alert variant="error" title={t('invoices.loadError', 'Could not load invoice')}>
          {t('common.unexpectedError', 'An error occurred')}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* ── Thông tin hoá đơn ───────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('invoices.billingInformation', 'Billing Information')}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="invoice-customerId"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                {t('invoices.customer', 'Customer')}
                <span aria-hidden="true" className="ml-0.5 text-destructive">
                  *
                </span>
              </label>
              <Select
                value={values.customerId}
                onValueChange={handleCustomerChange}
                disabled={isEditMode}
              >
                <SelectTrigger
                  id="invoice-customerId"
                  aria-invalid={errors.customerId ? true : undefined}
                  aria-describedby={errors.customerId ? 'invoice-customerId-error' : undefined}
                  className={errors.customerId ? 'border-destructive' : undefined}
                >
                  <SelectValue placeholder={t('invoices.selectCustomer', 'Select a customer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.fullName || `${customer.firstName} ${customer.lastName}`}
                      {customer.room
                        ? ` — ${t('rooms.roomLabel', 'Room {number}', {
                            number: customer.room.roomNumber,
                          })}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p id="invoice-customerId-error" role="alert" className="mt-1.5 text-sm text-destructive">
                  {errorMessage(errors.customerId)}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="invoice-roomId" className="mb-1.5 block text-sm font-medium text-ink">
                {t('contracts.room', 'Room')}
                <span aria-hidden="true" className="ml-0.5 text-destructive">
                  *
                </span>
              </label>
              <Select
                value={values.roomId}
                onValueChange={(value) => setField('roomId', value)}
                disabled={isEditMode}
              >
                <SelectTrigger
                  id="invoice-roomId"
                  aria-invalid={errors.roomId ? true : undefined}
                  aria-describedby={errors.roomId ? 'invoice-roomId-error' : undefined}
                  className={errors.roomId ? 'border-destructive' : undefined}
                >
                  <SelectValue placeholder={t('contracts.selectRoom', 'Select a room')} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {t('rooms.roomLabel', 'Room {number}', { number: room.roomNumber })} —{' '}
                      {t('rooms.perMonth', '{amount}/month', {
                        amount: formatCurrency(room.monthlyRent),
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomId && (
                <p id="invoice-roomId-error" role="alert" className="mt-1.5 text-sm text-destructive">
                  {errorMessage(errors.roomId)}
                </p>
              )}
            </div>

            <Input
              id="invoice-billingPeriod"
              type="date"
              label={t('invoices.billingPeriod', 'Billing Period')}
              required
              value={values.billingPeriod}
              onChange={(event) => setField('billingPeriod', event.target.value)}
              disabled={isEditMode}
              error={errorMessage(errors.billingPeriod)}
            />

            <Input
              id="invoice-dueDate"
              type="date"
              label={t('invoices.dueDate', 'Due Date')}
              required
              value={values.dueDate}
              onChange={(event) => setField('dueDate', event.target.value)}
              error={errorMessage(errors.dueDate)}
            />

            {isEditMode && (
              <div>
                <label htmlFor="invoice-status" className="mb-1.5 block text-sm font-medium text-ink">
                  {t('rooms.status', 'Status')}
                </label>
                <Select value={values.status} onValueChange={(value) => setField('status', value)}>
                  <SelectTrigger id="invoice-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusItems.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* ── Các dòng hàng ───────────────────────────────────────────────── */}
        <InvoiceItemsTable
          items={form.items}
          catalog={catalog}
          totals={totals}
          disabled={isSubmitting}
          onAdd={form.addItem}
          onUpdate={form.updateItem}
          onSelectCatalogItem={form.applyCatalogItem}
          onRemove={(index, itemName) => setConfirmDialog({ open: true, itemIndex: index, itemName })}
        />

        {/* ── Phụ thu và giảm giá ─────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('invoices.chargesAndDiscounts', 'Additional charges and discounts')}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              id="invoice-additionalCharges"
              inputMode="decimal"
              numeric
              suffix="₫"
              label={t('invoices.additionalCharges', 'Additional Charges')}
              value={values.additionalCharges}
              onChange={(event) => setField('additionalCharges', event.target.value)}
              error={errorMessage(errors.additionalCharges)}
            />
            <Input
              id="invoice-discount"
              inputMode="decimal"
              numeric
              suffix="₫"
              label={t('invoices.discount', 'Discount')}
              value={values.discount}
              onChange={(event) => setField('discount', event.target.value)}
              error={errorMessage(errors.discount)}
            />
          </div>

          {totals.additionalCharges > 0 && (
            <div className="mt-4">
              <label
                htmlFor="invoice-charges-description"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                {t('invoices.additionalChargesDescription', 'What the additional charges are for')}
              </label>
              <textarea
                id="invoice-charges-description"
                rows={2}
                value={values.additionalChargesDescription}
                onChange={(event) => setField('additionalChargesDescription', event.target.value)}
                placeholder={t('invoices.additionalChargesPlaceholder', 'e.g. utilities, repairs, late fee...')}
                className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-ink transition-colors duration-100 placeholder:text-ink-muted hover:border-ink-muted"
              />
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="invoice-notes" className="mb-1.5 block text-sm font-medium text-ink">
              {t('common.notes', 'Notes')}
            </label>
            <textarea
              id="invoice-notes"
              rows={3}
              value={values.notes}
              onChange={(event) => setField('notes', event.target.value)}
              placeholder={t('invoices.notesPlaceholder', 'Notes about this invoice...')}
              className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-ink transition-colors duration-100 placeholder:text-ink-muted hover:border-ink-muted"
            />
          </div>
        </Card>

        {/*
         * ── Thanh dính đáy ────────────────────────────────────────────────
         * Tổng tiền và nút Lưu đi cùng nhau và luôn nhìn thấy. `sticky` chứ
         * không `fixed`: fixed nằm ngoài luồng trang nên nó che mất phần cuối
         * form, và bản cũ phải bù bằng pb-20 ước chừng.
         */}
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface px-4 py-3 shadow-sticky sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">
                {t('invoices.grandTotal', 'Invoice grand total')}
              </p>
              <p className="numeric text-2xl font-semibold text-ink">
                {formatCurrency(totals.grandTotal)}
              </p>
              {/* Chỉ nói ra phần cấu thành khi nó khác tổng các dòng. */}
              {(totals.additionalCharges > 0 || totals.invoiceDiscount > 0) && (
                <p className="text-xs text-ink-muted">
                  <span className="numeric">{formatCurrency(totals.total)}</span>
                  {totals.additionalCharges > 0 && (
                    <>
                      {' + '}
                      <span className="numeric">{formatCurrency(totals.additionalCharges)}</span>
                    </>
                  )}
                  {totals.invoiceDiscount > 0 && (
                    <>
                      {' − '}
                      <span className="numeric">{formatCurrency(totals.invoiceDiscount)}</span>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/invoices')}
                disabled={isSubmitting}
                className="max-sm:flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText={t('common.saving', 'Saving...')}
                leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
                className="max-sm:flex-1"
              >
                {isEditMode
                  ? t('invoices.updateInvoice', 'Update Invoice')
                  : t('invoices.createInvoice', 'Create Invoice')}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, itemIndex: null, itemName: '' })}
        title={t('invoices.deleteItemTitle', 'Delete Item')}
        description={t('invoices.deleteItemMessage', 'Remove "{name}" from this invoice?', {
          name: confirmDialog.itemName,
        })}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={() => {
          if (confirmDialog.itemIndex !== null) form.removeItem(confirmDialog.itemIndex);
          setConfirmDialog({ open: false, itemIndex: null, itemName: '' });
        }}
        variant="warning"
      />
    </div>
  );
}
