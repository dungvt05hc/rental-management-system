import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { RoomDialog } from './RoomDialog';
import { roomService } from '../../services';
import { enumLabel, formatCurrency, ROOM_STATUS_LABELS, ROOM_TYPE_LABELS } from '../../utils';
import type { Room, RoomSearchRequest } from '../../types';
import { RoomStatus } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks';

/* ═══════════════════════════════════════════════════════════════════════════
 * Danh sách phòng.
 *
 * Người dùng vào đây để biết phòng nào đang ở trạng thái gì và sửa lại thông
 * tin một phòng cụ thể. Nên thứ tự cột là: SỐ PHÒNG · TRẠNG THÁI · tiền · loại
 * · tầng — trạng thái đứng thứ hai chứ không phải thứ ba như bản cũ, vì đó là
 * lý do người ta mở trang này.
 *
 * Bỏ hàng bốn thẻ số liệu ở bản cũ. Ba trong bốn thẻ đó đếm trên MỘT TRANG mười
 * dòng đang hiện chứ không phải trên toàn bộ dữ liệu, nên "Còn trống: 3" là sai
 * ngay khi sang trang 2. Con số duy nhất đúng là tổng số phòng, và nó đã nằm
 * cạnh tiêu đề.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Radix Select không nhận value rỗng, nên "tất cả" cần một giá trị riêng. */
const ALL = 'all';

const PAGE_SIZE = 10;

/*
 * Bảng tra trạng thái. Giá trị của <SelectItem> bắt buộc là chuỗi, còn
 * RoomSearchRequest.status nhận enum số — tra bảng này ra đúng thành viên enum
 * nên không cần ép kiểu ở chỗ nào cả.
 */
const STATUS_OPTIONS = [
  { value: 'vacant', status: RoomStatus.Vacant, key: 'rooms.available', fallback: 'Available' },
  { value: 'rented', status: RoomStatus.Rented, key: 'rooms.occupied', fallback: 'Occupied' },
  {
    value: 'maintenance',
    status: RoomStatus.Maintenance,
    key: 'rooms.statusMaintenance',
    fallback: 'Maintenance',
  },
  { value: 'reserved', status: RoomStatus.Reserved, key: 'rooms.statusReserved', fallback: 'Reserved' },
] as const;

export function RoomsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    roomId: string | null;
    roomNumber: string;
  }>({ open: false, roomId: null, roomNumber: '' });

  // Gõ tới đâu gọi API tới đó là mỗi phím một lượt mạng. Trên 4G yếu, kết quả
  // của lần gõ trước về sau lần gõ sau và ghi đè lên nó.
  const searchQuery = useDebounce(searchInput, 300);

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== ALL;

  const loadRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams: RoomSearchRequest = {
        page,
        pageSize: PAGE_SIZE,
        searchTerm: searchQuery || undefined,
        status: STATUS_OPTIONS.find((option) => option.value === statusFilter)?.status,
      };

      const response = await roomService.getRooms(searchParams);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load rooms');
      }

      setRooms(response.data.items || []);
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
    loadRooms();
  }, [loadRooms]);

  // Đổi từ khoá hay bộ lọc thì về trang 1 — nếu không, lọc còn 2 kết quả trong
  // lúc đang đứng ở trang 5 sẽ ra một trang trống.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const handleCreateRoom = () => {
    setSelectedRoom(null);
    setDialogOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setDialogOpen(true);
  };

  const confirmDeleteRoom = async () => {
    if (!confirmDialog.roomId) return;

    try {
      const response = await roomService.deleteRoom(confirmDialog.roomId);
      if (response.success) {
        showSuccess(t('common.success', 'Success'), t('rooms.deleteSuccess', 'Room deleted successfully'));
        await loadRooms();
      } else {
        showError(t('common.error', 'Error'), response.message || t('rooms.deleteError', 'Failed to delete room'));
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  const columns: DataTableColumn<Room>[] = useMemo(
    () => [
      {
        key: 'roomNumber',
        header: t('rooms.roomNumber', 'Room Number'),
        cell: (room) => (
          <span className="numeric font-medium text-ink">
            {t('rooms.roomLabel', 'Room {number}', { number: room.roomNumber })}
          </span>
        ),
        mobile: 'title',
        width: 'w-36',
      },
      {
        key: 'status',
        header: t('rooms.status', 'Status'),
        // Chip đi kèm hình khối và chữ, không chỉ có màu — đó là thứ duy nhất
        // phân biệt được trạng thái khi in đen trắng hoặc với người mù màu.
        cell: (room) => (
          <Badge status={String(room.statusName ?? room.status)} size="sm">
            {enumLabel(t, ROOM_STATUS_LABELS, room.statusName ?? room.status)}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-32',
      },
      {
        key: 'monthlyRent',
        header: t('rooms.price', 'Monthly Rent'),
        cell: (room) => formatCurrency(room.monthlyRent),
        numeric: true,
        mobile: 'primary',
      },
      {
        key: 'type',
        header: t('rooms.roomType', 'Type'),
        cell: (room) => enumLabel(t, ROOM_TYPE_LABELS, room.typeName),
      },
      {
        key: 'floor',
        header: t('rooms.floor', 'Floor'),
        cell: (room) => room.floor,
        numeric: true,
        width: 'w-20',
      },
      {
        key: 'area',
        header: t('rooms.area', 'Area (m²)'),
        cell: (room) => (room.area ? `${room.area}` : '—'),
        numeric: true,
        width: 'w-24',
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-24',
        mobile: 'hidden',
        cell: (room) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditRoom(room)}
              aria-label={t('rooms.editRoomNamed', 'Edit room {number}', { number: room.roomNumber })}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive-tint"
              onClick={() =>
                setConfirmDialog({ open: true, roomId: String(room.id), roomNumber: room.roomNumber })
              }
              aria-label={t('rooms.deleteRoomNamed', 'Delete room {number}', { number: room.roomNumber })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('rooms.pageTitle', 'Rooms Management')}
        count={
          pagination.totalItems > 0
            ? t('rooms.totalCount', '{count} rooms', { count: pagination.totalItems })
            : undefined
        }
        actions={
          <Button onClick={handleCreateRoom} leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            {t('rooms.addRoom', 'Add Room')}
          </Button>
        }
      />

      <FilterBar>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('rooms.searchPlaceholder', 'Search rooms...')}
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('rooms.searchPlaceholder', 'Search rooms...')}
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
        <Alert variant="error" title={t('rooms.loadError', 'Could not load rooms')}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{t('common.unexpectedError', 'An error occurred')}</span>
            <Button size="sm" variant="outline" onClick={loadRooms}>
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Alert>
      ) : !isLoading && rooms.length === 0 ? (
        // Hai kiểu rỗng khác hẳn nhau: lọc không ra thì mời bỏ lọc, chưa có gì
        // thì mời tạo cái đầu tiên.
        isFiltered ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t('rooms.noMatchTitle', 'No room matches this filter')}
            description={t(
              'rooms.noMatchBody',
              'Try a different search term, or clear the status filter to see every room.'
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
            icon={<Building2 className="h-8 w-8" />}
            title={t('rooms.noRoomsTitle', 'No rooms yet')}
            description={t(
              'rooms.noRoomsBody',
              'Add the rooms you rent out. Contracts, invoices and payments all hang off a room.'
            )}
            action={
              <Button onClick={handleCreateRoom} leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                {t('rooms.addFirstRoom', 'Add Your First Room')}
              </Button>
            }
          />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rooms}
            rowKey={(room) => room.id}
            caption={t('rooms.tableCaption', 'List of rooms')}
            isLoading={isLoading}
            skeletonRows={PAGE_SIZE}
            rowStatus={(room) => String(room.statusName ?? room.status)}
            mobileActions={(room) => (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditRoom(room)}
                  leadingIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                >
                  {t('common.edit', 'Edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive-tint"
                  onClick={() =>
                    setConfirmDialog({ open: true, roomId: String(room.id), roomNumber: room.roomNumber })
                  }
                >
                  {t('common.delete', 'Delete')}
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

      <RoomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        room={selectedRoom}
        onSuccess={loadRooms}
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, roomId: null, roomNumber: '' })}
        title={t('rooms.deleteConfirmTitle', 'Delete Room')}
        description={t(
          'rooms.deleteConfirmMessage',
          'Deleting room {number} also removes its contracts, invoices and payments. This cannot be undone.',
          { number: confirmDialog.roomNumber }
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteRoom}
        variant="destructive"
      />
    </div>
  );
}
