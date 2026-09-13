import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Pencil, Printer } from 'lucide-react';
import { AlertDialog, Badge, Button, EmptyState, Skeleton } from '../ui';
import type { AlertType } from '../ui';
import {
  enumLabel,
  formatCurrency,
  formatDate,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '../../utils';
import { invoiceService } from '../../services/invoices';
import { InvoicePrintDialog } from './InvoicePrintDialog';
import { useTranslation } from '../../hooks/useTranslation';

/* ═══════════════════════════════════════════════════════════════════════════
 * Chi tiết hoá đơn.
 *
 * Trang này có HAI LỚP tách bạch, và sự tách bạch đó là điểm chính:
 *
 *   THANH THAO TÁC  — của ứng dụng. Quay lại, Sửa, In, Xuất PDF.
 *                     Mang class `print:hidden`, không bao giờ lên giấy.
 *   VÙNG CHỨNG TỪ   — tờ hoá đơn. Mang class `.print-document`.
 *                     Bấm Ctrl+P là in ra đúng vùng này, không có gì khác.
 *
 * Bản cũ không in được: quy tắc @media print trong index.css chỉ hiện lại
 * #invoice-print-content, mà id đó chỉ tồn tại bên trong hộp thoại in. Bấm
 * Ctrl+P ở trang chi tiết ra một tờ giấy TRẮNG.
 *
 * Vùng chứng từ cũng bỏ hết nền gradient, thẻ bo góc 16px và bóng đổ. Hoá đơn
 * là chứng từ: nó cần kẻ dòng rõ và số thẳng cột, không cần trang trí.
 * ═══════════════════════════════════════════════════════════════════════════ */

export function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    open: boolean;
    variant: AlertType;
    title: string;
    description: string;
  }>({ open: false, variant: 'info', title: '', description: '' });

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getInvoice(id!).then((res) => res.data),
    enabled: !!id,
  });

  const handleExport = async () => {
    if (!invoice) return;
    try {
      await invoiceService.exportInvoicePdf(String(invoice.id));
      setAlertConfig({
        open: true,
        variant: 'success',
        title: t('common.success', 'Success'),
        description: t('invoices.exportStarted', 'The PDF is downloading — check your downloads folder.'),
      });
    } catch (err) {
      setAlertConfig({
        open: true,
        variant: 'destructive',
        title: t('invoices.exportFailed', 'Export failed'),
        description:
          err instanceof Error ? err.message : t('invoices.exportError', 'Failed to export invoice'),
      });
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

  if (error || !invoice) {
    return (
      <EmptyState
        title={t('invoices.notFoundTitle', 'Invoice not found')}
        description={t('invoices.notFoundBody', 'This invoice no longer exists, or the link is wrong.')}
        action={
          <Button onClick={() => navigate('/invoices')}>
            {t('invoices.backToList', 'Back to invoices')}
          </Button>
        }
      />
    );
  }

  const status = String(invoice.statusName ?? invoice.status);
  const customer = invoice.customer;
  const room = invoice.room;
  const items = invoice.invoiceItems ?? [];
  const payments = invoice.payments ?? [];

  const itemsTotal = items.reduce(
    (sum, item) => sum + (item.lineTotalWithTax || item.lineTotal || 0),
    0
  );
  /*
   * Tiền thuê lấy từ CHÍNH HOÁ ĐƠN, không lấy từ phòng.
   *
   * invoice.monthlyRent là giá ghi trong hợp đồng lúc lập hoá đơn; room.monthlyRent
   * là giá niêm yết hiện tại của phòng. Hai số này khác nhau ngay khi có ai đó
   * sửa giá phòng, hoặc khi hợp đồng thoả thuận giá riêng. Bản cũ ưu tiên giá
   * phòng, nên bảng cộng tiền in ra không khớp với dòng tổng ngay bên dưới nó —
   * một tờ chứng từ mà các dòng không cộng ra tổng thì không dùng được.
   */
  const baseAmount = items.length > 0 ? itemsTotal : invoice.monthlyRent ?? room?.monthlyRent ?? 0;
  const total = invoice.totalAmount ?? invoice.amount ?? 0;

  /** Một dòng trong bảng cộng tiền. Nhãn trái, số phải, số dùng font tabular. */
  const totalRow = (label: string, value: number, options?: { negative?: boolean; strong?: boolean }) => (
    <div
      className={`flex items-baseline justify-between gap-6 py-1.5 ${
        options?.strong ? 'border-t border-ink pt-2 text-base font-semibold' : 'text-sm'
      }`}
    >
      <dt className={options?.strong ? 'text-ink' : 'text-ink-muted'}>{label}</dt>
      <dd className="numeric text-ink">
        {options?.negative ? '−' : ''}
        {formatCurrency(value)}
      </dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* ══ THANH THAO TÁC — của ứng dụng, không lên giấy ═══════════════════ */}
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => navigate('/invoices')}
            leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            {t('invoices.backToList', 'Back to invoices')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/invoices/${id}/edit`)}
            leadingIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          >
            {t('common.edit', 'Edit')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPrintDialogOpen(true)}
            leadingIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
          >
            {t('invoices.print', 'Print Invoice')}
          </Button>
          <Button onClick={handleExport} leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}>
            {t('invoices.exportPdf', 'Export PDF')}
          </Button>
        </div>
      </div>

      {/* ══ VÙNG CHỨNG TỪ — đây là thứ được in ═════════════════════════════ */}
      <article className="print-document rounded-lg border border-line bg-surface p-5 sm:p-8">
        {/* ── Đầu tờ hoá đơn ─────────────────────────────────────────────── */}
        <header className="no-break flex flex-wrap items-start justify-between gap-4 border-b border-ink pb-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{t('invoices.invoice', 'Invoice')}</h1>
            <p className="numeric mt-0.5 text-lg text-ink">{invoice.invoiceNumber || '—'}</p>
          </div>
          <div className="text-right">
            {/* Bọc bằng span thật: Badge không truyền tiếp thuộc tính lạ, nên
                data-print-keep-color đặt thẳng lên nó sẽ không tới được DOM. */}
            <span data-print-keep-color className="inline-flex">
              <Badge status={status}>{enumLabel(t, INVOICE_STATUS_LABELS, status)}</Badge>
            </span>
            <dl className="mt-2 flex flex-col gap-0.5 text-sm">
              <div className="flex justify-end gap-2">
                <dt className="text-ink-muted">{t('invoices.issueDate', 'Issue Date')}</dt>
                <dd className="numeric text-ink">
                  {formatDate(invoice.issueDate || invoice.issuedDate || invoice.createdAt)}
                </dd>
              </div>
              <div className="flex justify-end gap-2">
                <dt className="text-ink-muted">{t('invoices.dueDate', 'Due Date')}</dt>
                <dd className="numeric font-medium text-ink">{formatDate(invoice.dueDate)}</dd>
              </div>
              {invoice.billingPeriod && (
                <div className="flex justify-end gap-2">
                  <dt className="text-ink-muted">{t('invoices.billingPeriod', 'Billing Period')}</dt>
                  <dd className="numeric text-ink">{formatDate(invoice.billingPeriod)}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        {/* ── Bên thuê / phòng ───────────────────────────────────────────── */}
        <div className="no-break grid gap-6 border-b border-line py-4 sm:grid-cols-2">
          <section>
            <h2 className="text-xs font-semibold text-ink-muted">{t('invoices.billTo', 'Bill To')}</h2>
            {customer ? (
              <div className="mt-1.5">
                <p className="text-base font-semibold text-ink">
                  {customer.fullName || `${customer.firstName} ${customer.lastName}`}
                </p>
                {customer.phoneNumber && (
                  <p className="numeric text-sm text-ink-muted">{customer.phoneNumber}</p>
                )}
                {customer.email && <p className="text-sm text-ink-muted">{customer.email}</p>}
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-ink-muted">
                {t('invoices.noCustomerInfo', 'No customer info')}
              </p>
            )}
          </section>

          <section className="sm:text-right">
            <h2 className="text-xs font-semibold text-ink-muted">{t('invoices.roomInfo', 'Room Information')}</h2>
            {room ? (
              <div className="mt-1.5">
                <p className="numeric text-base font-semibold text-ink">
                  {t('rooms.roomLabel', 'Room {number}', { number: room.roomNumber })}
                </p>
                {room.monthlyRent !== undefined && (
                  <p className="text-sm text-ink-muted">
                    {t('rooms.perMonth', '{amount}/month', {
                      amount: formatCurrency(room.monthlyRent),
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-ink-muted">{t('invoices.noRoomInfo', 'No room info')}</p>
            )}
          </section>
        </div>

        {/* ── Các dòng hàng ──────────────────────────────────────────────── */}
        {items.length > 0 && (
          <div className="overflow-x-auto py-4">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('invoices.lineItems', 'Invoice Line Items')}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="h-10 pr-3 text-left text-xs font-semibold text-ink-muted">
                    {t('items.itemName', 'Item Name')}
                  </th>
                  <th scope="col" className="h-10 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('invoices.quantityShort', 'Qty')}
                  </th>
                  <th scope="col" className="h-10 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('items.unitPrice', 'Unit Price')}
                  </th>
                  <th scope="col" className="h-10 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('invoices.discount', 'Discount')}
                  </th>
                  <th scope="col" className="h-10 px-3 text-right text-xs font-semibold text-ink-muted">
                    {t('invoices.tax', 'Tax')}
                  </th>
                  <th scope="col" className="h-10 pl-3 text-right text-xs font-semibold text-ink-muted">
                    {t('invoices.lineTotal', 'Line Total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="block font-medium text-ink">{item.itemName}</span>
                      {item.description && (
                        <span className="block text-xs text-ink-muted">{item.description}</span>
                      )}
                    </td>
                    <td className="numeric px-3 py-2.5 text-right whitespace-nowrap">
                      {item.quantity} {item.unitOfMeasure}
                    </td>
                    <td className="numeric px-3 py-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="numeric px-3 py-2.5 text-right">
                      {item.discountAmount > 0 ? `−${formatCurrency(item.discountAmount)}` : '—'}
                    </td>
                    <td className="numeric px-3 py-2.5 text-right">
                      {item.taxAmount > 0 ? formatCurrency(item.taxAmount) : '—'}
                    </td>
                    <td className="numeric py-2.5 pl-3 text-right font-semibold text-ink">
                      {formatCurrency(item.lineTotalWithTax || item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Cộng tiền ──────────────────────────────────────────────────── */}
        <div className="no-break flex justify-end border-t border-line pt-4">
          <dl className="w-full max-w-sm">
            {totalRow(
              items.length > 0
                ? t('invoices.itemsTotal', 'Line items total')
                : t('rooms.price', 'Monthly Rent'),
              baseAmount
            )}
            {invoice.additionalCharges !== undefined && invoice.additionalCharges > 0 && (
              <>
                {totalRow(t('invoices.additionalCharges', 'Additional Charges'), invoice.additionalCharges)}
                {invoice.additionalChargesDescription && (
                  <p className="pb-1.5 text-xs text-ink-muted">{invoice.additionalChargesDescription}</p>
                )}
              </>
            )}
            {invoice.discount !== undefined && invoice.discount > 0 &&
              totalRow(t('invoices.discount', 'Discount'), invoice.discount, { negative: true })}

            {totalRow(t('invoices.grandTotal', 'Invoice grand total'), total, { strong: true })}

            {invoice.paidAmount !== undefined && invoice.paidAmount > 0 &&
              totalRow(t('invoices.paidAmount', 'Paid Amount'), invoice.paidAmount, { negative: true })}

            {invoice.remainingBalance !== undefined && invoice.remainingBalance > 0 && (
              <div className="mt-2 flex items-baseline justify-between gap-6 border-t border-line pt-2">
                <dt className="text-sm font-semibold text-ink">
                  {t('payments.remaining', 'Remaining Balance')}
                </dt>
                <dd className="numeric text-xl font-semibold text-status-overdue" data-print-keep-color>
                  {formatCurrency(invoice.remainingBalance)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* ── Đã thu ─────────────────────────────────────────────────────── */}
        {payments.length > 0 && (
          <section className="no-break mt-6 border-t border-line pt-4">
            <h2 className="text-sm font-semibold text-ink">
              {t('invoices.paymentHistory', 'Payment History')}
            </h2>
            <ul className="mt-2 flex flex-col divide-y divide-line">
              {payments.map((payment, index) => (
                <li
                  key={payment.id || index}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                >
                  <span className="text-sm text-ink">
                    <span className="numeric">{formatDate(payment.paymentDate)}</span>
                    <span className="ml-2 text-ink-muted">
                      {enumLabel(t, PAYMENT_METHOD_LABELS, payment.methodName ?? payment.method)}
                      {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ''}
                    </span>
                  </span>
                  <span className="numeric text-sm font-semibold text-ink">
                    {formatCurrency(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Ghi chú ────────────────────────────────────────────────────── */}
        {invoice.notes && (
          <section className="no-break mt-6 border-t border-line pt-4">
            <h2 className="text-sm font-semibold text-ink">{t('common.notes', 'Notes')}</h2>
            <p className="mt-1 text-sm whitespace-pre-line text-ink-muted">{invoice.notes}</p>
          </section>
        )}
      </article>

      <InvoicePrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        invoice={invoice}
        onExportPdf={handleExport}
      />

      <AlertDialog
        open={alertConfig.open}
        onOpenChange={(open) => setAlertConfig((previous) => ({ ...previous, open }))}
        variant={alertConfig.variant}
        title={alertConfig.title}
        description={alertConfig.description}
        confirmText={t('common.confirm', 'OK')}
        onConfirm={() => setAlertConfig((previous) => ({ ...previous, open: false }))}
      />
    </div>
  );
}
