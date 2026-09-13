import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  Alert,
  AlertDialog,
  Badge,
  Button,
  Checkbox,
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
import { itemService } from '../../services';
import type { Item, ItemSearchRequest } from '../../types';
import { formatCurrency } from '../../utils';
import { ItemDialog } from './ItemDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useDebounce } from '../../hooks';

/* ═══════════════════════════════════════════════════════════════════════════
 * Danh mục khoản mục.
 *
 * Đây là BẢNG GIÁ dùng lại: điện, nước, rác, gửi xe… Người ta vào đây để sửa
 * đơn giá trước khi lập hoá đơn tháng. Nên cột đơn giá là cột chính, và mã
 * khoản mục đứng ngay dưới tên — mã mới là thứ hiện ra trong ô chọn ở form
 * hoá đơn.
 *
 * Bản cũ có ba tiêu đề cột viết cứng bằng tiếng Anh ("Code", "Name", "UOM")
 * lẫn giữa các cột đã dịch, và chip trạng thái ghi "Active"/"Inactive" cũng
 * viết cứng. Bật tiếng Việt vẫn thấy nguyên tiếng Anh ở đó.
 *
 * Bản cũ còn bọc cả trang trong `container mx-auto px-4 py-8` trong khi Layout
 * đã có sẵn một khung y hệt — nên trang này thụt vào sâu hơn mọi trang khác.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ALL = 'all';
const PAGE_SIZE = 10;

export function ItemsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemId: string | null;
    itemName: string;
  }>({ open: false, itemId: null, itemName: '' });

  const searchQuery = useDebounce(searchInput, 300);

  // "Chỉ hiện đang dùng" bật sẵn, nên nó CÓ tính là một bộ lọc: tắt nó đi là
  // một cách hợp lệ để tìm lại khoản mục đã ngừng dùng.
  const isFiltered = searchQuery.trim() !== '' || categoryFilter !== ALL || !activeOnly;

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: ItemSearchRequest = {
        searchTerm: searchQuery || undefined,
        category: categoryFilter === ALL ? undefined : categoryFilter,
        isActive: activeOnly ? true : undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy: 'ItemName',
        sortDirection: 'asc',
      };

      const response = await itemService.getItems(params);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load items');
      }

      setItems(response.data.items || []);
      setPagination({
        totalItems: response.data.totalItems || 0,
        totalPages: response.data.totalPages || 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, categoryFilter, activeOnly]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, activeOnly]);

  /* Danh sách nhóm chỉ đổi khi thêm/sửa khoản mục, nên tải một lần lúc mở
     trang chứ không tải lại theo từng lần gõ như bản cũ. */
  const loadCategories = useCallback(async () => {
    const response = await itemService.getCategories();
    if (response.success && response.data) setCategories(response.data);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const confirmDeleteItem = async () => {
    if (!confirmDialog.itemId) return;

    try {
      const response = await itemService.deleteItem(confirmDialog.itemId);
      if (response.success) {
        showSuccess(t('common.success', 'Success'), t('items.deleteSuccess', 'Item deleted successfully'));
        await loadItems();
      } else {
        showError(t('common.error', 'Error'), response.message || t('items.deleteError', 'Failed to delete item'));
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const columns: DataTableColumn<Item>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('items.itemName', 'Item Name'),
        cell: (item) => (
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink">{item.itemName}</span>
            <span className="numeric block truncate text-xs text-ink-muted">{item.itemCode}</span>
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'unitPrice',
        header: t('items.unitPrice', 'Unit Price'),
        cell: (item) => (
          <span className="font-semibold text-ink">{formatCurrency(item.unitPrice)}</span>
        ),
        numeric: true,
        mobile: 'primary',
      },
      {
        key: 'unitOfMeasure',
        header: t('invoices.unitShort', 'Unit'),
        cell: (item) => item.unitOfMeasure,
        width: 'w-24',
      },
      {
        key: 'category',
        header: t('items.category', 'Category'),
        cell: (item) => item.category || <span className="text-ink-muted">—</span>,
      },
      {
        key: 'taxPercent',
        header: t('items.taxPercent', 'Tax %'),
        cell: (item) => `${item.taxPercent}%`,
        numeric: true,
        width: 'w-24',
      },
      {
        key: 'status',
        header: t('rooms.status', 'Status'),
        cell: (item) => (
          <Badge status={item.isActive ? 'active' : 'inactive'} size="sm">
            {item.isActive ? t('items.statusActive', 'Active') : t('items.statusInactive', 'Inactive')}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-32',
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-24',
        mobile: 'hidden',
        cell: (item) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(item)}
              aria-label={t('items.editNamed', 'Edit {name}', { name: item.itemName })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive-tint"
              onClick={() =>
                setConfirmDialog({ open: true, itemId: item.id, itemName: item.itemName })
              }
              aria-label={t('items.deleteNamed', 'Delete {name}', { name: item.itemName })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  const clearFilters = () => {
    setSearchInput('');
    setCategoryFilter(ALL);
    setActiveOnly(true);
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('items.title', 'Items')}
        count={
          pagination.totalItems > 0
            ? t('items.totalCount', '{count} items', { count: pagination.totalItems })
            : undefined
        }
        actions={
          <Button
            onClick={() => {
              setSelectedItem(null);
              setDialogOpen(true);
            }}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            {t('items.createItem', 'Create New Item')}
          </Button>
        }
      />

      <FilterBar>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('items.searchShortPlaceholder', 'Search items...')}
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('items.searchShortPlaceholder', 'Search items...')}
          containerClassName="sm:flex-1"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-52" aria-label={t('items.category', 'Category')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('items.allCategories', 'All categories')}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex min-h-touch shrink-0 items-center gap-2 text-sm text-ink sm:min-h-0">
          <Checkbox
            checked={activeOnly}
            onCheckedChange={setActiveOnly}
            aria-label={t('items.activeOnly', 'Active only')}
          />
          {t('items.activeOnly', 'Active only')}
        </label>
      </FilterBar>

      {error ? (
        <Alert variant="error" title={t('items.loadError', 'Could not load items')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('common.unexpectedError', 'An error occurred')}</span>
            <Button size="sm" variant="outline" onClick={loadItems}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      ) : !isLoading && items.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t('items.noMatchTitle', 'No item matches this filter')}
            description={t(
              'items.noMatchBody',
              'Items you stopped using are hidden by default — turn off "Active only" to see them again.'
            )}
            action={
              <Button variant="outline" onClick={clearFilters}>
                {t('common.clearFilters', 'Clear filters')}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title={t('items.noItemsTitle', 'No items yet')}
            description={t(
              'items.noItemsBody',
              'Set up the things you bill for — electricity, water, parking. Each one becomes a line you can drop onto an invoice.'
            )}
            action={
              <Button
                onClick={() => {
                  setSelectedItem(null);
                  setDialogOpen(true);
                }}
                leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                {t('items.createItem', 'Create New Item')}
              </Button>
            }
          />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(item) => item.id}
            caption={t('items.tableCaption', 'List of billable items')}
            isLoading={isLoading}
            skeletonRows={PAGE_SIZE}
            rowStatus={(item) => (item.isActive ? 'active' : 'inactive')}
            mobileActions={(item) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(item)}
                leadingIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                {t('common.edit', 'Edit')}
              </Button>
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

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        onSuccess={() => {
          setDialogOpen(false);
          loadItems();
          loadCategories();
        }}
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, itemId: null, itemName: '' })}
        title={t('items.deleteConfirmTitle', 'Delete Item')}
        description={t('items.deleteConfirmMessage', 'Delete item "{name}"? This cannot be undone.', {
          name: confirmDialog.itemName,
        })}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteItem}
        variant="destructive"
      />
    </div>
  );
}
