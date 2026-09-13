import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Key, MoreHorizontal, Pencil, Plus, Power, Search, Trash2, UserCog } from 'lucide-react';
import {
  Alert,
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
import {
  useBulkUserOperation,
  useDeleteUser,
  useRoles,
  useSetUserActivation,
  useUsers,
} from '../../hooks/useUserManagement';
import type { User, UserFilterDto } from '../../types';
import { EditUserDialog } from './EditUserDialog';
import { UserDetailsDialog } from './UserDetailsDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { PasswordResetDialog } from './PasswordResetDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useDebounce } from '../../hooks';
import { formatDate } from '../../utils';

/* ═══════════════════════════════════════════════════════════════════════════
 * Quản lý người dùng.
 *
 * Đây là trang của quản trị viên, mở ra để làm một việc cụ thể với một người
 * cụ thể: khoá tài khoản, đổi quyền, đặt lại mật khẩu. Nên nó là một danh sách
 * tìm kiếm được, không phải một bảng điều khiển.
 *
 * ĐÃ BỎ hàng bốn thẻ thống kê (tổng / đang hoạt động / đã khoá / mới 30 ngày).
 * Ba trong bốn con số đó suy ra được từ chính bộ lọc ngay bên dưới — bấm lọc
 * "Đã khoá" là thấy đúng con số đó kèm danh sách, hữu ích hơn hẳn một ô số
 * đứng một mình.
 *
 * Chọn nhiều dòng và thao tác hàng loạt nay dùng thẳng cơ chế có sẵn của
 * DataTable: thanh hành động tự dính đáy khi có dòng được chọn.
 *
 * BA LỖI ĐÃ SỬA:
 *   1. Mọi thông báo toast viết cứng tiếng Anh ("Success", "User deleted
 *      successfully", "No users selected"…) — bật tiếng Việt vẫn ra tiếng Anh.
 *   2. Ngày tạo định dạng bằng date-fns 'MMM d, yyyy' → "Sep 13, 2026". Cả app
 *      còn lại dùng dd/MM/yyyy.
 *   3. Trang bọc trong `container mx-auto py-6` trong khi Layout đã có khung.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ALL = 'all';
const PAGE_SIZE = 10;

/** roles có thể là mảng hoặc IList — luôn ép về mảng trước khi duyệt. */
function rolesOf(user: User): string[] {
  return Array.isArray(user.roles) ? user.roles : [];
}

export function UserManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);

  const searchTerm = useDebounce(searchInput, 300);
  const isFiltered = searchTerm.trim() !== '' || roleFilter !== ALL || statusFilter !== ALL;

  const filters: UserFilterDto = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      searchTerm: searchTerm || undefined,
      role: roleFilter === ALL ? undefined : roleFilter,
      isActive: statusFilter === ALL ? undefined : statusFilter === 'active',
      sortBy: 'CreatedAt',
      sortOrder: 'desc',
    }),
    [page, searchTerm, roleFilter, statusFilter]
  );

  const { data: usersData, isLoading, error } = useUsers(filters);
  const { data: roles } = useRoles();

  const deleteUserMutation = useDeleteUser();
  const setUserActivationMutation = useSetUserActivation();
  const bulkOperationMutation = useBulkUserOperation();

  const users = usersData?.users ?? [];

  const handleToggleActivation = async (user: User) => {
    try {
      await setUserActivationMutation.mutateAsync({
        userId: user.id,
        activationData: {
          isActive: !user.isActive,
          reason: user.isActive
            ? t('users.deactivatedByAdmin', 'Deactivated by an administrator')
            : t('users.activatedByAdmin', 'Activated by an administrator'),
        },
      });
      toast.showSuccess(
        t('common.success', 'Success'),
        user.isActive
          ? t('users.deactivateSuccess', 'Account switched off')
          : t('users.activateSuccess', 'Account switched on')
      );
    } catch (err) {
      toast.showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('users.activationError', 'Could not change the account status')
      );
    }
  };

  const handleBulkOperation = async (operation: 'activate' | 'deactivate' | 'delete') => {
    const userIds = [...selectedKeys].map(String);
    if (userIds.length === 0) return;

    try {
      const affected = await bulkOperationMutation.mutateAsync({ userIds, operation });
      toast.showSuccess(
        t('common.success', 'Success'),
        t('users.bulkDone', '{count} accounts updated', { count: affected })
      );
      setSelectedKeys(new Set());
    } catch (err) {
      toast.showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('users.bulkError', 'The bulk action did not complete')
      );
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId);
      toast.showSuccess(t('common.success', 'Success'), t('users.deleteSuccess', 'Account deleted'));
      setDeletingUser(null);
    } catch (err) {
      toast.showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('users.deleteError', 'Could not delete the account')
      );
    }
  };

  const columns: DataTableColumn<User>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('users.user', 'User'),
        cell: (user) => (
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink">{user.fullName}</span>
            <span className="block truncate text-xs text-ink-muted">{user.email}</span>
          </div>
        ),
        mobile: 'title',
      },
      {
        key: 'status',
        header: t('rooms.status', 'Status'),
        cell: (user) => (
          <Badge status={user.isActive ? 'active' : 'inactive'} size="sm">
            {user.isActive
              ? t('common.statusActive', 'Active')
              : t('common.statusInactive', 'Inactive')}
          </Badge>
        ),
        mobile: 'status',
        width: 'w-32',
      },
      {
        key: 'roles',
        header: t('users.roleAssignment', 'Roles'),
        cell: (user) => (
          <div className="flex flex-wrap gap-1">
            {rolesOf(user).map((role) => (
              <Badge key={role} variant="secondary" size="sm">
                {role}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('auth.phoneNumber', 'Phone number'),
        cell: (user) =>
          user.phoneNumber ? (
            <span className="numeric">{user.phoneNumber}</span>
          ) : (
            <span className="text-ink-muted">—</span>
          ),
      },
      {
        key: 'createdAt',
        header: t('users.created', 'Created'),
        cell: (user) => formatDate(user.createdAt),
        numeric: true,
        width: 'w-32',
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('common.actions', 'Actions')}</span>,
        align: 'right',
        width: 'w-14',
        mobile: 'hidden',
        cell: (user) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('users.actionsFor', 'Actions for {name}', { name: user.fullName ?? user.email })}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setViewingUser(user)}>
                  <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('invoices.viewDetails', 'View Details')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEditingUser(user)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('users.editUser', 'Edit User')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleToggleActivation(user)}>
                  <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                  {user.isActive
                    ? t('users.deactivate', 'Deactivate')
                    : t('users.activate', 'Activate')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setResettingPasswordUser(user)}>
                  <Key className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('auth.resetPassword', 'Reset password')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onSelect={() => setDeletingUser(user)}>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('users.deleteUser', 'Delete User')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // handleToggleActivation đóng gói mutation, không đổi giữa các lần render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const clearFilters = () => {
    setSearchInput('');
    setRoleFilter(ALL);
    setStatusFilter(ALL);
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t('users.title', 'User Management')}
        description={t('users.subtitle', 'Manage the people who use the system and what they may do')}
        count={
          usersData?.totalCount
            ? t('users.totalCount', '{count} accounts', { count: usersData.totalCount })
            : undefined
        }
        actions={
          <Button
            onClick={() => navigate('/users/new')}
            leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            {t('users.createUser', 'Create User')}
          </Button>
        }
      />

      <FilterBar>
        <Input
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder={t('users.searchPlaceholder', 'Search by name or email...')}
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label={t('users.searchPlaceholder', 'Search by name or email...')}
          containerClassName="sm:flex-1"
        />
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44" aria-label={t('users.filterByRole', 'Filter by role')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('users.allRoles', 'All roles')}</SelectItem>
            {roles?.map((role) => (
              <SelectItem key={role.id} value={role.name}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44" aria-label={t('rooms.status', 'Status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('common.filter', 'All Status')}</SelectItem>
            <SelectItem value="active">{t('common.statusActive', 'Active')}</SelectItem>
            <SelectItem value="inactive">{t('common.statusInactive', 'Inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {error ? (
        <Alert variant="error" title={t('users.loadError', 'Could not load the user list')}>
          {t('common.unexpectedError', 'An error occurred')}
        </Alert>
      ) : !isLoading && users.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title={t('users.noMatchTitle', 'No account matches this filter')}
            description={t('users.noMatchBody', 'Search runs on name and email. Try a shorter term.')}
            action={
              <Button variant="outline" onClick={clearFilters}>
                {t('common.clearFilters', 'Clear filters')}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<UserCog className="h-8 w-8" />}
            title={t('users.noUsersFound', 'No users found')}
            description={t(
              'users.noUsersBody',
              'Create an account for each person who needs to sign in, or send them an invitation code.'
            )}
            action={
              <Button
                onClick={() => navigate('/users/new')}
                leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                {t('users.createUser', 'Create User')}
              </Button>
            }
          />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={users}
            rowKey={(user) => user.id}
            caption={t('users.tableCaption', 'List of user accounts')}
            isLoading={isLoading}
            skeletonRows={PAGE_SIZE}
            rowStatus={(user) => (user.isActive ? 'active' : 'inactive')}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            selectionLabel={(user) =>
              t('users.selectNamed', 'Select {name}', { name: user.fullName ?? user.email })
            }
            bulkActions={
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkOperation('activate')}
                  disabled={bulkOperationMutation.isPending}
                >
                  {t('users.activate', 'Activate')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkOperation('deactivate')}
                  disabled={bulkOperationMutation.isPending}
                >
                  {t('users.deactivate', 'Deactivate')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkOperation('delete')}
                  disabled={bulkOperationMutation.isPending}
                >
                  {t('common.delete', 'Delete')}
                </Button>
              </>
            }
            mobileActions={(user) => (
              <>
                <Button size="sm" variant="outline" onClick={() => setViewingUser(user)}>
                  {t('invoices.viewDetails', 'View Details')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                  {t('common.edit', 'Edit')}
                </Button>
              </>
            )}
          />

          <Pagination
            page={usersData?.page ?? page}
            pageSize={usersData?.pageSize ?? PAGE_SIZE}
            totalItems={usersData?.totalCount ?? 0}
            totalPages={usersData?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}

      {viewingUser && (
        <UserDetailsDialog
          user={viewingUser}
          open={!!viewingUser}
          onOpenChange={(open) => !open && setViewingUser(null)}
          onEdit={() => {
            setEditingUser(viewingUser);
            setViewingUser(null);
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          onConfirm={() => handleDeleteUser(deletingUser.id)}
          isDeleting={deleteUserMutation.isPending}
        />
      )}

      {resettingPasswordUser && (
        <PasswordResetDialog
          user={resettingPasswordUser}
          open={!!resettingPasswordUser}
          onOpenChange={(open) => !open && setResettingPasswordUser(null)}
        />
      )}
    </div>
  );
}
