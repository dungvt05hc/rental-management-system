import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers, useUserStatistics, useDeleteUser, useSetUserActivation, useBulkUserOperation } from '../../hooks/useUserManagement';
import type { UserFilterDto, User } from '../../types';
import { UserStatisticsCards } from './UserStatisticsCards';
import { UserTable } from './UserTable';
import { UserFilters } from './UserFilters';
import { EditUserDialog } from './EditUserDialog';
import { UserDetailsDialog } from './UserDetailsDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { PasswordResetDialog } from './PasswordResetDialog';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Loader2 } from 'lucide-react';

/**
 * Main User Management Page Component
 * Provides comprehensive user management functionality including CRUD operations,
 * role management, filtering, pagination, and bulk operations
 */
export function UserManagementPage() {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Filter state
  const [filters, setFilters] = useState<UserFilterDto>({
    page: 1,
    pageSize: 10,
    searchTerm: '',
    sortBy: 'CreatedAt',
    sortOrder: 'desc',
  });

  // Dialog states (remove createDialogOpen since we're navigating to a page)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);

  // Selected users for bulk operations
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Fetch data
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useUsers(filters);
  const { data: statistics, isLoading: isLoadingStats } = useUserStatistics();

  // Mutations
  const deleteUserMutation = useDeleteUser();
  const setUserActivationMutation = useSetUserActivation();
  const bulkOperationMutation = useBulkUserOperation();

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters: Partial<UserFilterDto>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.searchTerm !== prev.searchTerm ? 1 : prev.page, // Reset to page 1 on search
    }));
  };

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  /**
   * Handle user selection for bulk operations
   */
  const handleSelectUser = (userId: string, selected: boolean) => {
    setSelectedUserIds((prev) =>
      selected ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  /**
   * Handle select all users
   */
  const handleSelectAll = (selected: boolean) => {
    if (selected && usersData?.users) {
      setSelectedUserIds(usersData.users.map((user) => user.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  /**
   * Handle user activation/deactivation
   */
  const handleToggleUserActivation = async (user: User) => {
    try {
      await setUserActivationMutation.mutateAsync({
        userId: user.id,
        activationData: {
          isActive: !user.isActive,
          reason: `${user.isActive ? 'Deactivated' : 'Activated'} by admin`,
        },
      });

      toast.showSuccess(
        'Success',
        `User ${user.isActive ? 'deactivated' : 'activated'} successfully`
      );
    } catch (error) {
      toast.showError(
        'Error',
        error instanceof Error ? error.message : 'Failed to update user status'
      );
    }
  };

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = async (operation: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUserIds.length === 0) {
      toast.showError(
        'No users selected',
        'Please select users to perform bulk operation'
      );
      return;
    }

    try {
      const affectedCount = await bulkOperationMutation.mutateAsync({
        userIds: selectedUserIds,
        operation,
      });

      toast.showSuccess(
        'Success',
        `Bulk ${operation} completed. ${affectedCount} users affected.`
      );

      setSelectedUserIds([]);
    } catch (error) {
      toast.showError(
        'Error',
        error instanceof Error ? error.message : 'Failed to perform bulk operation'
      );
    }
  };

  /**
   * Handle user deletion
   */
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId);
      toast.showSuccess('Success', 'User deleted successfully');
      setDeletingUser(null);
    } catch (error) {
      toast.showError(
        'Error',
        error instanceof Error ? error.message : 'Failed to delete user'
      );
    }
  };

  if (usersError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Users</h2>
          <p className="text-gray-600">{usersError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => navigate('/users/new')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Statistics Cards */}
      {isLoadingStats ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : statistics ? (
        <UserStatisticsCards statistics={statistics} />
      ) : null}

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        selectedCount={selectedUserIds.length}
        onBulkActivate={() => handleBulkOperation('activate')}
        onBulkDeactivate={() => handleBulkOperation('deactivate')}
        onBulkDelete={() => handleBulkOperation('delete')}
        isPerformingBulkOperation={bulkOperationMutation.isPending}
      />

      {/* Users Table */}
      {isLoadingUsers ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : usersData ? (
        <UserTable
          users={usersData.users}
          totalCount={usersData.totalCount}
          page={usersData.page}
          pageSize={usersData.pageSize}
          totalPages={usersData.totalPages}
          hasPrevious={usersData.hasPrevious}
          hasNext={usersData.hasNext}
          selectedUserIds={selectedUserIds}
          onSelectUser={handleSelectUser}
          onSelectAll={handleSelectAll}
          onPageChange={handlePageChange}
          onEdit={(user) => setEditingUser(user)}
          onView={(user) => setViewingUser(user)}
          onDelete={(user) => setDeletingUser(user)}
          onToggleActivation={handleToggleUserActivation}
          onResetPassword={(user) => setResettingPasswordUser(user)}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No users found</p>
        </div>
      )}

      {/* Dialogs - Remove CreateUserDialog */}
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
