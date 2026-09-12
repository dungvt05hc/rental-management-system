import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Badge } from '../ui/Badge';
import type { UserFilterDto } from '../../types';
import { Search, X, UserCheck, UserX, Trash2, Loader2 } from 'lucide-react';
import { useRoles } from '../../hooks/useUserManagement';

interface UserFiltersProps {
  filters: UserFilterDto;
  onFilterChange: (filters: Partial<UserFilterDto>) => void;
  selectedCount: number;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkDelete: () => void;
  isPerformingBulkOperation: boolean;
}

/**
 * User Filters Component
 * Provides filtering, search, and bulk operation controls
 */
import { useTranslation } from '../../hooks/useTranslation';

export function UserFilters({
  filters,
  onFilterChange,
  selectedCount,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  isPerformingBulkOperation,
}: UserFiltersProps) {
  const { t } = useTranslation();
  const { data: roles } = useRoles();

  const hasActiveFilters =
    filters.searchTerm || filters.role || filters.isActive !== undefined;

  const clearFilters = () => {
    onFilterChange({
      searchTerm: '',
      role: undefined,
      isActive: undefined,
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('users.searchPlaceholder', 'Search by name or email...')}
                value={filters.searchTerm || ''}
                onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <Select
              value={filters.role || 'all'}
              onValueChange={(value) =>
                onFilterChange({ role: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('users.filterByRole', 'Filter by role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('users.allRoles', 'All roles')}</SelectItem>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name} ({role.userCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={
                filters.isActive === undefined
                  ? 'all'
                  : filters.isActive
                  ? 'active'
                  : 'inactive'
              }
              onValueChange={(value) =>
                onFilterChange({
                  isActive:
                    value === 'all' ? undefined : value === 'active' ? true : false,
                })
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('users.filterByStatus', 'Filter by status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.filter', 'All Status')}</SelectItem>
                <SelectItem value="active">{t('customers.active', 'Active')}</SelectItem>
                <SelectItem value="inactive">{t('customers.inactive', 'Inactive')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Bulk Operations Row */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedCount} selected</Badge>
                <span className="text-sm text-muted-foreground">
                  {t('users.bulkOperations', 'Bulk actions')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkActivate}
                  disabled={isPerformingBulkOperation}
                >
                  {isPerformingBulkOperation ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  {t('users.activate', 'Activate')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkDeactivate}
                  disabled={isPerformingBulkOperation}
                >
                  {isPerformingBulkOperation ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserX className="h-4 w-4 mr-2" />
                  )}
                  {t('users.deactivate', 'Deactivate')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
                  disabled={isPerformingBulkOperation}
                >
                  {isPerformingBulkOperation ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {t('common.delete', 'Delete')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
