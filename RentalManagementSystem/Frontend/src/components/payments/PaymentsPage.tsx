import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../../services';
import { formatCurrency, formatDate } from '../../utils';
import type { Payment } from '../../types';
import { PaymentFormModal } from './PaymentFormModal';
import { useTranslation } from '../../hooks/useTranslation';

export function PaymentsPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const pageSize = 10;
  const queryClient = useQueryClient();

  const { data: paymentsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['payments', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: () => paymentService.getPayments({
      search: searchTerm || undefined,
      page: currentPage,
      pageSize: pageSize
    }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => paymentService.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      alert(t('common.success', 'Payment deleted successfully'));
    },
    onError: (error: any) => {
      alert(t('common.error', 'Failed to delete payment: ') + error.message);
    }
  });

  const payments = paymentsResponse?.data?.data || [];

  // Filter payments based on search and payment method
  const filteredPayments = payments.filter((payment: Payment) => {
    const matchesSearch = 
      payment.invoice?.tenant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.tenant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.tenant?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      payment.paymentMethod.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    totalPayments: payments.length,
    totalAmount: payments.reduce((sum: number, payment: Payment) => sum + payment.amount, 0),
    cashPayments: payments.filter((p: Payment) => p.paymentMethod === 'Cash').length,
    cashAmount: payments.filter((p: Payment) => p.paymentMethod === 'Cash').reduce((sum: number, p: Payment) => sum + p.amount, 0),
    bankPayments: payments.filter((p: Payment) => p.paymentMethod === 'BankTransfer').length,
    bankAmount: payments.filter((p: Payment) => p.paymentMethod === 'BankTransfer').reduce((sum: number, p: Payment) => sum + p.amount, 0),
    checkPayments: payments.filter((p: Payment) => p.paymentMethod === 'Check').length,
    avgPaymentAmount: payments.length > 0 ? payments.reduce((sum: number, p: Payment) => sum + p.amount, 0) / payments.length : 0,
  };

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'banktransfer':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'cash':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'check':
        return <Receipt className="h-4 w-4 text-purple-500" />;
      case 'creditcard':
        return <CreditCard className="h-4 w-4 text-orange-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleAddPayment = () => {
    setSelectedPayment(null);
    setIsFormOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsFormOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm(t('common.confirm', 'Are you sure you want to delete this payment? This action cannot be undone.'))) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedPayment(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t('payments.title', 'Payments Management')}</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">{t('payments.errorLoading', 'Error Loading Payments')}</h3>
          <p className="text-gray-500 mb-4">{t('payments.errorLoadingDesc', 'There was an error loading payment data.')}</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('common.refresh', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('payments.title', 'Payments Management')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('payments.manageTrack', 'Manage and track all payment transactions')}</p>
        </div>
        <button 
          onClick={handleAddPayment}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">{t('payments.recordPayment', 'Record Payment')}</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">{t('payments.totalPayments', 'Total Payments')}</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalPayments}</p>
                <p className="text-sm text-blue-700 mt-2 font-medium">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-200 shadow-inner">
                <CreditCard className="h-8 w-8 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900 mb-1">{t('payments.cashPayments', 'Cash Payments')}</p>
                <p className="text-3xl font-bold text-green-900">{stats.cashPayments}</p>
                <p className="text-sm text-green-700 mt-2 font-medium">{formatCurrency(stats.cashAmount)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-green-200 shadow-inner">
                <DollarSign className="h-8 w-8 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-900 mb-1">{t('payments.bankTransfers', 'Bank Transfers')}</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.bankPayments}</p>
                <p className="text-sm text-yellow-700 mt-2 font-medium">{formatCurrency(stats.bankAmount)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-yellow-200 shadow-inner">
                <CreditCard className="h-8 w-8 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all transform hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">{t('payments.averageAmount', 'Average Amount')}</p>
                <p className="text-3xl font-bold text-purple-900">{formatCurrency(stats.avgPaymentAmount)}</p>
                <p className="text-sm text-purple-700 mt-2 font-medium">{stats.checkPayments} {t('payments.checks', 'checks')}</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-200 shadow-inner">
                <TrendingUp className="h-8 w-8 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder={t('payments.searchPlaceholder', 'Search by tenant name, email, method, or reference...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[180px]"
                >
                  <option value="all">{t('payments.allMethods', 'All Methods')}</option>
                  <option value="cash">{t('payments.cash', 'Cash')}</option>
                  <option value="banktransfer">{t('payments.bankTransfer', 'Bank Transfer')}</option>
                  <option value="check">{t('payments.check', 'Check')}</option>
                  <option value="creditcard">{t('payments.creditCard', 'Credit Card')}</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-xl font-bold flex items-center justify-between">
            <span>{t('payments.paymentTransactions', 'Payment Transactions')}</span>
            <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              {filteredPayments.length} {t('invoices.total', 'Total')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('tenants.name', 'Tenant')}</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('invoices.invoice', 'Invoice')}</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('invoices.amount', 'Amount')}</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('payments.method', 'Method')}</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('payments.date', 'Date')}</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('rooms.status', 'Status')}</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('payments.reference', 'Reference')}</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 uppercase tracking-wider text-xs">{t('common.edit', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedPayments.map((payment: Payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-inner">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {payment.invoice?.tenant?.firstName} {payment.invoice?.tenant?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{payment.invoice?.tenant?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-semibold text-gray-900">#{payment.invoice?.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">
                            Due: {payment.invoice?.dueDate ? formatDate(payment.invoice.dueDate) : 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg w-fit">
                          {getMethodIcon(payment.paymentMethod)}
                          <span className="text-gray-900 font-medium">{payment.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-gray-900 font-medium">{formatDate(payment.paymentDate)}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.paymentDate).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                            {t('payments.completed', 'Completed')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-600 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {payment.reference || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditPayment(payment)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('common.edit', 'Edit Payment')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(String(payment.id))}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('common.delete', 'Delete Payment')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('payments.noPaymentsFound', 'No payments found')}</h3>
              <p className="text-gray-500 mb-6">{t('payments.noPaymentsMatch', 'No payments match your current search criteria.')}</p>
              <button
                onClick={handleAddPayment}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all inline-flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>{t('payments.recordFirstPayment', 'Record First Payment')}</span>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-6 rounded-lg shadow-lg border-0">
          <p className="text-sm text-gray-700 font-medium">
            {t('payments.showing', 'Showing')} {((currentPage - 1) * pageSize) + 1} {t('payments.to', 'to')}{' '}
            {Math.min(currentPage * pageSize, filteredPayments.length)} {t('payments.of', 'of')}{' '}
            {filteredPayments.length} {t('payments.payments', 'payments')}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === i + 1
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {isFormOpen && (
        <PaymentFormModal
          payment={selectedPayment}
          onClose={handleFormClose}
          onSuccess={() => {
            refetch();
            handleFormClose();
          }}
        />
      )}
    </div>
  );
}