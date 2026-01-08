import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge, AlertDialog } from '../ui';
import { TenantDialog } from './TenantDialog';
import { tenantService } from '../../services';
import { formatDate } from '../../utils';
import type { Tenant, TenantSearchRequest } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

export function TenantsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    tenantId: string | null;
    tenantName: string;
  }>({
    open: false,
    tenantId: null,
    tenantName: '',
  });

  useEffect(() => {
    loadTenants();
  }, [searchQuery, statusFilter, pagination.page]);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams: TenantSearchRequest = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchQuery || undefined,
      };

      if (statusFilter) {
        (searchParams as any).isActive = statusFilter === 'Active' ? true : statusFilter === 'Inactive' ? false : undefined;
      }

      const response = await tenantService.getTenants(searchParams);

      if (response.success && response.data) {
        const paginatedData = response.data as any;
        setTenants(paginatedData.items || []);
        setPagination({
          page: paginatedData.page || 1,
          pageSize: paginatedData.pageSize || 10,
          totalCount: paginatedData.totalItems || 0,
          totalPages: paginatedData.totalPages || 1,
        });
      } else {
        throw new Error(response.message || 'Failed to load tenants');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = () => {
    setSelectedTenant(null);
    setDialogOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setDialogOpen(true);
  };

  const handleDeleteTenant = (tenantId: string, tenantName: string) => {
    setConfirmDialog({
      open: true,
      tenantId,
      tenantName,
    });
  };

  const confirmDeleteTenant = async () => {
    if (!confirmDialog.tenantId) return;

    try {
      const response = await tenantService.deleteTenant(confirmDialog.tenantId);
      if (response.success) {
        showSuccess(t('common.success', 'Success'), t('tenants.deleteSuccess', 'Tenant deleted successfully'));
        await loadTenants();
      } else {
        showError(t('common.error', 'Error'), response.message || t('tenants.deleteError', 'Failed to delete tenant'));
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  const handleDialogSuccess = () => {
    loadTenants();
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getTenantStatus = (tenant: any) => {
    return tenant.isActive ? t('tenants.active', 'Active') : t('tenants.inactive', 'Inactive');
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('tenants.title', 'Tenants Management')}</h1>
        <Button onClick={handleCreateTenant} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>{t('common.add', 'Add Tenant')}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('common.search', 'Search tenants...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.filter', 'All Status')}</option>
                <option value="Active">{t('tenants.active', 'Active')}</option>
                <option value="Inactive">{t('tenants.inactive', 'Inactive')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenants.totalTenants', 'Total Tenants')}</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.totalCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenants.active', 'Active')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {tenants?.filter(t => (t as any).isActive === true).length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <User className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenants.inactive', 'Inactive')}</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tenants?.filter(t => (t as any).isActive === false).length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <User className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenants.withRooms', 'With Rooms')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {tenants?.filter(t => (t as any).room || t.room).length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tenants.title', 'Tenants')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadTenants} className="mt-4">
                {t('common.refresh', 'Try Again')}
              </Button>
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('tenants.noTenantsFound', 'No tenants found')}</p>
              <Button onClick={handleCreateTenant} className="mt-4">
                {t('tenants.addFirstTenant', 'Add Your First Tenant')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('tenants.name', 'Name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('tenants.contact', 'Contact')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('tenants.room', 'Room')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('rooms.status', 'Status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('tenants.contractPeriod', 'Contract Period')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.edit', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tenants?.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {(tenant as any).fullName || `${tenant.firstName} ${tenant.lastName}`}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {(tenant as any).identificationNumber || tenant.identityNumber || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              {tenant.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              {tenant.phoneNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(tenant as any).room || tenant.room ? (
                            <div className="text-sm font-medium text-gray-900">
                              {t('tenants.roomNumber', 'Room')} {((tenant as any).room?.roomNumber || tenant.room?.roomNumber)}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">{t('tenants.noRoomAssigned', 'No room assigned')}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusBadgeColor((tenant as any).isActive)}>
                            {getTenantStatus(tenant)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(tenant as any).contractStartDate || tenant.checkInDate ? (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                {formatDate((tenant as any).contractStartDate || tenant.checkInDate!)}
                                {((tenant as any).contractEndDate || tenant.checkOutDate) && (
                                  <span className="mx-1">→</span>
                                )}
                                {((tenant as any).contractEndDate || tenant.checkOutDate) && 
                                  formatDate((tenant as any).contractEndDate || tenant.checkOutDate!)}
                              </div>
                            ) : (
                              <span className="text-gray-500">{t('tenants.notSet', 'Not set')}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTenant(tenant)}
                              className="h-8 w-8 p-0"
                              title={t('common.edit', 'Edit Tenant')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTenant(String(tenant.id), (tenant as any).fullName || `${tenant.firstName} ${tenant.lastName}`)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title={t('common.delete', 'Delete Tenant')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                      const startPage = Math.max(1, pagination.page - 2);
                      const pageNum = startPage + i;
                      if (pageNum > pagination.totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.page === pageNum ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Dialog */}
      <TenantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenant={selectedTenant}
        onSuccess={handleDialogSuccess}
      />

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, tenantId: null, tenantName: '' })
        }
        title={t('tenants.deleteConfirmTitle', 'Delete Tenant')}
        description={t(
          'tenants.deleteConfirmMessage',
          `Are you sure you want to delete tenant "${confirmDialog.tenantName}"? This action cannot be undone and will remove all associated data including invoices and payments.`
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteTenant}
        variant="destructive"
      />
    </div>
  );
}
