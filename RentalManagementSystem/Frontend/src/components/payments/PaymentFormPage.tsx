import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, CreditCard, Landmark, ReceiptText, Save } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  NumericInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '../ui';
import { invoiceService, paymentService } from '../../services';
import type { CreatePaymentRequest, Invoice, InvoiceSummary } from '../../types';
import { InvoiceStatus, PaymentMethod } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { cn, formatCurrency, formatDate } from '../../utils';

/* ═══════════════════════════════════════════════════════════════════════════
 * Ghi nhận một khoản thu.
 *
 * Màn hình này chỉ có MỘT câu hỏi thật: thu của hoá đơn nào, bao nhiêu tiền.
 * Mọi thứ còn lại (hình thức, mã tham chiếu, ghi chú) là phụ.
 *
 * Vì vậy, ngay khi chọn hoá đơn, phần CÒN NỢ hiện ra cỡ lớn kèm nút "Thu hết" —
 * trường hợp thường gặp nhất là khách trả trọn phần còn lại, và gõ lại con số
 * đó bằng tay là vừa chậm vừa dễ gõ nhầm một chữ số.
 *
 * BỐN THỨ ĐÃ SỬA:
 *
 *   1. Bản cũ bày bốn hình thức thanh toán thành bốn ô vuông to, mỗi ô một
 *      icon THẺ TÍN DỤNG GIỐNG HỆT NHAU — kể cả ô "Tiền mặt". Bốn icon giống
 *      nhau không phân biệt được gì, chỉ tốn chỗ.
 *   2. Ở chế độ SỬA, ô chọn hoá đơn luôn rỗng: danh sách chỉ nạp những hoá đơn
 *      CÒN NỢ, mà hoá đơn của khoản thu đang sửa thường đã trả xong nên không
 *      có trong danh sách. Nay chế độ sửa hiện thẳng hoá đơn đó dạng chữ.
 *   3. "Tổng tiền" lấy `invoice.amount` (tiền gốc) thay vì `totalAmount` (đã
 *      gồm phụ thu và giảm giá) — hai số này lệch nhau ở mọi hoá đơn có phụ thu.
 *   4. Chữ "remaining" viết cứng tiếng Anh trong danh sách chọn.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Mỗi hình thức một icon RIÊNG. Icon chỉ có ích khi nó khác nhau. */
const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  key: string;
  fallback: string;
  Icon: LucideIcon;
}> = [
  { value: PaymentMethod.Cash, key: 'payments.cash', fallback: 'Cash', Icon: Banknote },
  { value: PaymentMethod.BankTransfer, key: 'payments.bankTransfer', fallback: 'Bank Transfer', Icon: Landmark },
  { value: PaymentMethod.Check, key: 'payments.check', fallback: 'Check', Icon: ReceiptText },
  { value: PaymentMethod.CreditCard, key: 'payments.creditCard', fallback: 'Credit Card', Icon: CreditCard },
];

type FieldName = 'invoiceId' | 'amount' | 'paymentDate';
type FieldErrors = Partial<Record<FieldName, string>>;

export function PaymentFormPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  /** Hoá đơn của khoản thu đang sửa. Nó có thể không nằm trong `invoices`. */
  const [lockedInvoice, setLockedInvoice] = useState<InvoiceSummary | null>(null);

  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  });
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const clearError = (field: FieldName) =>
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });

  const load = useCallback(async () => {
    // Chỉ nạp hoá đơn còn nợ khi ĐANG TẠO MỚI — lúc sửa thì hoá đơn đã cố định.
    if (!isEditMode) {
      const response = await invoiceService.getInvoices({ page: 1, pageSize: 200 });
      if (response.success && response.data) {
        setInvoices(
          (response.data.items || []).filter(
            (invoice) => (invoice.remainingBalance ?? 0) > 0 && invoice.status !== InvoiceStatus.Paid
          )
        );
      }
      return;
    }

    if (!id) return;
    try {
      const response = await paymentService.getPayment(id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load payment');
      }
      const payment = response.data;
      setLockedInvoice(payment.invoice ?? null);
      setInvoiceId(String(payment.invoice?.id ?? ''));
      setAmount(payment.amount);
      setPaymentDate(payment.paymentDate.split('T')[0]);
      setMethod(payment.method);
      setReferenceNumber(payment.referenceNumber || '');
      setNotes(payment.notes || '');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load payment');
    } finally {
      setIsLoading(false);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === invoiceId);

  /** Phần còn nợ của hoá đơn đang chọn — nguồn dữ liệu khác nhau giữa tạo và sửa. */
  const remaining = isEditMode
    ? lockedInvoice?.remainingBalance ?? 0
    : selectedInvoice?.remainingBalance ?? 0;

  const invoiceTotal = isEditMode
    ? lockedInvoice?.totalAmount ?? 0
    : selectedInvoice?.totalAmount ?? selectedInvoice?.amount ?? 0;

  const customerLabel = isEditMode
    ? lockedInvoice?.customerName
    : selectedInvoice?.customer
      ? selectedInvoice.customer.fullName ||
        `${selectedInvoice.customer.firstName} ${selectedInvoice.customer.lastName}`
      : undefined;

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!invoiceId) next.invoiceId = t('payments.invoiceRequired', 'Please select an invoice');
    if (amount === null || amount <= 0) {
      next.amount = t('payments.amountRequired', 'Amount must be greater than 0');
    }
    if (!paymentDate) next.paymentDate = t('payments.dateRequired', 'Payment date is required');
    setErrors(next);
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const found = validate();
    if (Object.keys(found).length > 0) {
      const order: FieldName[] = ['invoiceId', 'amount', 'paymentDate'];
      const firstBad = order.find((field) => found[field]);
      const target = firstBad ? document.getElementById(`payment-${firstBad}`) : null;
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target?.focus({ preventScroll: true });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePaymentRequest = {
        invoiceId: Number(invoiceId),
        amount: amount ?? 0,
        paymentDate: new Date(paymentDate).toISOString(),
        method,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      };

      const response =
        isEditMode && id
          ? await paymentService.updatePayment(id, payload)
          : await paymentService.createPayment(payload);

      if (response.success) {
        showSuccess(
          t('common.success', 'Success'),
          isEditMode
            ? t('payments.updateSuccess', 'Payment updated successfully')
            : t('payments.createSuccess', 'Payment recorded successfully')
        );
        navigate('/payments');
      } else {
        showError(
          t('common.error', 'Error'),
          response.message ||
            (isEditMode
              ? t('payments.updateError', 'Failed to update payment')
              : t('payments.createError', 'Failed to record payment'))
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasInvoice = Boolean(invoiceId);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Button
        variant="ghost"
        size="sm"
        className="self-start px-2"
        onClick={() => navigate('/payments')}
        leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
      >
        {t('payments.title', 'Payments')}
      </Button>

      <div>
        <h1 className="text-xl font-semibold text-ink">
          {isEditMode
            ? t('payments.editPayment', 'Edit Payment')
            : t('payments.recordNewPayment', 'Record New Payment')}
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          {isEditMode
            ? t('payments.updatePaymentDetails', 'Update payment transaction details')
            : t('payments.recordPaymentDetails', 'Record a payment transaction for an invoice')}
        </p>
      </div>

      {loadError && (
        <Alert variant="error" title={t('payments.loadError', 'Failed to load payment')}>
          {loadError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* ── Hoá đơn ─────────────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('payments.invoiceInfo', 'Invoice Information')}
          </h2>

          <div className="mt-4">
            {isEditMode ? (
              // Sửa thì hoá đơn không đổi được, nên hiện dạng chữ thay vì một ô
              // chọn bị khoá — ô chọn bị khoá trông như thứ hỏng.
              <div>
                <p className="text-xs text-ink-muted">{t('invoices.invoice', 'Invoice')}</p>
                <p className="numeric text-base font-semibold text-ink">
                  {lockedInvoice?.invoiceNumber ?? '—'}
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="payment-invoiceId"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  {t('payments.selectInvoice', 'Select Invoice')}
                  <span aria-hidden="true" className="ml-0.5 text-destructive">
                    *
                  </span>
                </label>
                <Select
                  value={invoiceId}
                  onValueChange={(value) => {
                    setInvoiceId(value);
                    clearError('invoiceId');
                    setAmount(null);
                  }}
                >
                  <SelectTrigger
                    id="payment-invoiceId"
                    aria-invalid={errors.invoiceId ? true : undefined}
                    aria-describedby={errors.invoiceId ? 'payment-invoiceId-error' : undefined}
                    className={errors.invoiceId ? 'border-destructive' : undefined}
                  >
                    <SelectValue
                      placeholder={t('payments.selectInvoicePlaceholder', '-- Select an invoice --')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={String(invoice.id)}>
                        {invoice.invoiceNumber} ·{' '}
                        {invoice.customer
                          ? invoice.customer.fullName ||
                            `${invoice.customer.firstName} ${invoice.customer.lastName}`
                          : '—'}{' '}
                        ·{' '}
                        {t('invoices.dueAmount', '{amount} due', {
                          amount: formatCurrency(invoice.remainingBalance ?? 0),
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.invoiceId ? (
                  <p
                    id="payment-invoiceId-error"
                    role="alert"
                    className="mt-1.5 text-sm text-destructive"
                  >
                    {errors.invoiceId}
                  </p>
                ) : (
                  invoices.length === 0 && (
                    <p className="mt-1.5 text-sm text-ink-muted">
                      {t('payments.noOpenInvoices', 'Every invoice is settled — there is nothing to collect.')}
                    </p>
                  )
                )}
              </div>
            )}

            {hasInvoice && (
              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-3 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-ink-muted">{t('invoices.customer', 'Customer')}</dt>
                  <dd className="truncate text-sm font-medium text-ink">{customerLabel ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">
                    {t('invoices.totalAmount', 'Total Amount')}
                  </dt>
                  <dd className="numeric text-sm text-ink">{formatCurrency(invoiceTotal)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t('invoices.dueDate', 'Due Date')}</dt>
                  <dd className="numeric text-sm text-ink">
                    {isEditMode
                      ? lockedInvoice?.dueDate
                        ? formatDate(lockedInvoice.dueDate)
                        : '—'
                      : selectedInvoice
                        ? formatDate(selectedInvoice.dueDate)
                        : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">
                    {t('payments.remaining', 'Remaining Balance')}
                  </dt>
                  <dd className="numeric text-base font-semibold text-status-overdue">
                    {formatCurrency(remaining)}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </Card>

        {/* ── Khoản thu ───────────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">
            {t('payments.paymentDetails', 'Payment Details')}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <NumericInput
                id="payment-amount"
                label={t('payments.amount', 'Payment Amount')}
                required
                suffix="₫"
                value={amount}
                onValueChange={(value) => {
                  setAmount(value);
                  clearError('amount');
                }}
                error={errors.amount}
              />

              {/* Trường hợp thường gặp nhất: khách trả trọn phần còn nợ. */}
              {remaining > 0 && amount !== remaining && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setAmount(remaining);
                    clearError('amount');
                  }}
                >
                  {t('payments.payFull', 'Collect the full {amount}', {
                    amount: formatCurrency(remaining),
                  })}
                </Button>
              )}

              {/* Cảnh báo, không phải lỗi: thu dư vẫn ghi nhận được. */}
              {remaining > 0 && amount !== null && amount > remaining && (
                <p role="status" className="mt-2 text-sm text-status-maintenance">
                  {t('payments.amountExceeds', 'Amount exceeds remaining balance')}
                </p>
              )}
            </div>

            <Input
              id="payment-paymentDate"
              type="date"
              label={t('payments.paymentDate', 'Payment Date')}
              required
              value={paymentDate}
              onChange={(event) => {
                setPaymentDate(event.target.value);
                clearError('paymentDate');
              }}
              error={errors.paymentDate}
            />
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-medium text-ink">
              {t('payments.paymentMethod', 'Payment Method')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(({ value, key, fallback, Icon }) => {
                const isSelected = method === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    aria-pressed={isSelected}
                    className={cn(
                      'focus-ring inline-flex min-h-touch items-center gap-2 rounded-md border px-3 text-sm font-medium',
                      'transition-colors duration-100 sm:min-h-10',
                      isSelected
                        ? 'border-primary bg-primary-tint text-primary'
                        : 'border-input bg-surface text-ink hover:bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t(key, fallback)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label={t('payments.referenceNumber', 'Reference Number')}
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              placeholder={t('payments.referencePlaceholder', 'Transaction reference, check number, etc.')}
            />
            <div>
              <label htmlFor="payment-notes" className="mb-1.5 block text-sm font-medium text-ink">
                {t('common.notes', 'Notes')}
              </label>
              <textarea
                id="payment-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t('payments.notesPlaceholder', 'Additional notes about this payment...')}
                className="focus-ring w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-ink transition-colors duration-100 placeholder:text-ink-muted hover:border-ink-muted"
              />
            </div>
          </div>
        </Card>

        {/* ── Thanh dính đáy ──────────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface px-4 py-3 shadow-sticky sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">{t('payments.amount', 'Payment Amount')}</p>
              <p className="numeric text-2xl font-semibold text-ink">
                {amount === null ? '—' : formatCurrency(amount)}
              </p>
              {hasInvoice && amount !== null && amount > 0 && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  {t('payments.afterThis', 'Left after this')}{' '}
                  <span className="numeric">{formatCurrency(Math.max(0, remaining - amount))}</span>
                  {remaining - amount <= 0 && (
                    <Badge status="paid" size="sm">
                      {t('invoices.paid', 'Paid')}
                    </Badge>
                  )}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/payments')}
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
                  ? t('payments.updatePayment', 'Update Payment')
                  : t('payments.recordPayment', 'Record Payment')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
