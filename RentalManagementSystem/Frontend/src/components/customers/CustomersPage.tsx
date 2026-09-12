import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge, AlertDialog } from '../ui';
import { CustomerDialog } from './CustomerDialog';
import { customerService } from '../../services';
import { formatDate } from '../../utils';
import type { Customer, CustomerSearchRequest } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

export function CustomersPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    customerId: string | null;
    customerName: string;
  }>({
    open: false,
    customerId: null,
    customerName: '',
  });

  useEffect(() => {
    loadCustomers();
  }, [searchQuery, statusFilter, pagination.page]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams: CustomerSearchRequest = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchQuery || undefined,
      };

      if (statusFilter) {
        searchParams.isActive = statusFilter === 'Active' ? true : statusFilter === 'Inactive' ? false : undefined;
      }

      const response = await customerService.getCustomers(searchParams);

      if (response.success && response.data) {
        const paginatedData = response.data;
        setCustomers(paginatedData.items || []);
        setPagination({
          page: paginatedData.page || 1,
          pageSize: paginatedData.pageSize || 10,
          totalCount: paginatedData.totalItems || 0,
          totalPages: paginatedData.totalPages || 1,
        });
      } else {
        throw new Error(response.message || 'Failed to load customers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    setConfirmDialog({
      open: true,
      customerId,
      customerName,
    });
  };

  const confirmDeleteCustomer = async () => {
    if (!confirmDialog.customerId) return;

    try {
      const response = await customerService.deleteCustomer(confirmDialog.customerId);
      if (response.success) {
        showSuccess(t('common.success', 'Success'), t('customers.deleteSuccess', 'Customer deleted successfully'));
        await loadCustomers();
      } else {
        showError(t('common.error', 'Error'), response.message || t('customers.deleteError', 'Failed to delete customer'));
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  const handleDialogSuccess = () => {
    loadCustomers();
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getCustomerStatus = (customer: Customer) => {
    return customer.isActive ? t('customers.active', 'Active') : t('customers.inactive', 'Inactive');
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('customers.pageTitle', 'Customers Management')}</h1>
        <Button onClick={handleCreateCustomer} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>{t('customers.addCustomer', 'Add Customer')}</span>
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
                  placeholder={t('customers.searchPlaceholder', 'Search customers...')}
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
                <option value="Active">{t('customers.active', 'Active')}</option>
                <option value="Inactive">{t('customers.inactive', 'Inactive')}</option>
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
                <p className="text-sm font-medium text-gray-600">{t('customers.totalCustomers', 'Total Customers')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('customers.active', 'Active')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {customers?.filter(t => t.isActive === true).length || 0}
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
                <p className="text-sm font-medium text-gray-600">{t('customers.inactive', 'Inactive')}</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {customers?.filter(t => t.isActive === false).length || 0}
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
                <p className="text-sm font-medium text-gray-600">{t('customers.withRooms', 'With Rooms')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {customers?.filter(customer => customer.room).length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('customers.title', 'Customers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadCustomers} className="mt-4">
                {t('common.tryAgain', 'Try Again')}
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('customers.noCustomersFound', 'No customers found')}</p>
              <Button onClick={handleCreateCustomer} className="mt-4">
                {t('customers.addFirstCustomer', 'Add Your First Customer')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('customers.name', 'Name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('customers.contact', 'Contact')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('customers.room', 'Room')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('rooms.status', 'Status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('customers.contractPeriod', 'Contract Period')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers?.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {customer.fullName || `${customer.firstName} ${customer.lastName}`}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {customer.identificationNumber || customer.identityNumber || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              {customer.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              {customer.phoneNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.room ? (
                            <div className="text-sm font-medium text-gray-900">
                              {t('rooms.roomLabel', 'Room {number}', { number: customer.room.roomNumber })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">{t('customers.noRoomAssigned', 'No room assigned')}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusBadgeColor(customer.isActive)}>
                            {getCustomerStatus(customer)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {customer.contractStartDate || customer.checkInDate ? (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                {formatDate(customer.contractStartDate || customer.checkInDate!)}
                                {(customer.contractEndDate || customer.checkOutDate) && (
                                  <span className="mx-1">→</span>
                                )}
                                {(customer.contractEndDate || customer.checkOutDate) && 
                                  formatDate(customer.contractEndDate || customer.checkOutDate!)}
                              </div>
                            ) : (
                              <span className="text-gray-500">{t('customers.notSet', 'Not set')}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/customers/${customer.id}/contracts`)}
                              className="h-8 w-8 p-0"
                              title={t('contracts.title', 'Rental Contracts')}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                              className="h-8 w-8 p-0"
                              title={t('customers.editCustomer', 'Edit Customer')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCustomer(String(customer.id), customer.fullName || `${customer.firstName} ${customer.lastName}`)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title={t('customers.deleteCustomer', 'Delete Customer')}
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
                      {t('common.previous', 'Previous')}
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
                      {t('common.next', 'Next')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Dialog */}
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSuccess={handleDialogSuccess}
      />

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, customerId: null, customerName: '' })
        }
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
