import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
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
import { CustomerDialog } from './CustomerDialog';
import { customerService } from '../../services';
import { formatDate } from '../../utils';
import type { Customer, CustomerSearchRequest } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks';

/* ═══════════════════════════════════════════════════════════════════════════
 * Danh sách khách thuê.
 *
 * Người ta mở trang này để TÌM MỘT NGƯỜI rồi gọi điện, xem hợp đồng, hoặc sửa
 * thông tin. Nên cột đầu là tên + số điện thoại (thứ dùng để gọi), cột hai là
 * phòng (cách người quản lý thật sự định danh khách), rồi mới tới trạng thái.
 *
 * Bỏ avatar tròn xám. Nó là cùng một hình tròn xám giống hệt nhau ở mọi dòng —
 * không mang thông tin, chỉ đẩy tên ra xa mép cột 56px.
 *
 * Bỏ cột email khỏi bảng desktop lẫn thẻ mobile không được: email là cách liên
 * lạc thứ hai. Nhưng nó xuống dòng phụ dưới tên chứ không chiếm riêng một cột
 * — hai dòng liên lạc xếp dọc trong một cột đọc nhanh hơn hai cột rời.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ALL = 'all';
const PAGE_SIZE = 10;

/** Bộ lọc trạng thái ánh xạ sang cờ isActive của API. */
const STATUS_OPTIONS = [
  { value: 'active', isActive: true, key: 'customers.active', fallback: 'Active' },
  { value: 'inactive', isActive: false, key: 'customers.inactive', fallback: 'Inactive' },
] as const;

function fullNameOf(customer: Customer): string {
  return customer.fullName || `${customer.firstName} ${customer.lastName}`.trim();
}

export function CustomersPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    customerId: string | null;
    customerName: string;
  }>({ open: false, customerId: null, customerName: '' });

  const searchQuery = useDebounce(searchInput, 300);
  const isFiltered = searchQuery.trim() !== '' || statusFilter !== ALL;

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams: CustomerSearchRequest = {
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        isActive: STATUS_OPTIONS.find((option) => option.value === statusFilter)?.isActive,
      };

      const response = await customerService.getCustomers(searchParams);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load customers');
      }

      setCustomers(response.data.items || []);
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
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!confirmDialog.customerId) return;

    try {
      const response = await customerService.deleteCustomer(confirmDialog.customerId);
      if (response.success) {
        showSuccess(
          t('common.success', 'Success'),
          t('customers.deleteSuccess', 'Customer deleted successfully')
        );
        await loadCustomers();
      } else {
        showError(
          t('common.error', 'Error'),
          response.message || t('customers.deleteError', 'Failed to delete customer')
        );
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  const columns: DataTableColumn<Customer>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('customers.name', 'Name'),
        cell: (customer) => (
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink">{fullNameOf(customer)}</span>
            <span className="numeric block truncate text-xs text-ink-muted">
              {customer.phoneNumber}
            </span>
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'room',
        header: t('customers.room', 'Room'),
        cell: (customer) =>
          customer.room ? (
            <span className="numeric font-medium text-ink">
              {t('rooms.roomLabel', 'Room {number}', { number: customer.room.roomNumber })}
            </span>
          ) : (
            <span className="text-ink-muted">{t('customers.noRoomAssigned', 'No room assigned')}</span>
          ),
        width: 'w-36',
      },
      {
        key: 'status',
        header: t('rooms.status', 'Status'),
        cell: (customer) => (
          <Badge status={customer.isActive ? 'active' : 'inactive'} size="sm">
            {customer.isActive
              ? t('customers.active', 'Active')
              : t('customers.inactive', 'Inactive')}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-32',
      },
      {
        key: 'email',
        header: t('customers.email', 'Email'),
        cell: (customer) => <span className="block truncate">{customer.email || '—'}</span>,
      },
      {
        key: 'contract',
        header: t('customers.contractPeriod', 'Contract Period'),
        numeric: true,
        cell: (customer) => {
          const start = customer.contractStartDate || customer.checkInDate;
          const end = customer.contractEndDate || customer.checkOutDate;
          if (!start) return <span className="text-ink-muted">{t('customers.notSet', 'Not set')}</span>;
          // Gạch ngang en-dash chứ không phải mũi tên: đây là một KHOẢNG thời
          // gian, không phải một chuyển động từ ngày này sang ngày kia.
          return end ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
        },
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-32',
        mobile: 'hidden',
        cell: (customer) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/customers/${customer.id}/contracts`)}
              aria-label={t('customers.contractsOf', 'Contracts of {name}', {
                name: fullNameOf(customer),
              })}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditCustomer(customer)}
              aria-label={t('customers.editNamed', 'Edit {name}', { name: fullNameOf(customer) })}
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
                  customerId: String(customer.id),
                  customerName: fullNameOf(customer),
                })
              }
              aria-label={t('customers.deleteNamed', 'Delete {name}', { name: fullNameOf(customer) })}
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
        title={t('customers.pageTitle', 'Customers Management')}
        count={
          pagination.totalItems > 0
            ? t('customers.totalCount', '{count} customers', { count: pagination.totalItems })
            : undefined
        }
        actions={
          <Button
            onClick={handleCreateCustomer}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            {t('customers.addCustomer', 'Add Customer')}
          </Button>
        }
      />

      <FilterBar>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('customers.searchPlaceholder', 'Search customers...')}
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('customers.searchPlaceholder', 'Search customers...')}
          containerClassName="sm:flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-52" aria-label={t('rooms.status', 'Status')}>
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
        <Alert variant="error" title={t('customers.loadError', 'Could not load customers')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('common.unexpectedError', 'An error occurred')}</span>
            <Button size="sm" variant="outline" onClick={loadCustomers}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      ) : !isLoading && customers.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t('customers.noMatchTitle', 'No customer matches this filter')}
            description={t(
              'customers.noMatchBody',
              'Search runs on name, phone and email. Try a shorter term, or clear the status filter.'
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
            icon={<Users className="h-8 w-8" />}
            title={t('customers.noCustomersTitle', 'No customers yet')}
            description={t(
              'customers.noCustomersBody',
              'Add a customer, then assign them a room — that contract is what invoices are issued against.'
            )}
            action={
              <Button
                onClick={handleCreateCustomer}
                leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                {t('customers.addFirstCustomer', 'Add Your First Customer')}
              </Button>
            }
          />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={customers}
            rowKey={(customer) => customer.id}
            caption={t('customers.tableCaption', 'List of customers')}
            isLoading={isLoading}
            skeletonRows={PAGE_SIZE}
            rowStatus={(customer) => (customer.isActive ? 'active' : 'inactive')}
            mobileActions={(customer) => (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/customers/${customer.id}/contracts`)}
                  leadingIcon={<FileText className="h-4 w-4" aria-hidden="true" />}
                >
                  {t('contracts.title', 'Rental Contracts')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEditCustomer(customer)}>
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

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSuccess={loadCustomers}
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, customerId: null, customerName: '' })}
        title={t('customers.deleteConfirmTitle', 'Delete Customer')}
        description={t(
          'customers.deleteConfirmMessage',
          'Deleting customer "{name}" also removes their invoices and payments. This cannot be undone.',
          { name: confirmDialog.customerName }
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteCustomer}
        variant="destructive"
      />
    </div>
  );
}
