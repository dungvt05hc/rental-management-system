import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  Input,
  PageHeader,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui';
import type { DataTableColumn } from '../ui';
import { paymentService } from '../../services';
import { enumLabel, formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../../utils';
import type { Payment } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks';

/* ═══════════════════════════════════════════════════════════════════════════
 * Danh sách khoản thu.
 *
 * Đây là SỔ CÁI, không phải danh sách việc phải làm: mọi dòng ở đây đều là
 * việc đã xong. Nên nó cố tình trầm hơn ba màn hình kia — không có màu trạng
 * thái chạy dọc mép thẻ, không có gì đòi chú ý.
 *
 * Bản cũ có cột "Trạng thái" mà MỌI dòng đều ghi "Hoàn tất" bằng chip xanh —
 * một cột không mang tin, lại còn tô cùng màu với "Đã thanh toán" ở bảng hoá
 * đơn nên nó ăn mất sức nặng của màu đó. Đã bỏ.
 *
 * Bỏ luôn cột "Hoá đơn" riêng: mã hoá đơn và hạn của nó đã nằm ngay dưới tên
 * khách ở cột đầu, in ra lần nữa ở cột hai là chép lại chính nó.
 *
 * LỖI CÓ THẬT ĐÃ SỬA: bản cũ lọc và phân trang TRÊN MỘT TRANG DỮ LIỆU. Nó xin
 * server trang 1 gồm 10 dòng, rồi lọc trong 10 dòng đó, rồi lại cắt tiếp thành
 * các trang 10 dòng — nên ô tìm kiếm chỉ thấy được 10 khoản thu mới nhất, và
 * bấm sang trang 2 luôn ra trang trắng. Nay tìm kiếm và phân trang đều do
 * server làm, giống ba màn hình kia.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ALL = 'all';
const PAGE_SIZE = 10;

/* Khoá ở đây là tên enum đã bỏ hoa thường và dấu ngăn, khớp với normalizeMethod
   bên dưới và với bảng nhãn ở utils/enumLabels.ts. */
const METHOD_OPTIONS = [
  { value: 'cash', key: 'payments.cash', fallback: 'Cash' },
  { value: 'banktransfer', key: 'payments.bankTransfer', fallback: 'Bank Transfer' },
  { value: 'creditcard', key: 'payments.creditCard', fallback: 'Credit Card' },
  { value: 'debitcard', key: 'payments.debitCard', fallback: 'Debit Card' },
  { value: 'digitalwallet', key: 'payments.digitalWallet', fallback: 'Digital Wallet' },
  { value: 'check', key: 'payments.check', fallback: 'Check' },
  { value: 'moneyorder', key: 'payments.moneyOrder', fallback: 'Money Order' },
  { value: 'other', key: 'payments.other', fallback: 'Other' },
] as const;

function normalizeMethod(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[\s_-]/g, '');
}

export function PaymentsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    paymentId: string | null;
    paymentReference: string;
  }>({ open: false, paymentId: null, paymentReference: '' });

  const searchQuery = useDebounce(searchInput, 300);
  const isFiltered = searchQuery.trim() !== '' || methodFilter !== ALL;

  const loadPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await paymentService.getPayments({
        search: searchQuery || undefined,
        page,
        pageSize: PAGE_SIZE,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load payments');
      }

      setPayments(response.data.items || []);
      setPagination({
        totalItems: response.data.totalItems || 0,
        totalPages: response.data.totalPages || 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, methodFilter]);

  /*
   * Lọc theo hình thức thanh toán vẫn làm ở client: PaymentSearchRequest của
   * backend chưa có tham số này, và thêm vào là đổi API — ngoài phạm vi lần
   * này. Nên số dòng hiện ra có thể ít hơn kích thước trang, và điều đó được
   * nói thẳng ra bằng dòng chữ dưới bảng thay vì giả vờ như không có.
   */
  const visiblePayments = useMemo(
    () =>
      methodFilter === ALL
        ? payments
        : payments.filter((payment) => normalizeMethod(payment.methodName) === methodFilter),
    [payments, methodFilter]
  );

  const confirmDeletePayment = async () => {
    if (!confirmDialog.paymentId) return;

    try {
      const response = await paymentService.deletePayment(confirmDialog.paymentId);
      if (response.success) {
        showSuccess(
          t('common.success', 'Success'),
          t('payments.deleteSuccess', 'Payment deleted successfully')
        );
        await loadPayments();
      } else {
        showError(
          t('common.error', 'Error'),
          response.message || t('payments.deleteError', 'Failed to delete payment')
        );
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    } finally {
      setConfirmDialog({ open: false, paymentId: null, paymentReference: '' });
    }
  };

  const columns: DataTableColumn<Payment>[] = useMemo(
    () => [
      {
        key: 'customer',
        header: t('payments.customer', 'Customer'),
        cell: (payment) => (
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink">
              {payment.invoice?.customerName || '—'}
            </span>
            <span className="numeric block truncate text-xs text-ink-muted">
              {payment.invoice?.invoiceNumber || '—'}
              {payment.invoice?.roomNumber
                ? ` · ${t('rooms.roomLabel', 'Room {number}', {
                    number: payment.invoice.roomNumber,
                  })}`
                : ''}
            </span>
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'amount',
        header: t('invoices.amount', 'Amount'),
        cell: (payment) => (
          <span className="font-semibold text-ink">{formatCurrency(payment.amount)}</span>
        ),
        numeric: true,
        mobile: 'primary',
      },
      {
        key: 'method',
        header: t('payments.method', 'Method'),
        // Hình thức thanh toán là PHÂN LOẠI, không phải trạng thái. Chip trung
        // tính hết — trước đây mỗi loại một màu, bốn màu không mang thông tin
        // gì mà tranh chú ý với cột trạng thái thật ở bảng bên cạnh.
        cell: (payment) => (
          <Badge status={normalizeMethod(payment.methodName)} size="sm">
            {enumLabel(t, PAYMENT_METHOD_LABELS, payment.methodName)}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-40',
      },
      {
        key: 'date',
        header: t('payments.paymentDate', 'Payment Date'),
        cell: (payment) => formatDate(payment.paymentDate),
        numeric: true,
        width: 'w-32',
      },
      {
        key: 'reference',
        header: t('payments.reference', 'Reference'),
        cell: (payment) =>
          payment.referenceNumber ? (
            <span className="numeric">{payment.referenceNumber}</span>
          ) : (
            <span className="text-ink-muted">—</span>
          ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-24',
        mobile: 'hidden',
        cell: (payment) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/payments/${payment.id}/edit`)}
              aria-label={t('payments.editPayment', 'Edit Payment')}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive-tint"
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  paymentId: String(payment.id),
                  paymentReference: payment.referenceNumber || '',
                })
              }
              aria-label={t('payments.deletePayment', 'Delete Payment')}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [t, navigate]
  );

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('payments.pageTitle', 'Payments Management')}
        count={
          pagination.totalItems > 0
            ? t('payments.totalCount', '{count} total', { count: pagination.totalItems })
            : undefined
        }
        actions={
          <Button
            onClick={() => navigate('/payments/new')}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            {t('payments.recordPayment', 'Record Payment')}
          </Button>
        }
      />

      <FilterBar>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t(
            'payments.searchPlaceholder',
            'Search by customer name, email, method, or reference...'
          )}
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('payments.searchPlaceholder', 'Search payments')}
          containerClassName="sm:flex-1"
        />
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="sm:w-52" aria-label={t('payments.method', 'Method')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('payments.allMethods', 'All Methods')}</SelectItem>
            {METHOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.key, option.fallback)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {error ? (
        <Alert variant="error" title={t('payments.loadError', 'Could not load payments')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('common.unexpectedError', 'An error occurred')}</span>
            <Button size="sm" variant="outline" onClick={loadPayments}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      ) : !isLoading && visiblePayments.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t('payments.noMatchTitle', 'No payment matches this filter')}
            description={t(
              'payments.noPaymentsMatch',
              'No payments match your current search criteria.'
            )}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput('');
                  setMethodFilter(ALL);
                }}
              >
                {t('common.clearFilters', 'Clear filters')}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Wallet className="h-8 w-8" />}
            title={t('payments.noPaymentsTitle', 'No payments recorded yet')}
            description={t(
              'payments.noPaymentsBody',
              'Every amount you collect gets recorded here and lowers the balance on its invoice.'
            )}
            action={
              <Button
                onClick={() => navigate('/payments/new')}
                leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                {t('payments.recordFirstPayment', 'Record First Payment')}
              </Button>
            }
          />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={visiblePayments}
            rowKey={(payment) => payment.id}
            caption={t('payments.paymentTransactions', 'Payment Transactions')}
            isLoading={isLoading}
            skeletonRows={PAGE_SIZE}
            mobileActions={(payment) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/payments/${payment.id}/edit`)}
                leadingIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                {t('common.edit', 'Edit')}
              </Button>
            )}
          />

          {/* Nói thẳng khi bộ lọc hình thức đang giấu bớt dòng của trang này. */}
          {methodFilter !== ALL && visiblePayments.length < payments.length && (
            <p className="text-xs text-ink-muted">
              {t('payments.methodFilterNote', 'Showing {shown} of {onPage} payments on this page.', {
                shown: visiblePayments.length,
                onPage: payments.length,
              })}
            </p>
          )}

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, paymentId: null, paymentReference: '' })}
        title={t('payments.deleteConfirmTitle', 'Delete Payment')}
        description={t(
          'payments.deleteConfirmMessage',
          'Deleting payment {reference} changes the outstanding balance of its invoice. This cannot be undone.',
          { reference: confirmDialog.paymentReference }
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeletePayment}
        variant="destructive"
      />
    </div>
  );
}
