import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, MoreHorizontal, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Badge,
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { invoiceService } from '../../services';
import { enumLabel, formatCurrency, formatDate, INVOICE_STATUS_LABELS } from '../../utils';
import type { Invoice, InvoiceSearchRequest } from '../../types';
import { InvoiceStatus } from '../../types';
import { InvoicePrintDialog } from './InvoicePrintDialog';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks';

/* ═══════════════════════════════════════════════════════════════════════════
 * Danh sách hoá đơn.
 *
 * Đây là bảng người dùng dò lâu nhất trong cả app. Nó được thiết kế quanh một
 * câu hỏi: DÒNG NÀO CÒN NỢ TIỀN?
 *
 * Vì vậy:
 *   - Cột "Còn nợ" mới là cột chính, không phải "Tổng tiền". Tổng tiền của một
 *     hoá đơn đã thu xong không còn là việc của ai nữa.
 *   - Trên mobile, "Còn nợ" là con số cỡ 24px trên thẻ (mobile: 'primary'),
 *     còn tổng tiền tụt xuống dòng phụ.
 *   - Dải màu trạng thái chạy dọc mép trái mỗi thẻ mobile: lướt ngón cái là
 *     thấy ngay dòng đỏ, không cần dừng lại đọc chữ trong chip.
 *
 * Năm nút hành động trên MỖI dòng ở bản cũ (xem, PDF, in, sửa, xoá) chiếm gần
 * một phần tư bề ngang bảng và lặp lại y hệt nhau ở mọi dòng. Nay còn một nút
 * menu; cả dòng bấm được để mở chi tiết.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ALL = 'all';
const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'unpaid', status: InvoiceStatus.Unpaid, key: 'invoices.unpaid', fallback: 'Pending' },
  {
    value: 'partiallypaid',
    status: InvoiceStatus.PartiallyPaid,
    key: 'invoices.partiallyPaid',
    fallback: 'Partially Paid',
  },
  { value: 'overdue', status: InvoiceStatus.Overdue, key: 'invoices.overdue', fallback: 'Overdue' },
  { value: 'paid', status: InvoiceStatus.Paid, key: 'invoices.paid', fallback: 'Paid' },
  {
    value: 'cancelled',
    status: InvoiceStatus.Cancelled,
    key: 'invoices.cancelled',
    fallback: 'Cancelled',
  },
] as const;

/** Backend không phải endpoint nào cũng trả statusName, nên luôn ép về chuỗi. */
function statusOf(invoice: Invoice): string {
  return String(invoice.statusName ?? invoice.status);
}

function isOverdue(invoice: Invoice): boolean {
  if (invoice.isOverdue) return true;
  const status = statusOf(invoice).toLowerCase();
  if (status === 'paid' || status === 'cancelled') return false;
  return new Date(invoice.dueDate) < new Date();
}

/**
 * Trạng thái dùng để TÔ MÀU.
 *
 * Khác với trạng thái lưu trong DB ở đúng một chỗ: hoá đơn quá hạn mà backend
 * vẫn ghi "Unpaid" thì ở đây tô thành "overdue". Người dùng không quan tâm cột
 * Status trong bảng Invoices ghi gì — họ quan tâm hôm nay có phải đi đòi không.
 */
function displayStatusOf(invoice: Invoice): string {
  return isOverdue(invoice) ? 'overdue' : statusOf(invoice);
}

function remainingOf(invoice: Invoice): number {
  return invoice.remainingBalance ?? invoice.totalAmount ?? invoice.amount ?? 0;
}

export function InvoicesPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 });
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    invoiceId: string | null;
    invoiceNumber: string;
  }>({ open: false, invoiceId: null, invoiceNumber: '' });

  const searchQuery = useDebounce(searchInput, 300);
  const isFiltered = searchQuery.trim() !== '' || statusFilter !== ALL;

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams: InvoiceSearchRequest = {
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        status: STATUS_OPTIONS.find((option) => option.value === statusFilter)?.status,
      };

      const response = await invoiceService.getInvoices(searchParams);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load invoices');
      }

      setInvoices(response.data.items || []);
      setPagination({
        totalItems: response.data.totalItems || 0,
        totalPages: response.data.totalPages || 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const confirmDeleteInvoice = async () => {
    if (!confirmDialog.invoiceId) return;

    try {
      const response = await invoiceService.deleteInvoice(confirmDialog.invoiceId);
      if (response.success) {
        showSuccess(
          t('common.success', 'Success'),
          t('invoices.deleteSuccess', 'Invoice deleted successfully')
        );
        await loadInvoices();
      } else {
        showError(
          t('common.error', 'Error'),
          response.message || t('invoices.deleteError', 'Failed to delete invoice')
        );
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  const handleExportPdf = useCallback(
    async (invoice: Invoice) => {
      try {
        await invoiceService.exportInvoicePdf(String(invoice.id));
        showSuccess(
          t('common.success', 'Success'),
          t('invoices.exportStarted', 'The PDF is downloading — check your downloads folder.')
        );
      } catch (err) {
        showError(
          t('common.error', 'Error'),
          err instanceof Error ? err.message : t('invoices.exportError', 'Failed to export invoice')
        );
      }
    },
    [t, showSuccess, showError]
  );

  const columns: DataTableColumn<Invoice>[] = useMemo(
    () => [
      {
        key: 'customer',
        header: t('invoices.customerRoom', 'Customer & Room'),
        cell: (invoice) => (
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink">
              {invoice.customer
                ? invoice.customer.fullName ||
                  `${invoice.customer.firstName} ${invoice.customer.lastName}`
                : t('invoices.noCustomerInfo', 'No customer info')}
            </span>
            <span className="numeric block truncate text-xs text-ink-muted">
              {invoice.room?.roomNumber
                ? t('rooms.roomLabel', 'Room {number}', { number: invoice.room.roomNumber })
                : '—'}{' '}
              · {invoice.invoiceNumber}
            </span>
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'status',
        header: t('rooms.status', 'Status'),
        cell: (invoice) => (
          <Badge status={displayStatusOf(invoice)} size="sm">
            {enumLabel(t, INVOICE_STATUS_LABELS, displayStatusOf(invoice))}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-36',
      },
      {
        key: 'remaining',
        header: t('invoices.remaining', 'Remaining'),
        // Cột chính. Đã thu xong thì hiện dấu gạch chứ không hiện "0 ₫": số 0
        // vẫn là một con số, mắt vẫn phải dừng lại đọc nó.
        cell: (invoice) => {
          const remaining = remainingOf(invoice);
          return remaining > 0 ? (
            <span className="font-semibold text-ink">{formatCurrency(remaining)}</span>
          ) : (
            <span className="text-ink-muted">—</span>
          );
        },
        numeric: true,
        mobile: 'primary',
      },
      {
        key: 'total',
        header: t('invoices.totalAmount', 'Total Amount'),
        cell: (invoice) => formatCurrency(invoice.totalAmount ?? invoice.amount),
        numeric: true,
      },
      {
        key: 'dueDate',
        header: t('invoices.dueDate', 'Due Date'),
        cell: (invoice) => (
          <span className={isOverdue(invoice) ? 'font-medium text-status-overdue' : undefined}>
            {formatDate(invoice.dueDate)}
          </span>
        ),
        numeric: true,
        width: 'w-32',
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-14',
        mobile: 'hidden',
        cell: (invoice) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('invoices.actionsFor', 'Actions for invoice {number}', {
                    number: invoice.invoiceNumber,
                  })}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => navigate(`/invoices/${invoice.id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('invoices.editInvoice', 'Edit Invoice')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportPdf(invoice)}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('invoices.exportPdf', 'Export PDF')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setPrintInvoice(invoice);
                    setIsPrintDialogOpen(true);
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('invoices.print', 'Print Invoice')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() =>
                    setConfirmDialog({
                      open: true,
                      invoiceId: String(invoice.id),
                      invoiceNumber: invoice.invoiceNumber || '',
                    })
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('invoices.deleteInvoice', 'Delete Invoice')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [t, navigate, handleExportPdf]
  );

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('invoices.pageTitle', 'Invoices Management')}
        count={
          pagination.totalItems > 0
            ? t('invoices.totalCount', '{count} total', { count: pagination.totalItems })
            : undefined
        }
        actions={
          <Button
            onClick={() => navigate('/invoices/new')}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            {t('invoices.createInvoice', 'Create Invoice')}
          </Button>
        }
      />

      <FilterBar>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('invoices.searchPlaceholder', 'Search by invoice number, customer name, or room...')}
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('invoices.searchPlaceholder', 'Search invoices')}
          containerClassName="sm:flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-56" aria-label={t('rooms.status', 'Status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('common.filter', 'All Status')}</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.key, option.fallback)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {error ? (
        <Alert variant="error" title={t('invoices.loadError', 'Could not load invoices')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('common.unexpectedError', 'An error occurred')}</span>
            <Button size="sm" variant="outline" onClick={loadInvoices}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      ) : !isLoading && invoices.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t('invoices.noMatchTitle', 'No invoice matches this filter')}
            description={t(
              'invoices.adjustSearchFilter',
              'Try adjusting your search or filter criteria.'
            )}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput('');
                  setStatusFilter(ALL);
                }}
              >
                {t('common.clearFilters', 'Clear filters')}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title={t('invoices.noInvoicesTitle', 'No invoices yet')}
            description={t(
              'invoices.getStartedMessage',
              'Get started by creating your first invoice for your customers.'
            )}
            action={
              <Button
                onClick={() => navigate('/invoices/new')}
                leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                {t('invoices.createFirstInvoice', 'Create First Invoice')}
              </Button>
            }
          />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={invoices}
            rowKey={(invoice) => invoice.id}
            caption={t('invoices.invoiceList', 'Invoice List')}
            isLoading={isLoading}
            skeletonRows={PAGE_SIZE}
            rowStatus={displayStatusOf}
            onRowClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
            mobileActions={(invoice) => (
              <>
                <Button size="sm" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                  {t('invoices.viewDetails', 'View Details')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                >
                  {t('common.edit', 'Edit')}
                </Button>
              </>
            )}
          />

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <InvoicePrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        invoice={printInvoice}
        onExportPdf={() => printInvoice && handleExportPdf(printInvoice)}
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, invoiceId: null, invoiceNumber: '' })}
        title={t('invoices.deleteConfirmTitle', 'Delete Invoice')}
        description={t(
          'invoices.deleteConfirmMessage',
          'Deleting invoice {number} also removes the payments recorded against it. This cannot be undone.',
          { number: confirmDialog.invoiceNumber }
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteInvoice}
        variant="destructive"
      />
    </div>
  );
}
