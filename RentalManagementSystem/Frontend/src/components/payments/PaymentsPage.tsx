import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Badge, AlertDialog } from '../ui';
import { paymentService } from '../../services';
import { formatCurrency, formatDate } from '../../utils';
import type { Payment } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

export function PaymentsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    paymentId: string | null;
    paymentReference: string;
  }>({
    open: false,
    paymentId: null,
    paymentReference: '',
  });

  const pageSize = 10;

  const loadPayments = async () => {
    try {
      const response = await paymentService.getPayments({
        search: searchTerm || undefined,
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.data) {
        setPayments(response.data.data || []);
      }
    } catch (error) {
      showError(
        t('common.error', 'Error'),
        error instanceof Error ? error.message : t('common.unknownError', 'An unknown error occurred')
      );
    }
  };

  useEffect(() => {
    loadPayments();
  }, [searchTerm, currentPage, statusFilter]);

  const handleAddPayment = () => {
    navigate('/payments/new');
  };

  const handleEditPayment = (payment: Payment) => {
    navigate(`/payments/${payment.id}/edit`);
  };

  const handleDeletePayment = (paymentId: string, paymentReference: string) => {
    setConfirmDialog({
      open: true,
      paymentId,
      paymentReference,
    });
  };

  const confirmDeletePayment = async () => {
    if (!confirmDialog.paymentId) return;

    try {
      const response = await paymentService.deletePayment(confirmDialog.paymentId);
      if (response.success) {
        showSuccess(t('common.success', 'Success'), t('payments.deleteSuccess', 'Payment deleted successfully'));
        await loadPayments();
      } else {
        showError(t('common.error', 'Error'), response.message || t('payments.deleteError', 'Failed to delete payment'));
      }
    } catch (err) {
      showError(
        t('common.error', 'Error'),
        err instanceof Error ? err.message : t('common.unknownError', 'An unknown error occurred')
      );
    } finally {
      setConfirmDialog({ open: false, paymentId: null, paymentReference: '' });
    }
  };

  const filteredPayments = payments.filter((payment: Payment) => {
    const matchesSearch =
      payment.invoice?.tenant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.tenant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.tenant?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || payment.paymentMethod.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
                            <DollarSign className="h-5 w-5 text-blue-600" />
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
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="text-gray-900 font-medium">{payment.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-gray-900 font-medium">{formatDate(payment.paymentDate)}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.paymentDate).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {t('payments.completed', 'Completed')}
                        </Badge>
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
                            onClick={() => handleDeletePayment(payment.id, payment.reference || '')}
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
              <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, paymentId: null, paymentReference: '' })
        }
        title={t('payments.deleteConfirmTitle', 'Delete Payment')}
        description={t(
          'payments.deleteConfirmMessage',
          `Are you sure you want to delete payment ${confirmDialog.paymentReference}? This action cannot be undone and will affect the associated invoice balance.`
        )}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeletePayment}
        variant="destructive"
      />
    </div>
  );
}